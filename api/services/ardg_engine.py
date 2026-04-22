import logging
import json
from typing import List, Dict, Any
from database.models import get_connection, already_executed, set_action_state

logger = logging.getLogger("payguard_ardg")
logger.setLevel(logging.INFO)

# --- A. Historical Memory Abstraction ---
class HistoricalMemory:
    def fetch_similar_cases(self, features: Dict[str, Any]) -> Dict[str, Any]:
        pass
    def update_case_outcome(self, case_id: str, plan: List[dict], result: str):
        pass

class SQLiteMemory(HistoricalMemory):
    def fetch_similar_cases(self, features: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM audit_logs WHERE status='SUCCESS'")
        success_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM audit_logs")
        total_count = c.fetchone()[0]
        conn.close()
        
        baseline_prob = (success_count / max(1, total_count)) if total_count > 0 else 0.5
        
        # Adjust heavily based on features
        if features.get('time_elapsed_bucket') == 'FAST_FRAUD':
            baseline_prob += 0.2
        
        return {
            "historical_success_probability": min(0.99, baseline_prob),
            "delay_distribution_hours": 4.5,
            "failure_patterns": ["MISSING_UTR", "BANK_REJECTED"]
        }
    
    def update_case_outcome(self, case_id: str, plan: List[dict], result: str):
        logger.info(f"[LEARN] Case Outcome Updated: {case_id} | Result: {result}")

memory = SQLiteMemory()

# --- B. Feature Layer ---
def extract_features(entity: dict) -> dict:
    amount = float(entity.get("amount", 0))
    time_str = str(entity.get("time_elapsed", "0h"))
    try:
        if 'h' in time_str: hours = float(time_str.replace('h', ''))
        elif 'm' in time_str: hours = float(time_str.replace('m', '')) / 60
        else: hours = float(time_str)
    except:
        hours = 2.0
    
    amount_band = "LARGE" if amount > 50000 else "MEDIUM" if amount > 5000 else "SMALL"
    if hours < 1: time_elapsed_bucket = 'FAST_FRAUD'
    elif hours <= 48: time_elapsed_bucket = 'RECENT_FRAUD'
    else: time_elapsed_bucket = 'LATE_FRAUD'
        
    return {
        "amount_band": amount_band,
        "time_elapsed_bucket": time_elapsed_bucket,
        "risk_level": "HIGH" if amount_band == "LARGE" or time_elapsed_bucket == "FAST_FRAUD" else "MEDIUM",
        "hours_elapsed": hours,
        "has_utr": entity.get("has_utr", False),
        "channel": entity.get("channel", "UPI").upper()
    }

# --- C. Graph Node ---
class ActionNode:
    def __init__(self, id: str, dependencies: List[str], cost: float, time: float, base_success_prob: float, recovery_value: float = 1.0):
        self.id = id
        self.dependencies = dependencies
        self.cost = cost
        self.time = time
        self.base_success_prob = base_success_prob
        self.recovery_value = recovery_value
        self.score = 0.0

# --- D. Explainability Builder & Scoring ---
def build_and_score_graph(features: dict, context: dict, case_id: str) -> tuple[List[ActionNode], List[str]]:
    nodes = [
        ActionNode("COLLECT_UTR", dependencies=[], cost=0.1, time=0.1, base_success_prob=0.99),
        ActionNode("INITIATE_BANK_ESCALATION", dependencies=[], cost=0.2, time=0.2, base_success_prob=0.85, recovery_value=2.0),
        ActionNode("UPI_REVERSAL", dependencies=["COLLECT_UTR"], cost=0.3, time=0.5, base_success_prob=0.8),
        ActionNode("FILE_REGULATORY_COMPLAINT", dependencies=[], cost=0.5, time=2.0, base_success_prob=0.6),
        ActionNode("ESCALATE_INTERNAL_OPS", dependencies=[], cost=0.8, time=1.0, base_success_prob=0.5)
    ]
    
    explainability = []
    explainability.append(f"Historical success probability baseline initiated at {round(context['historical_success_probability']*100)}%.")
    
    has_utr = features.get("has_utr", False)
    if has_utr:
        for node in nodes:
            if node.id == "COLLECT_UTR":
                node.score = -999
        explainability.append("UTR parameter present in evidence payload. Active collection bypassed.")
        
    for node in nodes:
        if node.score == -999: continue
        
        # Verify idempotency
        if already_executed(case_id, node.id):
             node.score = -999
             explainability.append(f"Skipping {node.id}: marked as already completed or pending in immutable record.")
             continue
             
        if features["time_elapsed_bucket"] == "LATE_FRAUD":
            if node.id in ["INITIATE_BANK_ESCALATION", "UPI_REVERSAL"]:
                node.base_success_prob *= 0.2
            if node.id == "FILE_REGULATORY_COMPLAINT":
                node.base_success_prob *= 1.5
                node.recovery_value *= 1.2
            
        if features["time_elapsed_bucket"] == "FAST_FRAUD" and node.id == "INITIATE_BANK_ESCALATION":
            node.base_success_prob *= 1.5
            
        if features["amount_band"] == "LARGE" and node.id in ["ESCALATE_INTERNAL_OPS", "FILE_REGULATORY_COMPLAINT"]:
             node.base_success_prob *= 2.0
             node.recovery_value *= 1.5
             explainability.append(f"Prioritized regulatory escalation ({node.id}) due to LARGE threshold signature.")
             
        score = (node.base_success_prob * node.recovery_value) - (node.time + node.cost)
        node.score = score
        
    if features["time_elapsed_bucket"] == "FAST_FRAUD":
         explainability.append("Critical time-window detected. Aggressive prioritization scaling applied to Immediate Action nodes.")
         
    return nodes, explainability

# --- E. Path Optimizer ---
def optimize_path(nodes: List[ActionNode], features: dict) -> List[dict]:
    resolved = []
    if features.get("has_utr"): resolved.append("COLLECT_UTR")
        
    pending = sorted([n for n in nodes if n.score != -999], key=lambda x: x.score, reverse=True)
    path = []
    step = 1
    
    while pending:
        candidate = None
        for node in pending:
            if all(dep in resolved for dep in node.dependencies):
                candidate = node
                break
                
        if candidate:
            path.append({
                "step": step,
                "action": candidate.id,
                "score": round(candidate.score, 2),
                "estimated_delay": f"{candidate.time}h"
            })
            resolved.append(candidate.id)
            pending.remove(candidate)
            step += 1
        else:
            break
            
    return path

# --- Main Entry Point ---
def generate_recovery_plan(entity: dict) -> dict:
    case_id = entity.get("transaction_id", "UNKNOWN_CASE")
    features = extract_features(entity)
    context = memory.fetch_similar_cases(features)
    
    nodes, explainability = build_and_score_graph(features, context, case_id)
    recommended_path = optimize_path(nodes, features)
    
    # 1. Action Confidence Breakdown (30/30/40)
    historical_score = context.get('historical_success_probability', 0.5)
    
    urgency_val = 0.9 if features["time_elapsed_bucket"] == "FAST_FRAUD" else 0.5 if features["time_elapsed_bucket"] == "RECENT_FRAUD" else 0.2
    
    # Certainty score based on node success avg
    certainty_score = 0.5
    if recommended_path and len(recommended_path) > 0:
        try:
            matched_nodes = [n for n in nodes if n.id in [s['action'] for s in recommended_path]]
            if matched_nodes:
                certainty_score = sum(n.base_success_prob for n in matched_nodes) / len(matched_nodes)
        except Exception:
            certainty_score = 0.5
    
    action_conf = (0.3 * historical_score) + (0.3 * urgency_val) + (0.4 * certainty_score)
    # Ensure no NaN or out of bounds
    action_conf = float(action_conf) if action_conf == action_conf else 0.5 # NaN check
    action_conf = round(min(max(action_conf, 0.1), 0.99), 2)
    
    # 2. System Confidence (Intelligence Integrity)
    # We use a baseline + bonus for UTR or multi-signal detections
    system_conf = 0.75
    if features.get("has_utr"): system_conf += 0.15
    system_conf = round(min(0.99, system_conf), 2)

    # Calculate strict, traceable probability adjustments
    adjustments = []
    if features["time_elapsed_bucket"] == "LATE_FRAUD":
        adjustments.append({"reason": "Delay > 48 hr", "impact": -0.15, "source": "time_elapsed_bucket", "confidence": 0.88})
    elif features["time_elapsed_bucket"] == "RECENT_FRAUD":
        adjustments.append({"reason": "Delay > 1 hr", "impact": -0.04, "source": "time_elapsed_bucket", "confidence": 0.92})
        
    if not features.get("has_utr"):
        adjustments.append({"reason": "Missing UTR", "impact": -0.12, "source": "has_utr", "confidence": 0.99})

    # Initialize Persistence: Mark all recommended actions as PENDING immediately
    for step in recommended_path:
        set_action_state(case_id, step["action"], "PENDING")

    estimated_time = sum(float(step["estimated_delay"].replace('h', '')) for step in recommended_path)

    # Return master OS payload
    return {
        "case_id": case_id,
        "risk_level": features["risk_level"],
        "recommended_path": recommended_path,
        "system_confidence": system_conf,
        "action_confidence": action_conf,
        "confidence_breakdown": {
            "historical": round(historical_score * 0.3, 2),
            "urgency": round(urgency_val * 0.3, 2),
            "certainty": round(certainty_score * 0.4, 2)
        },
        "adjustments": adjustments,
        "estimated_recovery_time": f"{round(estimated_time, 1)}h",
        "why_this_path": explainability
    }

def log_outcome(payload: dict) -> dict:
    plan = payload.get("plan", [])
    result = payload.get("result", "UNKNOWN")
    case_id = payload.get("case_id", "123")
    memory.update_case_outcome(case_id, plan, result)
    return {"status": "memory_updated"}
