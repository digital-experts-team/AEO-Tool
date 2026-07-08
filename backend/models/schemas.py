from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

class ClientBase(BaseModel):
    name: str = Field(..., description="Name of the client brand")
    domain: str = Field(..., description="Primary website domain")
    industry: str = Field(..., description="Industry or niche")
    keywords: List[str] = Field(default_factory=list, description="Target search prompts/keywords")
    competitors: List[str] = Field(default_factory=list, description="List of direct competitor names/domains")

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"

class CitationMention(BaseModel):
    brand_name: str
    is_client: bool
    mentioned: bool
    position_rank: Optional[int] = None
    sentiment: str = "neutral" # positive, neutral, negative
    citation_url: Optional[str] = None
    context_snippet: Optional[str] = None

class QueryRunRequest(BaseModel):
    client_id: str
    query_text: str
    engine: str = "claude-3-5-sonnet" # e.g., claude-3-5-sonnet, gpt-4o, perplexity

class QueryResult(BaseModel):
    id: str
    client_id: str
    query_text: str
    engine: str
    raw_response: str
    mentions: List[CitationMention]
    client_cited: bool
    client_rank: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CitationScoreData(BaseModel):
    client_id: str
    total_queries: int
    cited_count: int
    citation_rate: float # Percentage e.g. 75.5
    average_rank: float
    share_of_voice: float # Percentage compared to competitors
    positive_sentiment_pct: float

class CompetitorGapItem(BaseModel):
    query_text: str
    client_cited: bool
    competitors_cited: List[str]
    opportunity_score: int # 1 to 10 scale
    recommended_action: str

class CompetitorGapAnalysis(BaseModel):
    client_id: str
    total_gaps: int
    gap_items: List[CompetitorGapItem]
    top_winning_competitor: str

class DailySummaryData(BaseModel):
    date: str
    client_id: str
    client_name: str
    total_runs: int
    citation_score: float
    score_change_24h: float
    key_takeaway: str
    alerts: List[str]

class IntentGroup(BaseModel):
    intent_type: str
    total_queries: int
    cited_count: int
    citation_rate: float

class PriorityGapQuery(BaseModel):
    query_text: str
    competitor_count: int
    competitors: List[str]
    times_missed: int
    priority_rank: int

class BrandOverviewResponse(BaseModel):
    client_id: str
    brand_name: str
    industry: str
    ai_visibility_score: float
    ai_visibility_trend: str
    brand_perception_phrases: List[str]
    intent_breakdown: List[IntentGroup]
    priority_gap_queries: List[PriorityGapQuery]
    competitor_dominance: Dict[str, int]
    sentiment_trend: List[Dict[str, Any]]
    top_cited_sources: List[str]
    industry_specific_insights: Dict[str, Any]

class BotAccessStatus(BaseModel):
    user_agent: str
    display_name: str
    status: str  # allowed | blocked | partial | not_specified
    impact: str

class TechnicalAuditResponse(BaseModel):
    client_id: str
    domain: str
    ai_readiness_score: int  # 0-100 calculated from checks
    robots_txt_exists: bool
    bot_access: List[BotAccessStatus]
    llms_txt_exists: bool
    llms_txt_content: Optional[str]
    sitemap_exists: bool
    sitemap_page_count: Optional[int]
    schema_types_found: List[str]
    schema_types_missing: List[str]
    critical_issues: List[str]  # list of high-priority problems found
    pagespeed: Optional[Dict[str, Any]] = None  # Google PageSpeed Insights data

