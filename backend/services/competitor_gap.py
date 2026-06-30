from typing import List
from collections import Counter
from backend.models.schemas import CompetitorGapAnalysis, CompetitorGapItem
from backend.sheets.client_ops import get_client_by_id
from backend.sheets.run_ops import get_query_runs

class CompetitorGapService:
    """
    Analyzes queries where competitors are cited but the client is omitted,
    providing actionable optimization recommendations.
    """
    
    @staticmethod
    def analyze_gaps(client_id: str) -> CompetitorGapAnalysis:
        client = get_client_by_id(client_id)
        runs = get_query_runs(client_id)
        
        gap_items: List[CompetitorGapItem] = []
        winning_competitors = []
        
        for r in runs:
            competitors_cited = [m.brand_name for m in r.mentions if not m.is_client and m.mentioned]
            winning_competitors.extend(competitors_cited)
            
            if not r.client_cited and competitors_cited:
                opportunity_score = 9 if len(competitors_cited) >= 2 else 7
                gap_items.append(CompetitorGapItem(
                    query_text=r.query_text,
                    client_cited=False,
                    competitors_cited=competitors_cited,
                    opportunity_score=opportunity_score,
                    recommended_action=f"Publish dedicated comparison landing page targeting '{r.query_text}' highlighting key features vs {', '.join(competitors_cited)}."
                ))
            elif r.client_cited and r.client_rank and r.client_rank > 1:
                top_competitor = competitors_cited[0] if competitors_cited else "competitors"
                gap_items.append(CompetitorGapItem(
                    query_text=r.query_text,
                    client_cited=True,
                    competitors_cited=competitors_cited,
                    opportunity_score=5,
                    recommended_action=f"Optimize technical docs and authoritative backlinks to capture #1 rank over {top_competitor}."
                ))
                
        top_winner = Counter(winning_competitors).most_common(1)
        top_winning_competitor = top_winner[0][0] if top_winner else "N/A"
        
        return CompetitorGapAnalysis(
            client_id=client_id,
            total_gaps=len(gap_items),
            gap_items=gap_items,
            top_winning_competitor=top_winning_competitor
        )
