from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

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
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
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
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

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
