import os
import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Header, HTTPException, status, BackgroundTasks
import uvicorn

from backend.services import query_runner, claude_parser, summarizer
from backend.sheets import client_ops, run_ops

logger = logging.getLogger("citation_tracker")

app = FastAPI(
    title="AI Citation Tracker API",
    description="Orchestrator service for daily AI engine citation monitoring using Google Sheets storage.",
    version="1.0.0"
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

    today_str = datetime.now().strftime("%Y-%m-%d")

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
    today_str = datetime.now().strftime("%Y-%m-%d")

    try:
        run_dicts = []
        for q in queries:
            engine_responses = await query_runner.run_all_engines(q)
            for engine_name, raw_resp in engine_responses.items():
                if raw_resp is not None:
                    single_dict = await process_single_query(client, q, engine_name, raw_resp)
                    run_ops.insert_query_run(single_dict)
                    run_dicts.append(single_dict)

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
    start_time = datetime.now()
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

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    print(f"[run_daily_job] Finished at {end_time} (duration: {duration:.2f}s). Total clients processed: {len(clients)}, Succeeded: {succeeded}, Failed: {failed}")

# 4. FastAPI routes
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/run-now")
async def trigger_run_now(background_tasks: BackgroundTasks, x_cron_secret: Optional[str] = Header(None, alias="x-cron-secret")):
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret and x_cron_secret != cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid CRON_SECRET header")
    background_tasks.add_task(run_daily_job)
    return {"message": "Daily job triggered in background"}

@app.get("/clients")
def list_clients():
    return client_ops.get_all_active_clients()

@app.get("/clients/{client_id}/summary")
def get_client_summaries(client_id: str):
    return run_ops.get_daily_summaries(client_id, 30)

@app.get("/clients/{client_id}/runs/{date}")
def get_client_runs_by_date(client_id: str, date: str):
    return run_ops.get_query_runs_by_date(client_id, date)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
