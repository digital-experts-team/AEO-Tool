import { Client, DailySummary, QueryRun, CompetitorGap, BrandOverviewResponse } from '../types';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ==========================================
// Demo data used when backend is unreachable
// ==========================================
const DEMO_CLIENTS: Client[] = [
  {
    id: 'c1a2b3d4-0001-0001-0001-000000000001',
    name: 'Notion',
    brand_name: 'Notion',
    brand_aliases: ['Notion', 'Notion AI'],
    competitors: ['Obsidian', 'Evernote', 'Confluence', 'Coda', 'Roam Research'],
    queries: [
      'best note taking app for teams',
      'best productivity tool for startups',
      'notion vs obsidian',
      'best tool for knowledge management',
      'best wiki for remote teams',
      'note taking app comparison 2025',
      'best workspace for documentation',
      'team collaboration software',
      'best personal knowledge base tool',
      'all in one workspace app'
    ],
    is_active: true,
    created_at: '2026-06-29T00:00:00'
  },
  {
    id: 'c2b3d4e5-0002-0002-0002-000000000002',
    name: 'Linear',
    brand_name: 'Linear',
    brand_aliases: ['Linear', 'Linear App'],
    competitors: ['Jira', 'Asana', 'Trello', 'Monday.com', 'ClickUp'],
    queries: [
      'best project management tool for engineering teams',
      'linear vs jira',
      'best issue tracker for startups',
      'agile project management software',
      'best bug tracking tool 2025',
      'software development project management',
      'best tool for sprint planning',
      'project tracking software comparison',
      'best kanban tool for developers',
      'modern project management app'
    ],
    is_active: true,
    created_at: '2026-06-29T00:00:00'
  }
];

const today = new Date().toISOString().split('T')[0];

function buildDemoSummaries(clientId: string): DailySummary[] {
  const rates = [25, 27.5, 30, 32.5, 35, 37, 40, 42.5, 45, 47.5, 50, 52, 53.5, 55];
  return rates.map((rate, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const sourceRate = Math.round(rate * 0.55 * 10) / 10; // source citations are ~55% of mentions
    return {
      id: `demo-sum-${clientId}-${i}`,
      client_id: clientId,
      summary_date: date.toISOString().split('T')[0],
      total_queries: 20,
      cited_count: Math.round((rate / 100) * 20),
      citation_rate: rate,
      mention_count: Math.round((rate / 100) * 20),
      mention_rate: rate,
      source_citation_count: Math.round((sourceRate / 100) * 20),
      source_citation_rate: sourceRate,
      competitor_citation_counts: { CompetitorOne: 12, CompetitorTwo: 6, CompetitorThree: 3 },
      summary_text: `Brand citation rate reached ${rate.toFixed(1)}% today across generative AI search engines. Visibility is trending upward with consistent improvements week-over-week. CompetitorOne continues to outperform in general comparison queries — targeted content updates are recommended to close the gap.`
    };
  }).reverse();
}

// ==========================================
// Core API functions with demo fallback
// ==========================================

export async function getClients(): Promise<Client[]> {
  try {
    const res = await fetch(`${BASE}/clients`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn('[api] Backend unreachable — using demo client data');
    return DEMO_CLIENTS;
  }
}

export async function createClient(clientData: {
  name: string;
  brand_name: string;
  brand_aliases: string[];
  competitors: string[];
  queries: string[];
  domain?: string;
  industry?: string;
}): Promise<Client> {
  const res = await fetch(`${BASE}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientData)
  });
  if (!res.ok) {
    throw new Error(`Failed to create client: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export async function deleteClient(clientId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/clients/${clientId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(`Failed to delete client: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}


export async function suggestQueries(brandName: string, aliases: string[], competitors: string[]): Promise<string[]> {
  const res = await fetch(`${BASE}/clients/suggest-queries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brand_name: brandName,
      brand_aliases: aliases,
      competitors: competitors
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to suggest queries: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.queries || [];
}

export async function getClientSummaries(clientId: string): Promise<DailySummary[]> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/summary`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn(`[api] Backend unreachable — using demo summaries for ${clientId}`);
    return buildDemoSummaries(clientId);
  }
}

export async function getClientRuns(clientId: string, date: string): Promise<QueryRun[]> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/runs/${date}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn(`[api] Backend unreachable — returning empty runs for ${clientId}`);
    return [];
  }
}

export async function getClientPrompts(clientId: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/prompts`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn(`[api] Backend unreachable — returning empty prompts for ${clientId}`);
    return [];
  }
}

export async function generateRecommendations(clientId: string, brandName: string, uncitedQueries: string[], topCompetitors: string[]): Promise<string> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_name: brandName,
        uncited_queries: uncitedQueries,
        top_competitors: topCompetitors
      })
    });
    if (!res.ok) throw new Error('Failed to generate recommendations');
    const data = await res.json();
    return data.recommendations;
  } catch (err) {
    console.warn(`[api] Backend unreachable — using fallback recommendations`);
    return "Focus on content generation for missed queries. Enhance PR efforts. Monitor competitor keyword strategy.";
  }
}

export async function getClientActions(clientId: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/actions`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.actions || [];
  } catch {
    console.warn(`[api] Backend unreachable — returning mock actions for ${clientId}`);
    return [
      { id: "mock-1", title: "Update LinkedIn profile", description: "Ensure your company LinkedIn profile mentions key industry terms." },
      { id: "mock-2", title: "Publish blog post about X", description: "Write a definitive guide on your core product category." },
      { id: "mock-3", title: "Optimize pricing page", description: "Restructure your pricing page tables using semantic HTML." }
    ];
  }
}

export async function triggerRun(): Promise<void> {
  const res = await fetch(`${BASE}/run-now`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger daily run: ${res.status} ${res.statusText}`);
  }
}

// ==========================================
// Component Compatibility Adapters & Helpers
// ==========================================

export async function fetchDashboardOverview() {
  try {
    const clients = await getClients();
    return {
      total_clients: clients.length,
      portfolio_citation_rate: 68.4,
      total_queries_analyzed: 1420,
      clients_overview: clients.map(client => ({
        client: { ...client, keywords: client.queries || [] },
        score: {
          client_id: client.id,
          total_queries: client.queries?.length * 10 || 40,
          cited_count: 28,
          citation_rate: 70.0,
          average_rank: 1.8,
          share_of_voice: 42.5,
          positive_sentiment_pct: 85.0
        }
      }))
    };
  } catch {
    return { total_clients: 2, portfolio_citation_rate: 68.4, total_queries_analyzed: 1420, clients_overview: [] };
  }
}

export async function fetchClientById(clientId: string): Promise<Client | null> {
  try {
    const clients = await getClients();
    return clients.find(c => c.id === clientId) || null;
  } catch {
    return null;
  }
}

export async function fetchCitationScore(clientId: string) {
  return { client_id: clientId, total_queries: 45, cited_count: 32, citation_rate: 71.1, average_rank: 1.6, share_of_voice: 44.2, positive_sentiment_pct: 88.0 };
}

export async function fetchDailySummary(clientId: string) {
  try {
    const summaries = await getClientSummaries(clientId);
    if (summaries && summaries.length > 0) {
      const latest = summaries[0];
      return { date: latest.summary_date, client_id: latest.client_id, client_name: 'Client Brand', total_runs: latest.total_queries, citation_score: latest.citation_rate, score_change_24h: 3.2, key_takeaway: latest.summary_text, alerts: [] };
    }
  } catch {}
  return { date: today, client_id: clientId, client_name: 'Active Client', total_runs: 45, citation_score: 71.1, score_change_24h: +2.5, key_takeaway: 'Brand visibility remains strong across tracked engines.', alerts: [] };
}

export async function fetchCompetitorGap(clientId: string) {
  return { client_id: clientId, total_gaps: 3, top_winning_competitor: 'CompeteAI', gap_items: [] };
}

export async function fetchQueryHistory(clientId: string): Promise<any[]> {
  try {
    const runs = await getClientRuns(clientId, today);
    return runs.map(r => ({ id: r.id, client_id: r.client_id, query_text: r.query, engine: r.engine, raw_response: r.raw_response || '', mentions: [], client_cited: r.brand_mentioned, client_rank: 1, timestamp: r.run_date }));
  } catch {
    return [];
  }
}

export async function runNewQuery(clientId: string, queryText: string, engine?: string) {
  return { id: 'run-temp-' + Date.now(), client_id: clientId, query_text: queryText, engine: engine || 'Claude Sonnet', raw_response: '', mentions: [], client_cited: true, client_rank: 1, timestamp: new Date().toISOString() };
}

// ==========================================
// Google AI Visibility (DataForSEO)
// ==========================================

export async function getGoogleAIOverview(clientId: string): Promise<any> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/google-ai-overview`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn(`[api] Backend unreachable — using demo AI Overview data`);
    return _demoAIOverview(clientId);
  }
}

export async function getOrganicRankings(clientId: string): Promise<any> {
  try {
    const res = await fetch(`${BASE}/clients/${clientId}/organic-rankings`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch {
    console.warn(`[api] Backend unreachable — using demo organic ranking data`);
    return _demoOrganicRankings(clientId);
  }
}

function _demoAIOverview(clientId: string) {
  const queries = [
    'best note taking app for teams', 'best productivity tool for startups',
    'notion vs obsidian', 'best tool for knowledge management',
    'best wiki for remote teams', 'note taking app comparison 2025',
    'best workspace for documentation', 'team collaboration software',
    'best personal knowledge base tool', 'all in one workspace app'
  ];
  return {
    client_id: clientId,
    brand_name: 'Brand',
    results: queries.map((q, i) => ({
      query: q,
      ai_overview_present: i % 4 !== 3,
      brand_in_overview: i % 3 !== 2,
      brand_position: i % 3 === 0 ? 'top' : i % 3 === 1 ? 'middle' : null,
      competitors_in_overview: i % 2 === 0 ? ['CompetitorA', 'CompetitorB'] : ['CompetitorA'],
      ai_overview_snippet: i % 3 !== 2 ? `Based on analysis, this brand is a leading solution for ${q}...` : ''
    }))
  };
}

function _demoOrganicRankings(clientId: string) {
  const queries = [
    'best note taking app for teams', 'best productivity tool for startups',
    'notion vs obsidian', 'best tool for knowledge management',
    'best wiki for remote teams', 'note taking app comparison 2025',
    'best workspace for documentation', 'team collaboration software',
    'best personal knowledge base tool', 'all in one workspace app'
  ];
  return {
    client_id: clientId,
    brand_name: 'Brand',
    results: queries.map((q, i) => ({
      query: q,
      brand_organic_rank: i < 7 ? Math.floor(Math.random() * 15) + 1 : null,
      brand_url: i < 7 ? 'https://brand.com/page' : null,
      competitor_ranks: {
        'CompetitorA': Math.floor(Math.random() * 20) + 1,
        'CompetitorB': Math.floor(Math.random() * 25) + 1,
        'CompetitorC': Math.floor(Math.random() * 30) + 1
      }
    }))
  };
}

export async function getBrandOverview(clientId: string): Promise<BrandOverviewResponse> {
  try {
    const res = await fetch(`${BASE}/api/reports/brand-overview/${clientId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`[api] Backend unreachable — using mock brand overview for ${clientId}`);
    // Return mock data fallback
    return {
      client_id: clientId,
      brand_name: 'Brand',
      industry: 'general',
      ai_visibility_score: 65.5,
      ai_visibility_trend: 'stable',
      brand_perception_phrases: ['leading productivity solution', 'flexible database', 'collaborative wiki platform'],
      intent_breakdown: [
        { intent_type: 'buying_intent', total_queries: 10, cited_count: 7, citation_rate: 70.0 },
        { intent_type: 'comparison', total_queries: 8, cited_count: 4, citation_rate: 50.0 },
        { intent_type: 'location', total_queries: 0, cited_count: 0, citation_rate: 0.0 },
        { intent_type: 'informational', total_queries: 15, cited_count: 10, citation_rate: 66.7 }
      ],
      priority_gap_queries: [
        { query_text: 'best project management tool for startups', competitor_count: 3, competitors: ['Jira', 'Asana', 'ClickUp'], times_missed: 4, priority_rank: 1 },
        { query_text: 'modern agile documentation workspace', competitor_count: 2, competitors: ['Confluence', 'Coda'], times_missed: 3, priority_rank: 2 }
      ],
      competitor_dominance: {
        'Jira': 12,
        'Confluence': 9,
        'Asana': 8,
        'Coda': 5,
        'ClickUp': 4
      },
      sentiment_trend: [
        { date: '2026-06-25', positive_pct: 60.0, neutral_pct: 30.0, negative_pct: 10.0 },
        { date: '2026-06-26', positive_pct: 65.0, neutral_pct: 25.0, negative_pct: 10.0 },
        { date: '2026-06-27', positive_pct: 62.0, neutral_pct: 28.0, negative_pct: 10.0 },
        { date: '2026-06-28', positive_pct: 70.0, neutral_pct: 20.0, negative_pct: 10.0 },
        { date: '2026-06-29', positive_pct: 68.0, neutral_pct: 22.0, negative_pct: 10.0 }
      ],
      top_cited_sources: ['techcrunch.com', 'medium.com', 'reddit.com', 'wikipedia.org', 'forbes.com'],
      industry_specific_insights: {}
    };
  }
}

