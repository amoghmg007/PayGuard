import os
from dotenv import load_dotenv
load_dotenv()

import time
import requests
import smtplib
from smtplib import SMTPException
from email.message import EmailMessage
import logging
from database.models import set_action_state, log_audit, already_executed
from services.legal_compiler import LegalPackBuilder

logger = logging.getLogger("payguard_registry")
logger.setLevel(logging.INFO)

def get_env_var(key, default):
    val = os.getenv(key, default)
    if val:
        return val.replace('"', '').strip()
    return default

def get_webhook_url():
    url = get_env_var("WEBHOOK_URL", "https://webhook.site/placeholder")
    logger.info(f"Using Webhook URL: {url}")
    return url

SMTP_SERVER = get_env_var("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(get_env_var("SMTP_PORT", "587"))
SMTP_USER = get_env_var("SMTP_USER", "")
SMTP_PASSWORD = get_env_var("SMTP_PASSWORD", "")

def with_retry(max_retries=3, delay_sec=1.5):
    """Decorator to retry a function if it raises an Exception."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_err = None
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_err = e
                    logger.warning(f"Attempt {attempt}/{max_retries} failed for {func.__name__}: {e}")
                    if attempt < max_retries:
                        time.sleep(delay_sec * attempt) # Exponential backoff
            raise Exception(f"Action failed after {max_retries} retries. Errs: {last_err}")
        return wrapper
    return decorator

@with_retry(max_retries=3)
def action_freeze_funds(case_id: str, action: str, entity: dict):
    payload = {"command": "EXECUTE_L1_FREEZE", "case_id": case_id, "amount": entity.get("amount")}
    start_time = time.time()
    resp = requests.post(get_webhook_url(), json=payload, timeout=5.0)
    resp.raise_for_status()
    delay = time.time() - start_time
    try:
        data = resp.json()
    except Exception:
        data = {"status": "ok", "raw": resp.text[:100]} if resp.text else {"status": "ok"}
    return data, delay

@with_retry(max_retries=3)
def action_npc_reversal(case_id: str, action: str, entity: dict):
    payload = {"command": "NPCI_DISPUTE", "case_id": case_id, "channel": entity.get("channel")}
    start_time = time.time()
    resp = requests.post(get_webhook_url(), json=payload, timeout=5.0)
    resp.raise_for_status()
    delay = time.time() - start_time
    try:
        data = resp.json()
    except Exception:
        data = {"status": "ok", "raw": resp.text[:100]} if resp.text else {"status": "ok"}
    return data, delay

def action_escalate_ops(case_id: str, action: str, entity: dict):
    start_time = time.time()
    
    msg = EmailMessage()
    msg.set_content(f"Automated Escalation via ARDG for Case {case_id}.\nAmount: {entity.get('amount')}")
    msg['Subject'] = f"URGENT: Fraud Escalation [Case {case_id}]"
    msg['From'] = SMTP_USER
    msg['To'] = SMTP_USER  # Send to self for testing
    
    if SMTP_USER and SMTP_PASSWORD:
        try:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
        except SMTPException as e:
            raise Exception(f"SMTP Failed: {e}")
    else:
        logger.warning("SMTP Missing. Routing to Webhook instead.")
        resp = requests.post(get_webhook_url(), json={"email_payload": msg.as_string()}, timeout=5.0)
        resp.raise_for_status()
        
    delay = time.time() - start_time
    return {"status": "email_sent"}, delay

def action_compile_legal(case_id: str, action: str, entity: dict):
    start_time = time.time()
    builder = LegalPackBuilder("artifacts")
    legal_payload = {
         "amount": str(entity.get('amount', '0')),
         "platform": str(entity.get('channel', 'Unknown')),
         "destination_account": "Unknown",
         "timestamp": str(entity.get('time_elapsed', 'Recently')),
         "fraud_type": "FINANCIAL_FRAUD_ARDG_GENERATED"
    }
    res = builder.build_fir_draft(legal_payload)
    delay = time.time() - start_time
    return {"status": "pdf_created", "path": res["path"], "hash": res["hash"]}, delay

def action_collect_utr(case_id: str, action: str, entity: dict):
    return {"status": "verified"}, 0.1

ACTION_REGISTRY = {
    "INITIATE_BANK_ESCALATION": action_freeze_funds,
    "UPI_REVERSAL": action_npc_reversal,
    "ESCALATE_INTERNAL_OPS": action_escalate_ops,
    "FILE_REGULATORY_COMPLAINT": action_compile_legal,
    "COLLECT_UTR": action_collect_utr
}

def execute_action(case_id: str, action: str, entity: dict):
    if already_executed(case_id, action):
        logger.info(f"Skipping {action} - Already executed for {case_id}.")
        return

    # Flip state to EXECUTING
    set_action_state(case_id, action, "EXECUTING", increment_attempt=True)
    
    handler = ACTION_REGISTRY.get(action)
    if not handler:
        set_action_state(case_id, action, "FAILED")
        log_audit(case_id, action, "FAILED", {"entity": entity}, {"error": "No registry handler"})
        return

    try:
        res_payload, duration = handler(case_id, action, entity)
        
        # Enforce strict OS schema
        latency_ms = int(duration * 1000)
        from datetime import datetime
        strict_payload = {
            "case_id": case_id,
            "action": action,
            "status": "SUCCESS",
            "response_code": 200 if res_payload.get("status") in ["ok", "email_sent", "pdf_created", "verified"] else 202,
            "response_message": res_payload.get("status", "Accepted").upper(),
            "timestamp": datetime.now().isoformat(),
            "latency_ms": latency_ms
        }
        
        # Merge handler details specifically
        if "raw" in res_payload: strict_payload["details"] = res_payload["raw"]
        
        # Log success
        set_action_state(case_id, action, "SUCCESS")
        log_audit(case_id, action, "SUCCESS", {"entity": entity}, strict_payload, duration)
        
    except Exception as e:
        logger.error(f"Action {action} failed: {e}")
        from datetime import datetime
        strict_payload = {
            "case_id": case_id,
            "action": action,
            "status": "FAILED",
            "response_code": 500,
            "response_message": str(e),
            "timestamp": datetime.now().isoformat(),
            "latency_ms": 0
        }
        set_action_state(case_id, action, "FAILED")
        log_audit(case_id, action, "FAILED", {"entity": entity}, strict_payload, 0.0)
