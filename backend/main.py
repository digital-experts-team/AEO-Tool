import os
import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Header, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from backend.services import query_runner, claude_parser, summarizer
from backend.sheets import client_ops, run_ops
print(f"[Startup] client_ops loaded from: {client_ops.__file__}")

from backend.utils.logger import logger

from fastapi.middleware.cors import CORSMiddleware
from backend.routers import reports, technical as technical_router, gsc as gsc_router

app = FastAPI(
    title="AI Citation Tracker API",
    description="Orchestrator service for daily AI engine citation monitoring using Google Sheets storage.",
    version="1.0.0"
)

app.include_router(reports.router)
app.include_router(technical_router.router)
app.include_router(gsc_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. process_single_query
async def process_single_query(client: Dict[str, Any], query: str, engine: str, raw_response: str) -> Dict[str, Any]:
    """
    Calls claude_parser.parse_citation() with client data.
    Builds a complete dict ready to write to Google Sheets query_runs tab.
    Returns the dict (does not write yet).
    """
    brand_name = client.get("brand_name") or client.get("name", "")
    brand_aliases = client.get("brand_aliases", [])
    competitors = client.get("competitors", [])

    parsed = await claude_parser.parse_citation(
        raw_response=raw_response,
        brand_name=brand_name,
        brand_aliases=brand_aliases,
        competitors=competitors,
        query=query,
        engine=engine
    )

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if parsed and isinstance(parsed, dict):
        brand_mentioned = parsed.get("brand_mentioned", False)
        citation_score = parsed.get("citation_score", 1 if brand_mentioned else 0)
        return {
            "client_id": str(client.get("id", "")),
            "run_date": today_str,
            "query": query,
            "engine": engine,
            "raw_response": raw_response,
            "brand_mentioned": str(brand_mentioned),
            "brand_sentiment": str(parsed.get("brand_sentiment", "neutral")),
            "brand_description": str(parsed.get("brand_description") or ""),
            "brand_position": str(parsed.get("brand_position", "not_mentioned")),
            "competitors_mentioned": parsed.get("competitors_mentioned", []),
            "source_urls": parsed.get("source_urls", []),
            "citation_score": str(citation_score),
            "reasoning": str(parsed.get("reasoning", ""))
        }
    else:
        return {
            "client_id": str(client.get("id", "")),
            "run_date": today_str,
            "query": query,
            "engine": engine,
            "raw_response": raw_response,
            "brand_mentioned": "False",
            "brand_sentiment": "not_mentioned",
            "brand_description": "",
            "brand_position": "not_mentioned",
            "competitors_mentioned": [],
            "source_urls": [],
            "citation_score": "0",
            "reasoning": "Failed to parse structured citation response."
        }

# 2. process_client
async def process_client(client: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gets all queries from client, executes query_runner on each engine,
    calls process_single_query, writes runs to sheets, calculates metrics,
    calls summarizer, and upserts daily summary.
    """
    client_id = str(client.get("id", ""))
    brand_name = client.get("brand_name") or client.get("name", "")
    queries = client.get("queries", [])
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        # Use a semaphore to limit concurrent requests to AI engines
        sem = asyncio.Semaphore(10)

        async def fetch_engines(q: str):
            async with sem:
                return await query_runner.run_all_engines(q)

        # 1. Fetch all AI responses concurrently
        fetch_tasks = [fetch_engines(q) for q in queries]
        all_engine_responses = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        # 2. Parse all AI responses concurrently
        parse_tasks = []
        for i, q in enumerate(queries):
            responses = all_engine_responses[i]
            if isinstance(responses, Exception):
                logger.error(f"Error fetching engines for query '{q}': {responses}")
                continue

            for engine_name, raw_resp in responses.items():
                if raw_resp is not None:
                    async def parse_response(query_str=q, eng=engine_name, resp=raw_resp):
                        async with sem:
                            return await process_single_query(client, query_str, eng, resp)
                    parse_tasks.append(parse_response())

        parsed_results = await asyncio.gather(*parse_tasks, return_exceptions=True)

        run_dicts = []
        for res in parsed_results:
            if isinstance(res, Exception):
                logger.error(f"Error parsing response: {res}")
            elif res:
                run_dicts.append(res)

        # 3. Batch insert into Google Sheets
        if run_dicts:
            run_ops.insert_query_runs_batch(run_dicts)

        total_queries = len(run_dicts)

        # Mention Rate: brand name appears anywhere in the AI response body
        mentioned_runs = [r for r in run_dicts if str(r.get("brand_mentioned")).lower() == "true"]
        mention_count = len(mentioned_runs)
        mention_rate = round((mention_count / total_queries * 100), 1) if total_queries > 0 else 0.0

        # Source Citation Rate: brand appears as a URL/source link in the response
        source_cited_runs = [r for r in run_dicts if str(r.get("brand_cited_as_source")).lower() == "true"]
        source_citation_count = len(source_cited_runs)
        source_citation_rate = round((source_citation_count / total_queries * 100), 1) if total_queries > 0 else 0.0

        # Citation rate (legacy combined metric) = mention rate for backwards compat
        cited_count = mention_count
        citation_rate = mention_rate

        cited_query_texts = set(r["query"] for r in mentioned_runs)
        not_cited_queries = list(set(r["query"] for r in run_dicts if r["query"] not in cited_query_texts))

        all_comps = []
        all_sources = []
        for r in run_dicts:
            all_comps.extend(r.get("competitors_mentioned", []))
            all_sources.extend(r.get("source_urls", []))

        top_competitors = list(set(all_comps))[:5]
        new_sources = list(set(all_sources))[:5]

        # Fetch yesterday's rate from daily summaries
        past_summaries = run_ops.get_daily_summaries(client_id, 1)
        yesterday_rate = citation_rate
        if past_summaries and len(past_summaries) > 0:
            try:
                yesterday_rate = float(past_summaries[0].get("citation_rate", citation_rate))
            except (ValueError, TypeError):
                yesterday_rate = citation_rate

        summary_text = await summarizer.generate_daily_summary(
            brand_name=brand_name,
            run_date=today_str,
            total_queries=total_queries,
            cited_count=cited_count,
            citation_rate=citation_rate,
            yesterday_rate=yesterday_rate,
            not_cited_queries=not_cited_queries,
            top_competitors=top_competitors,
            new_sources=new_sources
        )

        comp_counts = {}
        for c in all_comps:
            comp_counts[c] = comp_counts.get(c, 0) + 1

        summary_data = {
            "client_id": client_id,
            "summary_date": today_str,
            "total_queries": total_queries,
            "cited_count": cited_count,
            "citation_rate": citation_rate,
            "mention_count": mention_count,
            "mention_rate": mention_rate,
            "source_citation_count": source_citation_count,
            "source_citation_rate": source_citation_rate,
            "not_cited_queries": not_cited_queries,
            "competitor_citation_counts": comp_counts,
            "summary_text": summary_text
        }

        run_ops.upsert_daily_summary(client_id, today_str, summary_data)
        return summary_data
    except Exception as e:
        logger.error(f"Error processing client '{client_id}': {e}")
        return {"client_id": client_id, "status": "failed", "error": str(e)}

# 3. run_daily_job
async def run_daily_job():
    """
    Sequentially processes all active clients with a 2-second rate-limiting delay between each.
    Logs start time, end time, and prints overall processing results.
    """
    start_time = datetime.now(timezone.utc)
    logger.info(f"[run_daily_job] Starting daily citation job at {start_time}")
    clients = client_ops.get_all_active_clients()

    succeeded = 0
    failed = 0

    for idx, client in enumerate(clients):
        client_id = client.get("id")
        logger.info(f"[run_daily_job] Processing client {idx+1}/{len(clients)}: ID {client_id}")
        res = await process_client(client)
        if res.get("status") == "failed":
            failed += 1
        else:
            succeeded += 1

        if idx < len(clients) - 1:
            await asyncio.sleep(2)

    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()
    print(f"[run_daily_job] Finished at {end_time} (duration: {duration:.2f}s). Total clients processed: {len(clients)}, Succeeded: {succeeded}, Failed: {failed}")

# 4. FastAPI routes
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/run-now")
async def trigger_run_now():
    await run_daily_job()
    return {"message": "Daily job completed successfully"}

@app.get("/clients")
def list_clients():
    client_ops._clients_cache = None
    client_ops._clients_cache_time = None
    clients = client_ops.get_all_active_clients()
    print(f"[list_clients] returning {len(clients)} clients")
    return clients

class ClientCreate(BaseModel):
    name: str
    brand_name: str
    brand_aliases: List[str]
    competitors: List[str]
    queries: List[str]
    domain: Optional[str] = ""
    industry: Optional[str] = ""

@app.post("/clients")
def add_client(client: ClientCreate):
    # Clear client cache to make sure the new client is visible immediately
    client_ops._clients_cache = None
    client_ops._clients_cache_time = None
    
    new_client = client_ops.create_client(client.dict())
    if not new_client:
        raise HTTPException(status_code=500, detail="Failed to write new client to Google Sheets")
    return new_client

@app.delete("/clients/{client_id}")
def delete_client(client_id: str):
    success = client_ops.delete_client(client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found or failed to delete")
    return {"success": True, "message": f"Client {client_id} successfully deleted"}


class SuggestQueriesRequest(BaseModel):
    brand_name: str
    brand_aliases: List[str]
    competitors: List[str]

def suggest_queries_fallback(brand_name: str, competitors: List[str]) -> List[str]:
    comp1 = competitors[0] if len(competitors) > 0 else "competitors"
    comp2 = competitors[1] if len(competitors) > 1 else "other alternatives"
    
    return [
        f"best alternative to {comp1} for scaling teams",
        f"top-rated {brand_name} features for enterprise collaboration",
        f"{brand_name} vs {comp1} comparison 2026",
        f"how does {brand_name} compare to {comp2} for productivity",
        f"best software for workflow automation in 2026",
        f"is {brand_name} secure and compliant for corporate data"
    ]

@app.post("/clients/suggest-queries")
async def suggest_queries(req: SuggestQueriesRequest):
    import json
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.info("[suggest-queries] GEMINI_API_KEY not found. Using programmatic fallback.")
        return {"queries": suggest_queries_fallback(req.brand_name, req.competitors)}
    
    prompt = f"""
You are an AI SEO and Answer Engine Optimization (AEO) strategist.
Your task is to identify the most critical search prompts that a potential buyer would type into an AI search engine (such as ChatGPT, Claude, Perplexity) when looking for solutions in this industry, comparing competitors, or looking for details about the brand: '{req.brand_name}'.

Brand Name: {req.brand_name}
Brand Aliases: {", ".join(req.brand_aliases)}
Competitors: {", ".join(req.competitors)}

Generate exactly 6 distinct, realistic, high-impact search queries. Break them down into:
- 2 Buying Intent / Commercial queries (e.g. "best note taking app for startups", "top tool for team design collaboration")
- 2 Competitor Comparison queries (e.g. "{req.brand_name} vs {req.competitors[0] if req.competitors else 'competitors'}")
- 2 Informational / Feature-specific queries (e.g. "which software has the best Kanban board for agile developer workflows?")

Return only a valid JSON array of strings containing the 6 queries. Do not include markdown code blocks, backticks, explanatory text, or any formatting other than the JSON array itself.
Example output format:
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]
"""
    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = text.replace("```json", "").replace("```", "").strip()
                
                queries = json.loads(text)
                if isinstance(queries, list) and len(queries) > 0:
                    return {"queries": [str(q) for q in queries]}
            
            logger.error(f"[suggest-queries] Gemini error status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"[suggest-queries] Exception generating queries: {e}")
    
    return {"queries": suggest_queries_fallback(req.brand_name, req.competitors)}


@app.get("/clients/{client_id}/summary")
def get_client_summaries(client_id: str):
    return run_ops.get_daily_summaries(client_id, 30)

@app.get("/clients/{client_id}/runs/{date}")
def get_client_runs_by_date(client_id: str, date: str):
    return run_ops.get_query_runs_by_date(client_id, date)

@app.get("/clients/{client_id}/prompts")
def get_client_prompts(client_id: str):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    runs = run_ops.get_query_runs_by_date(client_id, today)
    
    unique_prompts = {}
    for r in runs:
        q = r.get("query")
        if q not in unique_prompts:
            unique_prompts[q] = r
            
    return [{"query": p.get("query"), "reasoning": p.get("reasoning"), "brand_description": p.get("brand_description")} for p in unique_prompts.values()]

class RecommendationRequest(BaseModel):
    brand_name: str
    uncited_queries: List[str]
    top_competitors: List[str]

@app.post("/clients/{client_id}/recommendations")
async def get_recommendations(client_id: str, req: RecommendationRequest):
    recs = await summarizer.generate_recommendations(req.brand_name, req.uncited_queries, req.top_competitors)
    return {"recommendations": recs}

@app.post("/clients/{client_id}/actions")
async def get_actions(client_id: str):
    return {
        "actions": [
            {
                "id": "action-1",
                "title": "Update LinkedIn profile",
                "description": "Ensure your company LinkedIn profile mentions key industry terms that AI models frequently scrape for authority signals."
            },
            {
                "id": "action-2",
                "title": "Publish blog post about X",
                "description": "Write a definitive guide on your core product category to increase the likelihood of being cited as a primary source."
            },
            {
                "id": "action-3",
                "title": "Optimize pricing page",
                "description": "Restructure your pricing page tables using semantic HTML so AI crawlers can easily parse feature comparisons against competitors."
            }
        ]
    }
from backend.services import dataforseo

@app.get("/clients/{client_id}/google-ai-overview")
async def get_google_ai_overview(client_id: str):
    """Returns AI Overview presence data for each tracked query."""
    clients = client_ops.get_all_active_clients()
    client = next((c for c in clients if str(c.get("id")) == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    queries = client.get("queries", [])
    brand_name = client.get("brand_name") or client.get("name", "")
    brand_aliases = client.get("brand_aliases", [])
    competitors = client.get("competitors", [])

    results = await dataforseo.fetch_serp_ai_overview(
        queries=queries,
        brand_name=brand_name,
        brand_aliases=brand_aliases,
        competitors=competitors
    )
    return {"client_id": client_id, "brand_name": brand_name, "results": results}

@app.get("/clients/{client_id}/organic-rankings")
async def get_organic_rankings(client_id: str):
    """Returns organic ranking positions for each tracked query."""
    clients = client_ops.get_all_active_clients()
    client = next((c for c in clients if str(c.get("id")) == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    queries = client.get("queries", [])
    brand_name = client.get("brand_name") or client.get("name", "")
    brand_aliases = client.get("brand_aliases", [])
    competitors = client.get("competitors", [])

    results = await dataforseo.fetch_organic_rankings(
        queries=queries,
        brand_name=brand_name,
        brand_aliases=brand_aliases,
        competitors=competitors
    )
    return {"client_id": client_id, "brand_name": brand_name, "results": results}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
