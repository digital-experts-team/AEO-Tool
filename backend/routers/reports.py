from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.models.schemas import CitationScoreData, CompetitorGapAnalysis, DailySummaryData, BrandOverviewResponse
from backend.services.competitor_gap import CompetitorGapService
from backend.sheets.client_ops import get_all_active_clients, get_client_by_id
from backend.sheets.run_ops import get_query_runs, get_daily_summaries
from backend.services import brand_overview as bo

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/score/{client_id}", response_model=CitationScoreData)
def get_score(client_id: str):
    runs = get_query_runs(client_id)
    total_queries = len(runs)
    cited_count = sum(1 for r in runs if str(r.get("brand_mentioned")).lower() == "true")
    citation_rate = round((cited_count / total_queries * 100), 1) if total_queries else 0.0
    return CitationScoreData(
        client_id=client_id,
        total_queries=total_queries,
        cited_count=cited_count,
        citation_rate=citation_rate,
        average_rank=0.0,
        share_of_voice=0.0,
        positive_sentiment_pct=0.0
    )

@router.get("/daily-summary/{client_id}", response_model=DailySummaryData)
def get_daily_summary(client_id: str):
    client = get_client_by_id(client_id)
    summaries = get_daily_summaries(client_id, 2)
    if not summaries:
        raise HTTPException(status_code=404, detail="Daily summary not found")

    latest = summaries[0]
    previous_rate = float(summaries[1].get("citation_rate", latest.get("citation_rate", 0))) if len(summaries) > 1 else float(latest.get("citation_rate", 0))
    latest_rate = float(latest.get("citation_rate", 0))
    return DailySummaryData(
        date=str(latest.get("summary_date", "")),
        client_id=client_id,
        client_name=str((client or {}).get("name", client_id)),
        total_runs=int(float(latest.get("total_queries", 0) or 0)),
        citation_score=latest_rate,
        score_change_24h=round(latest_rate - previous_rate, 1),
        key_takeaway=str(latest.get("summary_text", "")),
        alerts=[]
    )

@router.get("/competitor-gap/{client_id}", response_model=CompetitorGapAnalysis)
def get_competitor_gap(client_id: str):
    return CompetitorGapService.analyze_gaps(client_id)

@router.get("/dashboard-overview")
def get_dashboard_overview() -> Dict[str, Any]:
    clients = get_all_active_clients()
    overview_data = []
    
    total_tracked_queries = 0
    total_cited_queries = 0
    
    for client in clients:
        client_id = client.get("id")
        score = get_score(client_id)
        total_tracked_queries += score.total_queries
        total_cited_queries += score.cited_count
        overview_data.append({
            "client": client,
            "score": score
        })
        
    avg_portfolio_citation = round((total_cited_queries / total_tracked_queries * 100), 1) if total_tracked_queries > 0 else 0.0
    
    return {
        "total_clients": len(clients),
        "portfolio_citation_rate": avg_portfolio_citation,
        "total_queries_analyzed": total_tracked_queries,
        "clients_overview": overview_data
    }

@router.get("/brand-overview/{client_id}", response_model=BrandOverviewResponse)
async def get_brand_overview(client_id: str):
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    runs = get_query_runs(client_id)
    summaries = get_daily_summaries(client_id, 7)

    brand_name = str(client.get("brand_name") or client.get("name", ""))
    industry = str(client.get("industry", "general"))
    queries = client.get("queries", [])

    # Try GSC AEO injection
    aeo_insights = {"gsc_connected": False}
    try:
        from backend.routers.gsc import get_integration_record, get_valid_access_token
        from backend.services.gsc_client import get_aio_data
        rec = get_integration_record(client_id)
        if rec and rec.get("access_token"):
            token = await get_valid_access_token(rec)
            if token:
                site_url = rec.get("site_url", "")
                aeo_data = await get_aio_data(token, site_url, 30)
                aeo_insights = {
                    "gsc_connected": True,
                    "aeo_impressions": aeo_data.get("aio_impressions", 0),
                    "aeo_ctr": aeo_data.get("aio_ctr", 0.0),
                    "top_aio_queries": aeo_data.get("top_aio_queries", [])
                }
    except Exception as e:
        print(f"[reports] Error checking GSC connected status: {e}")

    insights = bo.calculate_industry_insights(runs, industry, queries)
    if isinstance(insights, dict):
        insights.update(aeo_insights)
    else:
        insights = aeo_insights

    return BrandOverviewResponse(
        client_id=client_id,
        brand_name=brand_name,
        industry=industry,
        ai_visibility_score=bo.calculate_ai_visibility_score(runs),
        ai_visibility_trend=bo.calculate_visibility_trend(summaries),
        brand_perception_phrases=bo.extract_perception_phrases(runs),
        intent_breakdown=bo.calculate_intent_breakdown(runs),
        priority_gap_queries=bo.calculate_priority_gap_queries(runs),
        competitor_dominance=bo.calculate_competitor_dominance(runs),
        sentiment_trend=bo.calculate_sentiment_trend(runs),
        top_cited_sources=bo.calculate_top_cited_sources(runs),
        industry_specific_insights=insights
    )

@router.get("/hallucination-check/{client_id}")
async def check_hallucinations(client_id: str):
    from backend.services import hallucination_detector
    
    client = get_client_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    product_description = str(client.get("product_description", ""))
    
    runs = get_query_runs(client_id)
    ai_descriptions = list(set([
        str(r.get("brand_description", "")).strip()
        for r in runs
        if r.get("brand_description") 
        and str(r.get("brand_description")).strip()
        and str(r.get("brand_description")).strip().lower() not in ("none", "null", "")
    ]))
    
    result = await hallucination_detector.detect_hallucinations(
        brand_name=str(client.get("brand_name", "")),
        product_description=product_description,
        ai_descriptions=ai_descriptions
    )
    return result

