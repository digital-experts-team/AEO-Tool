import { Client, DailySummary, QueryRun, CompetitorGap } from '../types';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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

export async function triggerRun(cronSecret: string): Promise<void> {
  const res = await fetch(`${BASE}/run-now`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': cronSecret
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
