'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, BarChart3, TrendingUp, RefreshCw, Key, ShieldCheck } from 'lucide-react';

interface QueryData {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface AeoData {
  connected: boolean;
  aio_impressions?: number;
  aio_clicks?: number;
  aio_ctr?: number;
  top_aio_queries?: QueryData[];
  featured_snippet_count?: number;
  date_range?: { start: string; end: string };
}

interface TrafficSourceData {
  total_ai_sessions: number;
  by_source: Record<string, number>;
  daily_trend: { date: string; sessions: number }[];
  top_source: string;
}

interface Props {
  clientId: string;
  onStatusChange?: (connected: boolean, impressions?: number) => void;
}

export default function GSCConnect({ clientId, onStatusChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ connected: boolean; site_url: string | null } | null>(null);
  const [aeoData, setAeoData] = useState<AeoData | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficSourceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

  const fetchStatusAndData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch connection status
      const statusRes = await fetch(`http://localhost:8000/api/gsc/status/${clientId}`);
      if (!statusRes.ok) throw new Error("Failed to load Google connection status");
      const statusObj = await statusRes.json();
      setStatus(statusObj);

      if (statusObj.connected) {
        setFetchingData(true);
        // Notify parent
        if (onStatusChange) {
          onStatusChange(true, 0);
        }

        // 2. Fetch AEO metrics
        const aeoRes = await fetch(`http://localhost:8000/api/gsc/aeo-data/${clientId}`);
        if (aeoRes.ok) {
          const aeoObj = await aeoRes.json();
          setAeoData(aeoObj);
          if (onStatusChange && aeoObj.aio_impressions) {
            onStatusChange(true, aeoObj.aio_impressions);
          }
        }

        // 3. Fetch GA4 traffic metrics
        const trafficRes = await fetch(`http://localhost:8000/api/gsc/ga4-traffic/${clientId}`);
        if (trafficRes.ok) {
          const trafficObj = await trafficRes.json();
          setTrafficData(trafficObj);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load Google Search Console status");
    } finally {
      setLoading(false);
      setFetchingData(false);
    }
  };

  useEffect(() => {
    fetchStatusAndData();
  }, [clientId]);

  const handleConnect = async () => {
    try {
      setError(null);
      const res = await fetch(`http://localhost:8000/api/gsc/connect/${clientId}`);
      if (!res.ok) throw new Error("Failed to generate Google OAuth link");
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
        
        // Listen for message or poll to see if it connected
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          const checkRes = await fetch(`http://localhost:8000/api/gsc/status/${clientId}`);
          if (checkRes.ok) {
            const checkObj = await checkRes.json();
            if (checkObj.connected || attempts > 30) {
              clearInterval(interval);
              fetchStatusAndData();
            }
          }
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Google Search Console");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: '#a1a1aa' }}>
        <Loader2 className="spin" size={24} style={{ marginRight: '8px' }} />
        <span>Verifying Google accounts status...</span>
      </div>
    );
  }

  const isConnected = status?.connected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Connection Header Box */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>Google Integrations</h3>
              {isConnected ? (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={10} /> Connected
                </span>
              ) : (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  Disconnected
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', maxWidth: '580px', lineHeight: '1.5' }}>
              Sync your Google Search Console property and Google Analytics 4 tracking. We pull live AI Overview impressions, CTR, and referrers to evaluate organic AEO citation metrics.
            </p>
            {isConnected && status?.site_url && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#71717a' }}>
                Site URL: <code style={{ color: '#ffffff', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{status.site_url}</code>
              </div>
            )}
          </div>

          {!isConnected ? (
            <button
              onClick={handleConnect}
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#6366f1'}
            >
              <ShieldCheck size={16} /> Connect Google Account
            </button>
          ) : (
            <button
              onClick={fetchStatusAndData}
              disabled={fetchingData}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={14} className={fetchingData ? "spin" : ""} /> Refresh Data
            </button>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {isConnected && (
        <>
          {/* AEO Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            {/* Metric 1 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>AI Overview Impressions</span>
                <BarChart3 size={20} color="#6366f1" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                {aeoData?.aio_impressions?.toLocaleString() || 0}
              </div>
              <span style={{ fontSize: '12px', color: '#71717a' }}>Last 30 Days</span>
            </div>

            {/* Metric 2 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>AI Overview CTR</span>
                <TrendingUp size={20} color="#10b981" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                {aeoData?.aio_ctr || 0}%
              </div>
              <span style={{ fontSize: '12px', color: '#71717a' }}>Featured Snippets: {aeoData?.featured_snippet_count || 0}</span>
            </div>

            {/* Metric 3 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>AI Referral Traffic</span>
                <ShieldCheck size={20} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
                {trafficData?.total_ai_sessions || 0} <span style={{ fontSize: '16px', fontWeight: 500, color: '#a1a1aa' }}>sessions</span>
              </div>
              <span style={{ fontSize: '12px', color: '#71717a' }}>Top Source: {trafficData?.top_source || 'None'}</span>
            </div>
          </div>

          {/* Detailed Panels */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px',
            marginTop: '8px'
          }}>
            {/* Top AI Overview Queries */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>Top Queries Triggering AI Overviews</h4>
              {(!aeoData?.top_aio_queries || aeoData.top_aio_queries.length === 0) ? (
                <div style={{ color: '#71717a', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                  No queries currently logging AI Overview impressions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aeoData.top_aio_queries.map((q, i) => (
                    <div key={q.query} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#71717a', width: '16px' }}>{i + 1}</span>
                        <span style={{ fontSize: '13px', color: '#ffffff' }}>{q.query}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                        <span style={{ color: '#a1a1aa' }}>{q.impressions.toLocaleString()} views</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{q.ctr}% CTR</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Traffic Referral Breakdown */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>Referral Sources Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trafficData?.by_source && Object.entries(trafficData.by_source)
                  .filter(([_, count]) => count > 0)
                  .map(([source, count]) => {
                    const pct = trafficData.total_ai_sessions > 0 ? Math.round((count / trafficData.total_ai_sessions) * 100) : 0;
                    return (
                      <div key={source}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: '#ffffff' }}>{source}</span>
                          <span style={{ color: '#a1a1aa', fontWeight: 500 }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                {(!trafficData?.by_source || Object.values(trafficData.by_source).reduce((a, b) => a + b, 0) === 0) && (
                  <div style={{ color: '#71717a', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                    No AI referral traffic detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
