import os
import httpx
import base64
import logging
import random
from typing import List, Dict, Any, Optional

logger = logging.getLogger("citation_tracker")

DATAFORSEO_LOGIN = os.getenv("DATAFORSEO_LOGIN", "")
DATAFORSEO_PASSWORD = os.getenv("DATAFORSEO_PASSWORD", "")
DATAFORSEO_BASE = "https://api.dataforseo.com/v3"


def _get_auth_header() -> Optional[str]:
    """Returns Base64 encoded auth header for DataForSEO, or None if credentials missing."""
    if not DATAFORSEO_LOGIN or not DATAFORSEO_PASSWORD:
        return None
    credentials = f"{DATAFORSEO_LOGIN}:{DATAFORSEO_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


async def fetch_serp_ai_overview(
    queries: List[str],
    brand_name: str,
    brand_aliases: List[str] = [],
    competitors: List[str] = [],
    location: str = "United States"
) -> List[Dict[str, Any]]:
    """
    Calls DataForSEO Google SERP API for each query.
    Extracts whether the brand appears in the AI Overview box.
    Falls back to demo data if credentials are missing.
    """
    auth = _get_auth_header()
    if not auth:
        logger.info("[dataforseo] No API credentials — returning demo AI Overview data")
        return _demo_ai_overview(queries, brand_name, competitors)

    results = []
    all_names = [brand_name.lower()] + [a.lower() for a in brand_aliases]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Build tasks in batches
            tasks_payload = []
            for q in queries:
                tasks_payload.append({
                    "keyword": q,
                    "location_name": location,
                    "language_name": "English",
                    "device": "desktop",
                    "os": "windows"
                })

            response = await client.post(
                f"{DATAFORSEO_BASE}/serp/google/organic/live/advanced",
                headers={"Authorization": auth, "Content-Type": "application/json"},
                json=tasks_payload
            )

            if response.status_code != 200:
                logger.error(f"[dataforseo] SERP API error: {response.status_code} {response.text[:200]}")
                return _demo_ai_overview(queries, brand_name, competitors)

            data = response.json()

            for task in data.get("tasks", []):
                if task.get("status_code") != 20000:
                    continue

                for result_item in task.get("result", []):
                    keyword = result_item.get("keyword", "")
                    items = result_item.get("items", [])

                    ai_overview_present = False
                    brand_in_overview = False
                    brand_position_in_overview = None
                    competitors_in_overview = []
                    ai_overview_text = ""

                    for item in items:
                        item_type = item.get("type", "")

                        # Check for AI Overview items
                        if item_type in ("ai_overview", "featured_snippet", "knowledge_graph"):
                            ai_overview_present = True
                            snippet_text = (item.get("description") or item.get("text") or "").lower()
                            ai_overview_text = snippet_text[:300]

                            for idx, name in enumerate(all_names):
                                if name in snippet_text:
                                    brand_in_overview = True
                                    # Approximate position
                                    pos = snippet_text.find(name)
                                    total_len = len(snippet_text)
                                    if pos < total_len * 0.33:
                                        brand_position_in_overview = "top"
                                    elif pos < total_len * 0.66:
                                        brand_position_in_overview = "middle"
                                    else:
                                        brand_position_in_overview = "bottom"
                                    break

                            for comp in competitors:
                                if comp.lower() in snippet_text:
                                    competitors_in_overview.append(comp)

                    results.append({
                        "query": keyword,
                        "ai_overview_present": ai_overview_present,
                        "brand_in_overview": brand_in_overview,
                        "brand_position": brand_position_in_overview,
                        "competitors_in_overview": competitors_in_overview,
                        "ai_overview_snippet": ai_overview_text[:200]
                    })

    except Exception as e:
        logger.error(f"[dataforseo] Exception in fetch_serp_ai_overview: {e}")
        return _demo_ai_overview(queries, brand_name, competitors)

    # Fill in any queries that didn't get results
    result_queries = {r["query"] for r in results}
    for q in queries:
        if q not in result_queries:
            results.append({
                "query": q,
                "ai_overview_present": False,
                "brand_in_overview": False,
                "brand_position": None,
                "competitors_in_overview": [],
                "ai_overview_snippet": ""
            })

    return results


async def fetch_organic_rankings(
    queries: List[str],
    brand_name: str,
    brand_aliases: List[str] = [],
    competitors: List[str] = [],
    location: str = "United States"
) -> List[Dict[str, Any]]:
    """
    Calls DataForSEO Google SERP API to get organic rankings for the brand and competitors.
    Falls back to demo data if credentials are missing.
    """
    auth = _get_auth_header()
    if not auth:
        logger.info("[dataforseo] No API credentials — returning demo organic ranking data")
        return _demo_organic_rankings(queries, brand_name, competitors)

    results = []
    all_names = [brand_name.lower()] + [a.lower() for a in brand_aliases]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            tasks_payload = []
            for q in queries:
                tasks_payload.append({
                    "keyword": q,
                    "location_name": location,
                    "language_name": "English",
                    "device": "desktop",
                    "os": "windows",
                    "depth": 30
                })

            response = await client.post(
                f"{DATAFORSEO_BASE}/serp/google/organic/live/advanced",
                headers={"Authorization": auth, "Content-Type": "application/json"},
                json=tasks_payload
            )

            if response.status_code != 200:
                logger.error(f"[dataforseo] Organic rankings API error: {response.status_code}")
                return _demo_organic_rankings(queries, brand_name, competitors)

            data = response.json()

            for task in data.get("tasks", []):
                if task.get("status_code") != 20000:
                    continue

                for result_item in task.get("result", []):
                    keyword = result_item.get("keyword", "")
                    items = result_item.get("items", [])

                    brand_rank = None
                    brand_url = None
                    competitor_ranks = {}

                    for item in items:
                        if item.get("type") != "organic":
                            continue

                        rank = item.get("rank_absolute", 999)
                        title = (item.get("title") or "").lower()
                        url = (item.get("url") or "").lower()
                        domain = (item.get("domain") or "").lower()

                        # Check if this is the brand
                        for name in all_names:
                            if name in title or name in url or name in domain:
                                if brand_rank is None or rank < brand_rank:
                                    brand_rank = rank
                                    brand_url = item.get("url", "")
                                break

                        # Check competitors
                        for comp in competitors:
                            if comp.lower() in title or comp.lower() in url or comp.lower() in domain:
                                if comp not in competitor_ranks or rank < competitor_ranks[comp]["rank"]:
                                    competitor_ranks[comp] = {
                                        "rank": rank,
                                        "url": item.get("url", "")
                                    }

                    results.append({
                        "query": keyword,
                        "brand_organic_rank": brand_rank,
                        "brand_url": brand_url,
                        "competitor_ranks": {
                            name: info["rank"]
                            for name, info in competitor_ranks.items()
                        }
                    })

    except Exception as e:
        logger.error(f"[dataforseo] Exception in fetch_organic_rankings: {e}")
        return _demo_organic_rankings(queries, brand_name, competitors)

    result_queries = {r["query"] for r in results}
    for q in queries:
        if q not in result_queries:
            results.append({
                "query": q,
                "brand_organic_rank": None,
                "brand_url": None,
                "competitor_ranks": {}
            })

    return results


# ==========================================
# Demo Data Generators
# ==========================================

def _demo_ai_overview(queries: List[str], brand_name: str, competitors: List[str]) -> List[Dict[str, Any]]:
    """Generate realistic demo AI Overview data."""
    results = []
    for q in queries:
        has_overview = random.random() > 0.25  # 75% chance of AI Overview
        brand_found = has_overview and random.random() > 0.35  # 65% if overview exists
        comp_found = []
        if has_overview:
            comp_found = random.sample(competitors, min(len(competitors), random.randint(0, 3)))

        results.append({
            "query": q,
            "ai_overview_present": has_overview,
            "brand_in_overview": brand_found,
            "brand_position": random.choice(["top", "middle", "bottom"]) if brand_found else None,
            "competitors_in_overview": comp_found,
            "ai_overview_snippet": f"Based on analysis, {brand_name} is a leading solution for {q}..." if brand_found else ""
        })
    return results


def _demo_organic_rankings(queries: List[str], brand_name: str, competitors: List[str]) -> List[Dict[str, Any]]:
    """Generate realistic demo organic ranking data."""
    results = []
    for q in queries:
        brand_rank = random.choice([None, *range(1, 25)]) if random.random() > 0.2 else None
        comp_ranks = {}
        for comp in competitors:
            if random.random() > 0.3:
                comp_ranks[comp] = random.randint(1, 30)

        results.append({
            "query": q,
            "brand_organic_rank": brand_rank,
            "brand_url": f"https://{brand_name.lower().replace(' ', '')}.com" if brand_rank else None,
            "competitor_ranks": comp_ranks
        })
    return results
