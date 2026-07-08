export interface IntentGroup {
  intent_type: 'buying_intent' | 'comparison' | 'location' | 'informational'
  total_queries: number
  cited_count: number
  citation_rate: number
}

export interface PriorityGapQuery {
  query_text: string
  competitor_count: number
  competitors: string[]
  times_missed: number
  priority_rank: number
}

export interface BrandOverviewResponse {
  client_id: string
  brand_name: string
  industry: string
  ai_visibility_score: number
  ai_visibility_trend: 'up' | 'down' | 'stable'
  brand_perception_phrases: string[]
  intent_breakdown: IntentGroup[]
  priority_gap_queries: PriorityGapQuery[]
  competitor_dominance: Record<string, number>
  sentiment_trend: Array<{
    date: string
    positive_pct: number
    neutral_pct: number
    negative_pct: number
  }>
  top_cited_sources: string[]
  industry_specific_insights: Record<string, any>
}
