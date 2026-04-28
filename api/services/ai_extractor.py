import os
import json
import logging
import re
import asyncio
from typing import Dict, Any

from services.url_intelligence import fetch_and_clean_url

# Configure standard logger
logger = logging.getLogger("payguard_extractor")
logger.setLevel(logging.INFO)

import google.generativeai as genai

# Configure Gemini with the provided API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAAhN0yrd-stNQ6GWPqSdOqQWl_BdC0eew")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_AVAILABLE = True
else:
    GEMINI_AVAILABLE = False

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import AsyncGroq
        groq_client = AsyncGroq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Groq SDK failed to load: {e}")

async def groq_extract(prompt: str, image_bytes: bytes, mime_type: str):
    if not groq_client:
        raise Exception("Groq not configured for failover")
    import base64
    
    if image_bytes and mime_type:
        b64_img = base64.b64encode(image_bytes).decode('utf-8')
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_img}",
                        },
                    },
                ],
            }
        ]
        model_name = "llama-3.2-11b-vision-preview"
        response_format = None
    else:
        messages = [
            {
                "role": "system",
                "content": prompt
            }
        ]
        model_name = "llama-3.3-70b-versatile"
        response_format = {"type": "json_object"}
        
    completion = await groq_client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0,
        response_format=response_format
    )
    res = completion.choices[0].message.content
    res = res.replace("```json", "").replace("```", "").strip()
    return json.loads(res)

def deterministic_scan(text: str) -> list:
    """System 1: Regex/Keyword layer for fast signal detection."""
    signals = []
    text_lower = text.lower()
    
    # Domain Intelligence Patterns
    urls = re.findall(r'(https?://[^\s,]+)', text)
    for url in urls:
        signals.append({
            "type": "MALICIOUS_URL",
            "value": url,
            "severity": "HIGH",
            "confidence": 0.85
        })
        
    # Urgency & Pattern Matching
    urgency_keywords = ["immediate", "urgent", "limited time", "blocked", "suspended"]
    if any(k in text_lower for k in urgency_keywords):
        signals.append({
            "type": "URGENCY_MARKER",
            "value": "High Pressure Language",
            "severity": "MEDIUM",
            "confidence": 0.75
        })
        
    # Financial Pattern Matching
    payment_keywords = ["upi", "vpa", "mpin", "transfer", "mpin", "otp"]
    if any(k in text_lower for k in payment_keywords):
        signals.append({
            "type": "PAYMENT_PHISHING",
            "value": "Gateway impersonation cues detected",
            "severity": "HIGH",
            "confidence": 0.80
        })
        
    return signals

async def extract_entities(raw_text: str, image_bytes: bytes = None, mime_type: str = None) -> Dict[str, Any]:
    """
    Extracts key fraud attributes (Amount, Platform, Destination Account, Timestamp)
    from unstructured evidence using a fast LLM.
    Automatically identifies URLs, scrapes them in real-time, and injects context.
    Supports Multimodal Vision capability when image_bytes is provided.
    """
    if not GEMINI_AVAILABLE:
        logger.error("LLM Client unavailable. Cannot process extraction.")
        raise Exception("LLM Extraction Engine Failed: Gemini client not configured.")

    # 1. Real-time Web Intelligence Ingestion
    urls = list(set(re.findall(r'(https?://[^\s]+)', raw_text)))[:5] # Limit to 5 unique URLs max
    
    if urls:
        logger.info(f"Extracting live intelligence from {len(urls)} URLs concurrently...")
        
        # Parallel scraping using asyncio.gather
        tasks = [fetch_and_clean_url(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for url, intel in zip(urls, results):
            if isinstance(intel, Exception):
                logger.warning(f"Thread execution failed for {url}: {intel}")
                raw_text += f"\n\n[URL SCRAPE FAILED FOR {url}: Exception {str(intel)}]"
            elif intel.get("status") == "success":
                ctx = intel.get("extracted_text", "")
                raw_text += f"\n\n[WEB INTELLIGENCE FOR {url}]\n{ctx}"
            else:
                err = intel.get("error", "Unknown Error")
                logger.warning(f"Failed to extract URL context: {err}")
                raw_text += f"\n\n[URL SCRAPE FAILED FOR {url}: {err}]"

    # 2. Deterministic System 1 Scan
    preliminary_signals = deterministic_scan(raw_text)

    try:
        logger.info("Using active Gemini 1.5 Flash client for extraction.")
        prompt = f"""
        You are a forensic fraud extraction AI (Autonomous Recovery OS).
        Extract structured data from this report.
        
        Required JSON Schema:
        {{
            "entities": {{
                "amount": "string",
                "platform": "string",
                "destination_account": "string",
                "timestamp": "string",
                "fraud_type": "string (2-3 words)"
            }},
            "signals": [
                {{ "type": "string", "value": "string", "severity": "LOW|MEDIUM|HIGH", "confidence": 0.95 }}
            ],
            "urgency_level": "LOW|MEDIUM|HIGH",
            "logic_reasoning": "string (Why this path?)"
        }}

        DEBUG CONTEXT (PRELIMINARY SIGNALS): {json.dumps(preliminary_signals)}
        
        CRITICAL RULES:
        1. Ignore "[URL SCRAPE FAILED]" for signals.
        2. Combine the PRELIMINARY SIGNALS with your own reasoned findings.
        3. Output ONLY the raw JSON format.
        
        Text: "{raw_text}"
        """
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json", "temperature": 0.0})
        
        if image_bytes and mime_type:
            contents = [prompt, {"mime_type": mime_type, "data": image_bytes}]
        else:
            contents = prompt
            
        response = await model.generate_content_async(contents)
        response_text = response.text
        return json.loads(response_text)
        
    except Exception as e:
        if groq_client:
             logger.warning(f"Gemini generation failed: {e}. Failing over to GROQ Vision/Text cluster.")
             try:
                 return await groq_extract(prompt, image_bytes, mime_type)
             except Exception as ge:
                 logger.error(f"Groq failover also failed: {ge}")
                 raise Exception(f"Dynamic LLM Extraction Failed across both primary and failover networks.")
        logger.error(f"Gemini API call failed: {e}.")
        raise Exception(f"Dynamic LLM Extraction Failed: {e}")
