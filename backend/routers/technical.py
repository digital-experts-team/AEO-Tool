import os
import json
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
import anthropic

from backend.models.schemas import TechnicalAuditResponse, BotAccessStatus
from backend.services.crawl_checker import run_full_technical_audit, get_domain_authority
from backend.sheets.client_ops import get_client_by_id, update_client_fields
from backend.sheets.run_ops import get_query_runs

router = APIRouter(prefix="/api/technical", tags=["Technical Audit"])

@router.get("/audit/{client_id}", response_model=TechnicalAuditResponse)
async def get_technical_audit(client_id: str):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    domain = str(client.get("domain", "")).strip()
    if not domain:
        # Infer from brand_name: "Airbnb" → "airbnb.com"
        brand = str(client.get("brand_name", client.get("name", ""))).strip()
        if not brand:
            raise HTTPException(status_code=400, detail="Client has no domain or brand name configured")
        domain = brand.lower().replace(" ", "") + ".com"
        
    try:
        audit = await run_full_technical_audit(domain)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute technical audit: {str(e)}")
        
    # Calculate readiness score (max 100 points)
    score = 0
    if audit.get("robots_txt_exists"):
        score += 10
        
    # Check critical bots
    robots = audit.get("robots", {})
    critical_bots = ["OAI-SearchBot", "ChatGPT-User", "Claude-Web", "PerplexityBot"]
    all_critical_allowed = True
    for bot in critical_bots:
        bot_rule = robots.get(bot, {})
        if bot_rule.get("status") == "blocked":
            all_critical_allowed = False
            
    if all_critical_allowed:
        score += 25
        
    if audit.get("llms_txt", {}).get("exists"):
        score += 20
        
    if audit.get("sitemap", {}).get("exists"):
        score += 15
        
    schema = audit.get("schema", {})
    schema_types = schema.get("schema_types", [])
    if "Organization" in schema_types:
        score += 15
    if "FAQPage" in schema_types or "Article" in schema_types:
        score += 15
        
    # Build critical issues list
    issues = []
    if robots.get("OAI-SearchBot", {}).get("status") == "blocked":
        issues.append("ChatGPT search citations blocked by robots.txt")
    if robots.get("ChatGPT-User", {}).get("status") == "blocked":
        issues.append("Real-time ChatGPT access blocked by robots.txt")
    if robots.get("Claude-Web", {}).get("status") == "blocked":
        issues.append("Claude.ai citations blocked by robots.txt")
    if robots.get("PerplexityBot", {}).get("status") == "blocked":
        issues.append("Perplexity citations blocked by robots.txt")
    if not audit.get("llms_txt", {}).get("exists"):
        issues.append("llms.txt not found — AI agents cannot find priority content")
    if not audit.get("sitemap", {}).get("exists"):
        issues.append("sitemap.xml not found — reduces AI crawl efficiency")
    if not schema.get("has_schema"):
        issues.append("No structured data detected — reduces AI comprehension")
        
    bot_access_list = []
    for bot, rule in robots.items():
        bot_access_list.append(BotAccessStatus(
            user_agent=bot,
            display_name=rule.get("display_name", bot),
            status=rule.get("status", "not_specified"),
            impact=rule.get("impact", "")
        ))

    # Boost score if PageSpeed performance is good
    pagespeed = audit.get("pagespeed", {})
    if pagespeed.get("available"):
        perf = pagespeed.get("performance_score", 0)
        if perf >= 90:
            score = min(100, score + 10)
        elif perf >= 70:
            score = min(100, score + 5)
        
    return TechnicalAuditResponse(
        client_id=client_id,
        domain=domain,
        ai_readiness_score=score,
        robots_txt_exists=audit.get("robots_txt_exists", False),
        bot_access=bot_access_list,
        llms_txt_exists=audit.get("llms_txt", {}).get("exists", False),
        llms_txt_content=audit.get("llms_txt", {}).get("content"),
        sitemap_exists=audit.get("sitemap", {}).get("exists", False),
        sitemap_page_count=audit.get("sitemap", {}).get("page_count"),
        schema_types_found=schema_types,
        schema_types_missing=schema.get("missing_recommended", []),
        critical_issues=issues,
        pagespeed=pagespeed if pagespeed.get("available") else None
    )

@router.get("/generate-llms-txt/{client_id}")
async def generate_llms_txt(client_id: str):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    brand_name = str(client.get("brand_name") or client.get("name", ""))
    domain = str(client.get("domain", ""))
    industry = str(client.get("industry", ""))
    queries = client.get("queries", [])
    competitors = client.get("competitors", [])
    
    query_bullets = "\n".join(f"- {q}" for q in queries)
    comp_bullets = f"We are an alternative to: {', '.join(competitors)}" if competitors else "Alternative product category solutions."
    
    content = f"""# {brand_name} - AI Agent Guide
# Generated by AI Citation Tracker
# Deploy this file to https://{domain}/llms.txt

## About
> {brand_name} is a {industry} brand. This file helps AI agents understand our content and find authoritative information about our brand.

## Primary Domain
- https://{domain}

## Key Topics We Cover
{query_bullets}

## Competitor Context
{comp_bullets}

## Best Pages for AI Citation
- https://{domain}/about
- https://{domain}/blog
- https://{domain}/features

## Content Update Frequency
Daily

## Contact for AI Partnerships
ai@{domain}
"""
    return {
        "content": content,
        "filename": "llms.txt",
        "deploy_url": f"https://{domain}/llms.txt",
        "instructions": "Upload this file to the root of your website domain"
    }

@router.get("/source-authority/{client_id}")
async def get_source_authority(client_id: str):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    client_domain = str(client.get("domain", "")).strip().lower()
    
    runs = get_query_runs(client_id)
    domain_counts = {}
    
    for r in runs:
        urls = r.get("source_urls", [])
        # If urls is stored as string pipe separated, split it
        if isinstance(urls, str):
            urls = [u.strip() for u in urls.split("|") if u.strip()]
            
        for url in urls:
            try:
                parsed = urllib.parse.urlparse(url)
                domain = parsed.netloc.strip().lower()
                if domain.startswith("www."):
                    domain = domain[4:]
                if domain:
                    domain_counts[domain] = domain_counts.get(domain, 0) + 1
            except Exception:
                continue
                
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
    top_50 = sorted_domains[:50]
    top_50_names = [d[0] for d in top_50]
    
    authorities = await get_domain_authority(top_50_names)
    
    sources = []
    highest_auth_val = -1
    highest_auth_domain = "None"
    
    for dom, count in top_50:
        auth = authorities.get(dom, {})
        auth_score = auth.get("authority_score")
        global_rank = auth.get("global_rank")
        
        is_client = (dom == client_domain or client_domain in dom)
        
        if auth_score is not None and auth_score > highest_auth_val:
            highest_auth_val = auth_score
            highest_auth_domain = dom
            
        sources.append({
            "domain": dom,
            "favicon_url": f"https://www.google.com/s2/favicons?domain={dom}&sz=16",
            "times_cited": count,
            "authority_score": auth_score,
            "global_rank": global_rank,
            "is_client_domain": is_client
        })
        
    return {
        "sources": sources,
        "total_unique_domains": len(domain_counts),
        "highest_authority_source": highest_auth_domain
    }

def fallback_prompt_suggestions(brand_name: str, competitors: List[str]) -> List[str]:
    comp = competitors[0] if competitors else "industry competitors"
    return [
        f"best {brand_name} alternatives for engineering teams",
        f"how does {brand_name} compare to {comp}",
        f"is {brand_name} secure for enterprise database documentation",
        f"what is the pricing structure of {brand_name} vs competitors",
        f"how to set up automated workflows in {brand_name}",
        f"does {brand_name} have a local desktop app",
        f"top-rated platforms like {brand_name} for agile product development",
        f"compare {brand_name} vs {comp} integration features",
        f"why choose {brand_name} over {comp} for wiki collaboration",
        f"what are the key use cases of {brand_name} in remote startups"
    ]

@router.get("/prompt-suggestions/{client_id}")
async def get_prompt_suggestions(client_id: str, force_refresh: bool = False):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    cached_suggestions = client.get("suggested_queries", "")
    gen_time_str = client.get("suggestions_generated_at", "")
    
    is_fresh = False
    if gen_time_str:
        try:
            gen_time = datetime.fromisoformat(gen_time_str)
            now = datetime.now(timezone.utc)
            if (now - gen_time).days < 7:
                is_fresh = True
        except Exception:
            pass
            
    if cached_suggestions and is_fresh and not force_refresh:
        # Split pipe separated suggestions
        suggestions = [s.strip() for s in cached_suggestions.split("|") if s.strip()]
        return {
            "suggestions": suggestions,
            "generated_at": gen_time_str,
            "cached": True
        }
        
    # Generate new using Claude
    brand_name = str(client.get("brand_name") or client.get("name", ""))
    industry = str(client.get("industry", "general"))
    existing_queries = client.get("queries", [])
    competitors = client.get("competitors", [])
    
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    suggestions = []
    
    if api_key:
        try:
            cl = anthropic.AsyncAnthropic(api_key=api_key, timeout=25.0)
            sys_p = (
                "You are an AI search strategist. Generate additional search queries that a "
                "brand should track to measure their visibility in AI-generated answers. "
                "Return ONLY a JSON array of 10 query strings. No preamble, no markdown, no explanation. Just the JSON array."
            )
            user_p = f"""Brand: {brand_name}
Industry: {industry}
Competitors: {competitors}
Currently tracking these queries: {existing_queries}

Generate 10 additional queries this brand should monitor in AI engines. Focus on: buying intent queries, comparison queries vs competitors, use-case specific queries, and problem-solving queries relevant to their industry. Do not duplicate existing queries."""

            resp = await cl.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=600,
                temperature=0.7,
                system=sys_p,
                messages=[{"role": "user", "content": user_p}]
            )
            
            if resp and resp.content and len(resp.content) > 0:
                text = resp.content[0].text.strip()
                if text.startswith("```"):
                    text = text.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(text)
                if isinstance(parsed, list) and len(parsed) > 0:
                    suggestions = [str(x) for x in parsed[:10]]
        except Exception as e:
            print(f"[technical] Claude query suggestion failed: {e}")
            
    if not suggestions:
        suggestions = fallback_prompt_suggestions(brand_name, competitors)
        
    # Cache to sheet
    now_str = datetime.now(timezone.utc).isoformat()
    update_client_fields(client_id, {
        "suggested_queries": suggestions,
        "suggestions_generated_at": now_str
    })
    
    return {
        "suggestions": suggestions,
        "generated_at": now_str,
        "cached": False
    }
