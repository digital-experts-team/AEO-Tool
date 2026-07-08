export interface Client {
  id: string;
  name: string;
  brand_name: string;
  brand_aliases: string[];
  competitors: string[];
  queries: string[];
  is_active: boolean;
  created_at: string;
  domain?: string;
  industry?: string;
  keywords?: string[];
}

export interface QueryRun {
  id: string;
  client_id: string;
  run_date: string;
  query: string;
  engine: string;
  raw_response?: string;
  brand_mentioned: boolean;
  brand_cited_as_source?: boolean;
  brand_source_urls?: string[];
  brand_sentiment: 'positive' | 'neutral' | 'negative' | 'not_mentioned';
  brand_description: string | null;
  brand_position: string;
  competitors_mentioned: string[];
  source_urls: string[];
  citation_score: number;
  reasoning: string;
}

export interface DailySummary {
  id: string;
  client_id: string;
  summary_date: string;
  total_queries: number;
  cited_count: number;
  citation_rate: number;
  mention_count?: number;
  mention_rate?: number;
  source_citation_count?: number;
  source_citation_rate?: number;
  competitor_citation_counts: Record<string, number>;
  summary_text: string;
}

export interface CompetitorGap {
  competitor_name: string;
  client_rate: number;
  competitor_rate: number;
  gap_size: number;
  gap_severity: 'critical' | 'significant' | 'moderate' | 'minor';
  top_priority_action: string;
  content_opportunities: string[];
}

// Additional interfaces for dashboard UI component compatibility
export interface CitationMention {
  brand_name: string;
  is_client: boolean;
  mentioned: boolean;
  position_rank?: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  citation_url?: string | null;
  context_snippet?: string | null;
}

export interface QueryResult {
  id: string;
  client_id: string;
  query_text: string;
  engine: string;
  raw_response: string;
  mentions: CitationMention[];
  client_cited: boolean;
  client_rank?: number | null;
  timestamp: string;
}

export interface CitationScoreData {
  client_id: string;
  total_queries: number;
  cited_count: number;
  citation_rate: number;
  average_rank: number;
  share_of_voice: number;
  positive_sentiment_pct: number;
}

export interface CompetitorGapItem {
  query_text: string;
  client_cited: boolean;
  competitors_cited: string[];
  opportunity_score: number;
  recommended_action: string;
}

export interface CompetitorGapAnalysis {
  client_id: string;
  total_gaps: number;
  gap_items: CompetitorGapItem[];
  top_winning_competitor: string;
}

export interface DailySummaryData {
  date: string;
  client_id: string;
  client_name: string;
  total_runs: number;
  citation_score: number;
  score_change_24h: number;
  key_takeaway: string;
  alerts: string[];
}

export interface DashboardOverview {
  total_clients: number;
  portfolio_citation_rate: number;
  total_queries_analyzed: number;
  clients_overview: {
    client: Client;
    score: CitationScoreData;
  }[];
}

export * from './brandOverview';

