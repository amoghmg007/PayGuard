import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging
import re
import ipaddress
import socket
import asyncio

logger = logging.getLogger("payguard_url_intel")
logger.setLevel(logging.INFO)

url_cache = {}

async def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Try to resolve IP to block SSRF - wrapping in executor for non-blocking
        loop = asyncio.get_event_loop()
        ip = await loop.run_in_executor(None, socket.gethostbyname, hostname)
        ip_obj = ipaddress.ip_address(ip)
        
        # Block internal and highly restricted IPs
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            logger.warning(f"SSRF Attempt Blocked: {url} resolved to internal IP {ip}")
            return False
        return True
    except Exception as e:
        logger.error(f"URL Validation Error: {e}")
        return False

async def fetch_and_clean_url(url: str) -> dict:
    """
    Validates URL, fetches with timeout, caches result, and cleans HTML to core text using httpx.
    """
    if url in url_cache:
        logger.info(f"Using cached result for {url}")
        return url_cache[url]
        
    if not await is_safe_url(url):
        return {"status": "error", "error": "URL failed security validation (SSRF/Invalid Schema)."}
        
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 PayGuard/1.0'}
        
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Domain Intelligence (basic)
            is_https = url.startswith("https")
            domain = urlparse(url).hostname
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            title = soup.title.string if soup.title else ""
            
            paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
            body_text = " ".join([p for p in paragraphs if p])
            
            raw_text = f"Title: {title} | Content: {body_text}"
            
            # Trim to 3000 chars to avoid token explosion
            cleaned_text = raw_text[:3000]
            
            result = {
                "status": "success",
                "url": url,
                "domain": domain,
                "is_https": is_https,
                "extracted_text": cleaned_text
            }
            
            url_cache[url] = result
            return result
            
    except httpx.TimeoutException:
        logger.warning(f"URL Request Timeout: {url}")
        return {"status": "error", "error": "Connection timed out."}
    except Exception as e:
        logger.error(f"URL Processing Failed: {e}")
        return {"status": "error", "error": str(e)}
