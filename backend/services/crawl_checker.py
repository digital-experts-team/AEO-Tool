import os
import re
import asyncio
from typing import Optional, List, Dict, Any
import urllib.parse
import httpx

AI_BOTS = {
    "GPTBot": "OpenAI Training Crawler",
    "OAI-SearchBot": "OpenAI Search Crawler",
    "ChatGPT-User": "ChatGPT Live Retrieval",
    "ClaudeBot": "Anthropic Training Crawler",
    "Claude-Web": "Claude Live Retrieval",
    "Claude-SearchBot": "Claude Search Crawler",
    "anthropic-ai": "Anthropic AI Crawler",
    "PerplexityBot": "Perplexity Retrieval Bot",
    "Perplexity-User": "Perplexity Live Agent",
    "Google-Extended": "Google AI Training Opt-out",
    "CCBot": "Common Crawl Training Bot",
    "Amazonbot": "Amazon AI Crawler",
    "Meta-ExternalAgent": "Meta AI Training Crawler",
    "Googlebot": "Google Search Bot",
    "Bingbot": "Bing Search Bot",
}

BOT_IMPACTS = {
    "GPTBot": "Reduces ChatGPT training presence — no citation impact",
    "OAI-SearchBot": "CRITICAL — Removes content from ChatGPT search answers",
    "ChatGPT-User": "CRITICAL — Blocks real-time ChatGPT citation access",
    "ClaudeBot": "Reduces Claude training presence — no citation impact",
    "Claude-Web": "CRITICAL — Removes content from Claude.ai answers",
    "Claude-SearchBot": "HIGH — Reduces Claude search citation eligibility",
    "anthropic-ai": "High — Restricts Anthropic model retrieval",
    "PerplexityBot": "CRITICAL — Content won't appear in Perplexity answers",
    "Perplexity-User": "CRITICAL — Blocks Perplexity live agent search",
    "Google-Extended": "Opted out of Gemini AI training — no search impact",
    "CCBot": "Positive — Blocks Common Crawl training scraper",
    "Amazonbot": "Neutral — Restricts Amazon AI crawler indexing",
    "Meta-ExternalAgent": "Neutral — Restricts Meta AI crawler model training",
    "Googlebot": "CRITICAL — Removes website from Google Search results",
    "Bingbot": "HIGH — Removes website from Bing Search results",
}

def clean_domain(domain: str) -> str:
    """Strips protocol prefixes, trailing slashes, and spaces."""
    d = domain.strip().lower()
    d = re.sub(r'^https?://', '', d)
    d = d.split('/')[0]
    return d

async def fetch_robots_txt(domain: str) -> Optional[str]:
    """Fetches robots.txt over HTTPS first, with HTTP fallback."""
    clean_d = clean_domain(domain)
    urls = [f"https://{clean_d}/robots.txt", f"http://{clean_d}/robots.txt"]
    
    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.text
        except Exception:
            continue
    return None

def parse_robots_txt(robots_content: str) -> Dict[str, Dict[str, str]]:
    """
    Parses robots.txt content to match AI_BOTS against user-agents.
    Returns status: allowed | blocked | partial | not_specified
    """
    lines = robots_content.splitlines()
    current_agents = []
    agent_rules = {} # agent_lower: {"disallow": [], "allow": []}
    
    # Simple parse loop
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        # User-agent matches
        ua_match = re.match(r'(?i)^\s*User-agent\s*:\s*(.+)$', line)
        if ua_match:
            agent = ua_match.group(1).strip().lower()
            current_agents.append(agent)
            continue
            
        # Allow/Disallow rules
        rule_match = re.match(r'(?i)^\s*(Allow|Disallow)\s*:\s*(.+)$', line)
        if rule_match and current_agents:
            rule_type = rule_match.group(1).strip().lower()
            rule_path = rule_match.group(2).strip()
            
            for agent in current_agents:
                if agent not in agent_rules:
                    agent_rules[agent] = {"disallow": [], "allow": []}
                agent_rules[agent][rule_type].append(rule_path)
        else:
            # If we hit another command, reset current agents
            # except when we are grouping rules
            pass
            
    # Process each target bot
    results = {}
    for bot, display_name in AI_BOTS.items():
        bot_lower = bot.lower()
        impact = BOT_IMPACTS.get(bot, "Neutral — Standard crawler status")
        
        # Check specific rules for this bot
        rules = agent_rules.get(bot_lower)
        
        # If no specific rules, check if wildcard rules apply
        if not rules:
            rules = agent_rules.get("*")
            
        if not rules:
            results[bot] = {
                "status": "not_specified",
                "display_name": display_name,
                "impact": impact
            }
            continue
            
        disallows = rules["disallow"]
        allows = rules["allow"]
        
        # Check if root is blocked
        is_blocked = any(p == "/" or p == "/*" for p in disallows)
        
        if is_blocked:
            results[bot] = {
                "status": "blocked",
                "display_name": display_name,
                "impact": impact
            }
        elif len(disallows) > 0 and len(allows) > 0:
            results[bot] = {
                "status": "partial",
                "display_name": display_name,
                "impact": impact
            }
        elif len(disallows) > 0:
            results[bot] = {
                "status": "partial",
                "display_name": display_name,
                "impact": impact
            }
        else:
            results[bot] = {
                "status": "allowed",
                "display_name": display_name,
                "impact": impact
            }
            
    return results

async def check_llms_txt(domain: str) -> Dict[str, Any]:
    """Checks if /llms.txt exists and reads its content."""
    clean_d = clean_domain(domain)
    url = f"https://{clean_d}/llms.txt"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                # Return content truncated to 1500 chars to avoid oversized responses
                return {
                    "exists": True,
                    "content": resp.text[:1500],
                    "url": url
                }
    except Exception:
        pass
    return {"exists": False, "content": None, "url": url}

async def check_sitemap(domain: str) -> Dict[str, Any]:
    """Checks if /sitemap.xml exists and extracts total page counts."""
    clean_d = clean_domain(domain)
    url = f"https://{clean_d}/sitemap.xml"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                text = resp.text
                page_count = len(re.findall(r'<(loc|url)\b', text, re.IGNORECASE))
                return {
                    "exists": True,
                    "url": url,
                    "page_count": page_count if page_count > 0 else None
                }
    except Exception:
        pass
    return {"exists": False, "url": url, "page_count": None}

async def check_schema_markup(domain: str) -> Dict[str, Any]:
    """Scrapes homepage and extracts structured schemas types found."""
    clean_d = clean_domain(domain)
    url = f"https://{clean_d}"
    recommended = ["Organization", "WebSite", "Product", "Article", "FAQPage", "BreadcrumbList"]
    found_types = []
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                html = resp.text
                # Find all JSON-LD blocks
                json_ld_blocks = re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
                for block in json_ld_blocks:
                    try:
                        data = json.loads(block.strip())
                        # Helper to recursively extract @type
                        def extract_types(obj):
                            if isinstance(obj, dict):
                                if "@type" in obj:
                                    t = obj["@type"]
                                    if isinstance(t, list):
                                        found_types.extend(t)
                                    else:
                                        found_types.append(t)
                                for v in obj.values():
                                    extract_types(v)
                            elif isinstance(obj, list):
                                for item in obj:
                                    extract_types(item)
                        
                        import json
                        extract_types(data)
                    except Exception:
                        continue
    except Exception:
        pass
        
    found_uniq = list(set(found_types))
    missing = [t for t in recommended if t not in found_uniq]
    
    return {
        "has_schema": len(found_uniq) > 0,
        "schema_types": found_uniq,
        "missing_recommended": missing
    }

async def get_domain_authority(domains: List[str]) -> Dict[str, Dict[str, Any]]:
    """Gets PageRank authority scores via OpenPageRank API in batches of 10."""
    results = {}
    if not domains:
        return results
        
    api_key = os.getenv("OPEN_PAGE_RANK_API_KEY", "")
    
    # Deduplicate
    unique_domains = list(set(clean_domain(d) for d in domains))
    
    # Batch in groups of 10
    for i in range(0, len(unique_domains), 10):
        batch = unique_domains[i:i+10]
        params = [("domains[]", d) for d in batch]
        headers = {}
        if api_key:
            headers["API-OPR"] = api_key
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = "https://openpagerank.com/api/v1.0/getPageRank"
                resp = await client.get(url, headers=headers, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    response_list = data.get("response", [])
                    # If response is a dict, convert values
                    if isinstance(response_list, dict):
                        response_list = response_list.values()
                        
                    for item in response_list:
                        d_name = item.get("domain", "")
                        results[d_name] = {
                            "authority_score": item.get("page_rank_integer"),
                            "global_rank": item.get("rank")
                        }
        except Exception:
            pass
            
    # Guarantee a fallback entry for requested domains if missing
    for d in domains:
        clean_d = clean_domain(d)
        if clean_d not in results:
            results[clean_d] = {
                "authority_score": None,
                "global_rank": None
            }
            
    return results

async def check_pagespeed_insights(domain: str) -> Dict[str, Any]:
    """Fetches Google PageSpeed Insights for the domain using GOOGLE_API_KEY."""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    clean_d = clean_domain(domain)
    url = f"https://{clean_d}"
    
    if not api_key:
        return {"available": False, "reason": "GOOGLE_API_KEY not set"}
    
    try:
        psi_url = (
            f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
            f"?url={urllib.parse.quote(url, safe='')}"
            f"&strategy=mobile&key={api_key}"
            f"&category=performance&category=seo&category=accessibility"
        )
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(psi_url)
            if resp.status_code != 200:
                try:
                    err_body = resp.json()
                    err_msg = err_body.get("error", {}).get("message", str(resp.status_code))
                except Exception:
                    err_msg = f"HTTP {resp.status_code}"
                print(f"[PageSpeed] API error for {domain}: {err_msg}")
                return {"available": False, "reason": err_msg}
            data = resp.json()
        
        cats = data.get("lighthouseResult", {}).get("categories", {})
        audits = data.get("lighthouseResult", {}).get("audits", {})
        
        perf_score = round((cats.get("performance", {}).get("score", 0) or 0) * 100)
        seo_score  = round((cats.get("seo", {}).get("score", 0) or 0) * 100)
        a11y_score = round((cats.get("accessibility", {}).get("score", 0) or 0) * 100)
        
        # Core Web Vitals
        lcp = audits.get("largest-contentful-paint", {}).get("displayValue", "N/A")
        cls = audits.get("cumulative-layout-shift", {}).get("displayValue", "N/A")
        fid = audits.get("total-blocking-time", {}).get("displayValue", "N/A")
        
        return {
            "available": True,
            "performance_score": perf_score,
            "seo_score": seo_score,
            "accessibility_score": a11y_score,
            "lcp": lcp,
            "cls": cls,
            "tbt": fid,
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}


async def run_full_technical_audit(domain: str) -> Dict[str, Any]:
    """Combines all four audit checks concurrently."""
    clean_d = clean_domain(domain)
    
    # 1. Fetch robots.txt first
    robots_content = await fetch_robots_txt(clean_d)
    if robots_content:
        robots_audit = parse_robots_txt(robots_content)
        robots_exists = True
    else:
        # If no robots.txt, default all to allowed or not_specified
        robots_audit = {
            bot: {
                "status": "not_specified",
                "display_name": display,
                "impact": BOT_IMPACTS.get(bot, "")
            }
            for bot, display in AI_BOTS.items()
        }
        robots_exists = False
        
    # 2. Run others concurrently (including PageSpeed)
    results = await asyncio.gather(
        check_llms_txt(clean_d),
        check_sitemap(clean_d),
        check_schema_markup(clean_d),
        check_pagespeed_insights(clean_d)
    )
    
    return {
        "robots_txt_exists": robots_exists,
        "robots": robots_audit,
        "llms_txt": results[0],
        "sitemap": results[1],
        "schema": results[2],
        "pagespeed": results[3]
    }
