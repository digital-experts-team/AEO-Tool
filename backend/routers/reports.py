from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.models.schemas import CitationScoreData, CompetitorGapAnalysis, DailySummaryData
from backend.services.summarizer import Summarizer
from backend.services.competitor_gap import CompetitorGapService
from backend.sheets.client_ops import get_all_clients

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/score/{client_id}", response_model=CitationScoreData)
def get_score(client_id: str):
    return Summarizer.get_citation_score(client_id)

@router.get("/daily-summary/{client_id}", response_model=DailySummaryData)
def get_daily_summary(client_id: str):
    return Summarizer.get_daily_summary(client_id)

@router.get("/competitor-gap/{client_id}", response_model=CompetitorGapAnalysis)
def get_competitor_gap(client_id: str):
    return CompetitorGapService.analyze_gaps(client_id)

@router.get("/dashboard-overview")
def get_dashboard_overview() -> Dict[str, Any]:
    clients = get_all_clients()
    overview_data = []
    
    total_tracked_queries = 0
    total_cited_queries = 0
    
    for client in clients:
        score = Summarizer.get_citation_score(client.id)
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
