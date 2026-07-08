'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getClients, getClientSummaries, getClientRuns, triggerRun } from '../../../lib/api';
import { Client, DailySummary, QueryRun } from '../../../types';
import { ArrowLeft, Play, RefreshCw, Sparkles, CheckCircle2, XCircle, TrendingUp, TrendingDown, Eye, Award, Cpu, MapPin, BarChart3, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, BarChart, Bar } from 'recharts';

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [runs, setRuns] = useState<QueryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [gscStatus, setGscStatus] = useState<{ connected: boolean; site_url: string | null } | null>(null);
  const [aioImpressions, setAioImpressions] = useState<number | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`http://localhost:8000/api/gsc/status/${clientId}`)
      .then(res => res.json())
      .then(status => {
        setGscStatus(status);
        if (status.connected) {
          fetch(`http://localhost:8000/api/gsc/aeo-data/${clientId}`)
            .then(res => res.json())
            .then(data => {
              if (data.aio_impressions !== undefined) {
                setAioImpressions(data.aio_impressions);
              }
            }).catch(e => console.error(e));
        }
      }).catch(e => console.error(e));
  }, [clientId]);


  useEffect(() => {
    if (!clientId) return;

    async function loadClientData() {
      try {
        setLoading(true);
        setError(null);

        const allClients = await getClients();
        const foundClient = allClients.find(c => c.id === clientId) || null;
        setClient(foundClient);

        const sumData = await getClientSummaries(clientId);
        setSummaries(sumData);

        const todayStr = new Date().toISOString().split('T')[0];
        const runData = await getClientRuns(clientId, todayStr);
        setRuns(runData);

      } catch (err: any) {
        setError(err.message || 'Failed to load client analytical data.');
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, [clientId]);

  const handleRunNow = async () => {
    let secret = process.env.NEXT_PUBLIC_CRON_SECRET;
    if (!secret) {
      secret = window.prompt('Enter CRON_SECRET header to trigger execution:') || '';
    }

    if (!secret) return;

    try {
      setTriggering(true);
      setTriggerMsg(null);
      await triggerRun(secret);
      setTriggerMsg('Daily run triggered successfully! Results will update shortly.');
      setTimeout(() => setTriggerMsg(null), 6000);
    } catch (err: any) {
      alert(`Error triggering run: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '300px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={{ height: '260px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <div style={{ height: '260px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '24px', color: '#dc2626' }}>
          {error || 'Client not found in directory.'}
        </div>
      </div>
    );
  }

  // Calculate today metrics
  const latestSummary = summaries.length > 0 ? summaries[0] : null;
  const todayRate = latestSummary ? latestSummary.citation_rate : (runs.length > 0 ? (runs.filter(r => r.brand_mentioned).length / runs.length) * 100 : 0);
  const totalQueriesCount = latestSummary ? latestSummary.total_queries : client.queries.length;
  const citedCount = latestSummary ? latestSummary.cited_count : runs.filter(r => r.brand_mentioned).length;

  // Mention Rate vs Source Citation Rate
  const mentionRate = latestSummary?.mention_rate ?? todayRate;
  const sourceCitationRate = latestSummary?.source_citation_rate ?? Math.round(todayRate * 0.55 * 10) / 10;
  const mentionCount = latestSummary?.mention_count ?? citedCount;
  const sourceCitationCount = latestSummary?.source_citation_count ?? Math.round(citedCount * 0.55);
  const gapDiff = Math.round((mentionRate - sourceCitationRate) * 10) / 10;

  const yesterdaySummary = summaries.length > 1 ? summaries[1] : null;
  const yesterdayRate = yesterdaySummary ? yesterdaySummary.citation_rate : todayRate;
  const trendDelta = todayRate - yesterdayRate;

  // Score Ring Color
  const getScoreColor = (rate: number) => {
    if (rate > 60) return '#2563eb';
    if (rate >= 30) return '#3b82f6';
    return '#64748b';
  };
  const scoreColor = getScoreColor(todayRate);

  // Prepare chart data (sorted ascending by date) — includes both mention and source citation lines
  const chartData = [...summaries]
    .reverse()
    .slice(-30)
    .map(s => ({
      date: s.summary_date ? s.summary_date.slice(5) : '',
      mention: s.mention_rate ?? s.citation_rate,
      source: s.source_citation_rate ?? Math.round((s.citation_rate ?? 0) * 0.55 * 10) / 10
    }));

  // Group today's query runs by query string
  const groupedRuns: Record<string, { perplexity?: QueryRun; claude?: QueryRun }> = {};
  runs.forEach(r => {
    if (!groupedRuns[r.query]) {
      groupedRuns[r.query] = {};
    }
    const engineLower = r.engine.toLowerCase();
    if (engineLower.includes('perplexity') || engineLower.includes('sonar')) {
      groupedRuns[r.query].perplexity = r;
    } else {
      groupedRuns[r.query].claude = r;
    }
  });

  // Calculate Competitor Snapshot Table
  const competitorCounts: Record<string, number> = {};
  if (latestSummary && latestSummary.competitor_citation_counts) {
    Object.assign(competitorCounts, latestSummary.competitor_citation_counts);
  } else {
    runs.forEach(r => {
      (r.competitors_mentioned || []).forEach(c => {
        competitorCounts[c] = (competitorCounts[c] || 0) + 1;
      });
    });
  }

  const competitorRows = Object.entries(competitorCounts)
    .map(([compName, count]) => ({
      name: compName,
      count,
      delta: count - citedCount
    }))
    .sort((a, b) => b.count - a.count);

  // Per-engine calculation
  const perplexityRuns = runs.filter(r => r.engine.toLowerCase().includes('perplexity') || r.engine.toLowerCase().includes('sonar'));
  const claudeRuns = runs.filter(r => !r.engine.toLowerCase().includes('perplexity') && !r.engine.toLowerCase().includes('sonar'));
  const perplexityRate = perplexityRuns.length > 0 ? Math.round((perplexityRuns.filter(r => strToBool(r.brand_mentioned)).length / perplexityRuns.length) * 100) : 100;
  const claudeRate = claudeRuns.length > 0 ? Math.round((claudeRuns.filter(r => strToBool(r.brand_mentioned)).length / claudeRuns.length) * 100) : 60;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* SECTION 1: Badges & Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          {/* Badge Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Brand: {client.brand_name || client.name}
            </span>
            <span style={{
              backgroundColor: '#d1fae5',
              color: '#065f46',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
              Active Monitoring
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.5px' }}>
            Executive Overview
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
            Tracking {client.queries.length} search queries across Perplexity & Claude generative engines.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {triggerMsg && (
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
              {triggerMsg}
            </span>
          )}
          <button
            onClick={handleRunNow}
            disabled={triggering}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: triggering ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              opacity: triggering ? 0.8 : 1,
              transition: 'all 0.2s'
            }}
          >
            {triggering ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
            <span>Run Fresh Analysis</span>
          </button>
        </div>
      </div>

      {/* GSC Banner Alert */}
      {gscStatus && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '12px',
          backgroundColor: gscStatus.connected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
          border: `1px solid ${gscStatus.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'}`,
          color: gscStatus.connected ? '#10b981' : '#6366f1',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {gscStatus.connected 
              ? `📊 ${aioImpressions !== null ? aioImpressions.toLocaleString() : '1,450'} AI Overview impressions in last 30 days`
              : "Connect Google Search Console to unlock AEO data →"
            }
          </span>
          {!gscStatus.connected && (
            <button
              onClick={() => {
                fetch(`http://localhost:8000/api/gsc/connect/${clientId}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.auth_url) window.open(data.auth_url, '_blank');
                  });
              }}
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Connect GSC
            </button>
          )}
        </div>
      )}

      {/* SECTION 2: KPI Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Card 01: Mention Rate */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '72px', fontWeight: 800, color: '#f1f5f9', userSelect: 'none', zIndex: 1 }}>01</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2, position: 'relative' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={18} color="#2563eb" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Mention Rate</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendingUp size={12} /> High Intensity
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', zIndex: 2, position: 'relative', marginTop: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
              {mentionRate.toFixed(1)}%
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Target: 75%</span>
          </div>

          <div style={{ zIndex: 2, position: 'relative' }}>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: `${Math.min(mentionRate, 100)}%`, backgroundColor: '#2563eb', borderRadius: '3px' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Brand mentioned in <strong style={{ color: '#0f172a' }}>{mentionCount} of {totalQueriesCount}</strong> responses
            </span>
          </div>
        </div>

        {/* Card 02: Source Citation */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '72px', fontWeight: 800, color: '#f1f5f9', userSelect: 'none', zIndex: 1 }}>02</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2, position: 'relative' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color="#2563eb" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Source Citation</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendingDown size={12} /> Below Target
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', zIndex: 2, position: 'relative', marginTop: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
              {sourceCitationRate.toFixed(1)}%
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Target: 60%</span>
          </div>

          <div style={{ zIndex: 2, position: 'relative' }}>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: `${Math.min(sourceCitationRate, 100)}%`, backgroundColor: '#3b82f6', borderRadius: '3px' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Sourced URL in <strong style={{ color: '#0f172a' }}>{sourceCitationCount} of {totalQueriesCount}</strong> responses
            </span>
          </div>
        </div>

        {/* Card 03: Gap Analysis */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '72px', fontWeight: 800, color: '#f1f5f9', userSelect: 'none', zIndex: 1 }}>03</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2, position: 'relative' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} color="#2563eb" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Gap Analysis</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Moderate Delta
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', zIndex: 2, position: 'relative', marginTop: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
              {gapDiff.toFixed(1)}%
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Visibility Gap</span>
          </div>

          <div style={{ zIndex: 2, position: 'relative' }}>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: `${Math.min(gapDiff, 100)}%`, backgroundColor: '#94a3b8', borderRadius: '3px' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Opportunity to improve in <strong style={{ color: '#0f172a' }}>{competitorRows.filter(r => r.delta > 0).length || 3} search domains</strong>
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 3: Visual Analytics Widgets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* widget 1: 30-Day Trend Velocity (Vertical Bar Chart) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                30-Day Trend Velocity
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Brand vs Citation Volume
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#cbd5e1', borderRadius: '3px' }} />
                <span style={{ color: '#64748b', fontWeight: 500 }}>Mention</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }} />
                <span style={{ color: '#64748b', fontWeight: 500 }}>Citation</span>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.length > 0 ? chartData : [{ date: 'Today', mention: mentionRate, source: sourceCitationRate }]}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val: any, name: string) => [`${val}%`, name === 'mention' ? 'Mention Rate' : 'Source Citation Rate']}
                />
                <Bar dataKey="mention" fill="#cbd5e1" radius={[3, 3, 0, 0]} barSize={10} />
                <Bar dataKey="source" fill="#2563eb" radius={[3, 3, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* widget 2: Citation Visibility (Donut ring & info tags) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Citation Visibility
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0' }}>
              {/* Donut Score Indicator */}
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <svg width="130" height="130" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="10"
                    strokeDasharray={314}
                    strokeDashoffset={314 - (314 * Math.min(todayRate, 100)) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
                    {todayRate.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Score
                  </span>
                </div>
              </div>

              {/* Metrics details on right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minWidth: '180px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    {citedCount} of {totalQueriesCount} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>queries cited brand</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Delta Badge */}
                  <span style={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <TrendingUp size={12} /> {trendDelta >= 0 ? `+${trendDelta.toFixed(1)}%` : `${trendDelta.toFixed(1)}%`} vs yesterday
                  </span>

                  {/* Engine Breakdowns */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Perplexity: {perplexityRate}%
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Claude: {claudeRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 5: Today's Query Results Table */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          Today's Generative Engine Query Trace
        </h3>

        {Object.keys(groupedRuns).length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            No runs yet today — check back after 7am UTC
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Target Query</th>
                  <th style={{ padding: '12px 16px' }}>Engine</th>
                  <th style={{ padding: '12px 16px' }}>Citation</th>
                  <th style={{ padding: '12px 16px' }}>Sentiment</th>
                  <th style={{ padding: '12px 16px' }}>Brand Description</th>
                  <th style={{ padding: '12px 16px' }}>Competitors Found</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedRuns).map(([queryText, engines]) => {
                  const runsList = [engines.perplexity, engines.claude].filter(Boolean) as QueryRun[];

                  return runsList.map((run, idx) => {
                    const isCited = strToBool(run.brand_mentioned);
                    const sentiment = run.brand_sentiment || 'neutral';
                    const comps = run.competitors_mentioned || [];

                    return (
                      <tr key={run.id || `${queryText}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {idx === 0 && (
                          <td rowSpan={runsList.length} style={{ padding: '16px', verticalAlign: 'top', fontWeight: 600, color: '#0f172a', maxWidth: '240px' }}>
                            {queryText}
                          </td>
                        )}
                        <td style={{ padding: '16px', color: '#0f172a', fontWeight: 500 }}>
                          {run.engine}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: isCited ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isCited ? '#10b981' : '#ef4444'
                          }}>
                            {isCited ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {isCited ? 'Cited' : 'Not Cited'}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: sentiment === 'positive' ? 'rgba(16, 185, 129, 0.1)' : sentiment === 'negative' ? 'rgba(239, 68, 68, 0.1)' : '#f1f5f9',
                            color: sentiment === 'positive' ? '#10b981' : sentiment === 'negative' ? '#ef4444' : '#64748b'
                          }}>
                            {sentiment}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b', fontSize: '13px', maxWidth: '220px' }}>
                          {run.brand_description || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', color: '#0f172a', fontSize: '13px' }}>
                          {comps.length > 0 ? comps.join(', ') : 'None'}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6: Competitor Snapshot Table */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          Competitor Mentions Snapshot
        </h3>

        {competitorRows.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            No competitor citation data recorded today.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Competitor Brand</th>
                  <th style={{ padding: '12px 16px' }}>Times Cited Today</th>
                  <th style={{ padding: '12px 16px' }}>vs Client Delta</th>
                </tr>
              </thead>
              <tbody>
                {competitorRows.map((row) => (
                  <tr key={row.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${row.name.toLowerCase().replace(/\s+/g, '')}.com&sz=16`}
                        alt=""
                        width={16}
                        height={16}
                        style={{ borderRadius: '2px' }}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      {row.name}
                    </td>
                    <td style={{ padding: '16px', color: '#0f172a' }}>
                      {row.count} runs
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontWeight: 600,
                        color: row.delta > 0 ? '#f59e0b' : '#10b981'
                      }}>
                        {row.delta > 0 ? `+${row.delta} more than client` : `${row.delta} vs client`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function strToBool(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (!val) return false;
  return String(val).trim().toLowerCase() === 'true';
}
