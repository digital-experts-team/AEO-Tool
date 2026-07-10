'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, FileText, Download, Code, Globe, HelpCircle } from 'lucide-react';

interface BotStatus {
  user_agent: string;
  display_name: string;
  status: string;
  impact: string;
}

interface AuditData {
  client_id: string;
  domain: string;
  ai_readiness_score: number;
  robots_txt_exists: boolean;
  bot_access: BotStatus[];
  llms_txt_exists: boolean;
  llms_txt_content: string | null;
  sitemap_exists: boolean;
  sitemap_page_count: number | null;
  schema_types_found: string[];
  schema_types_missing: string[];
  critical_issues: string[];
  pagespeed?: {
    available: boolean;
    performance_score: number;
    seo_score: number;
    accessibility_score: number;
    lcp: string;
    cls: string;
    tbt: string;
  } | null;
}

interface Props {
  clientId: string;
  brandName?: string;
}

export default function TechnicalAudit({ clientId, brandName = "Brand" }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // llms.txt generator state
  const [generatingLlms, setGeneratingLlms] = useState(false);
  const [llmsResult, setLlmsResult] = useState<{ content: string; filename: string } | null>(null);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:8000/api/technical/audit/${clientId}`);
      if (!res.ok) throw new Error("Failed to load technical audit data");
      const obj = await res.json();
      setData(obj);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch technical audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [clientId]);

  const handleGenerateLlms = async () => {
    try {
      setGeneratingLlms(true);
      const res = await fetch(`http://localhost:8000/api/technical/generate-llms-txt/${clientId}`);
      if (!res.ok) throw new Error("Failed to generate llms.txt");
      const obj = await res.json();
      setLlmsResult(obj);
    } catch (err: any) {
      alert("Error generating llms.txt: " + err.message);
    } finally {
      setGeneratingLlms(false);
    }
  };

  const handleDownloadLlms = () => {
    if (!llmsResult) return;
    const element = document.createElement("a");
    const file = new Blob([llmsResult.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = llmsResult.filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: '#a1a1aa' }}>
        <Loader2 className="spin" size={28} style={{ marginRight: '8px' }} />
        <span>Analyzing website crawler permissions and metadata...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px',
        color: '#ef4444',
        margin: '20px 0'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Audit Failed</h4>
        <p style={{ margin: 0, fontSize: '13px' }}>{error || "Make sure the client has a domain configured."}</p>
      </div>
    );
  }

  const score = data.ai_readiness_score;
  const scoreColor = score > 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreBg = score > 70 ? 'rgba(16, 185, 129, 0.15)' : score >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  const citationBots = ["OAI-SearchBot", "ChatGPT-User", "Claude-Web", "Claude-SearchBot", "PerplexityBot"];
  const trainingBots = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Amazonbot", "Meta-ExternalAgent"];

  const getStatusBadge = (status: string) => {
    let text = "Not Set";
    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = '#a1a1aa';
    let border = 'rgba(255, 255, 255, 0.1)';

    if (status === 'allowed') {
      text = "Allowed";
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      border = 'rgba(16, 185, 129, 0.3)';
    } else if (status === 'blocked') {
      text = "Blocked";
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = 'rgba(239, 68, 68, 0.3)';
    } else if (status === 'partial') {
      text = "Partial";
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
      border = 'rgba(245, 158, 11, 0.3)';
    }

    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`
      }}>
        {text}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Score + Critical Issues Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        
        {/* Score Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#a1a1aa', fontWeight: 500 }}>AI Search Readiness Score</h4>
          
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreBg} 0%, transparent 80%)`,
            border: `6px solid ${scoreColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff' }}>{score}</span>
          </div>

          <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>
            How well {brandName} is configured for AI engine discovery.
          </p>
        </div>

        {/* Critical Issues Banner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color={data.critical_issues.length > 0 ? '#ef4444' : '#10b981'} />
            {data.critical_issues.length > 0 ? 'Action Required: Crawler Obstructions' : 'Technical Status Excellent'}
          </h4>

          {data.critical_issues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.critical_issues.map((issue) => (
                <div key={issue} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: '0 6px 6px 0'
                }}>
                  <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#10b981',
              padding: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              borderRadius: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>No critical blocking rules found. Crawler agents can access website content successfully.</span>
            </div>
          )}
        </div>
      </div>

      {/* Signal Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Signal 1: robots.txt */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>robots.txt File</span>
            {data.robots_txt_exists ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
            {data.robots_txt_exists ? 'Active / Configured' : 'Missing'}
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Governs general user-agent scraper routes</span>
        </div>

        {/* Signal 2: llms.txt */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>llms.txt Directory</span>
            {data.llms_txt_exists ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
            {data.llms_txt_exists ? 'Discovered' : 'Not Found'}
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Provides structured context for LLM agents</span>
        </div>

        {/* Signal 3: sitemap.xml */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>sitemap.xml</span>
            {data.sitemap_exists ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
            {data.sitemap_exists ? `${data.sitemap_page_count || 0} pages indexed` : 'Missing'}
          </div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Aids search index crawl efficiency</span>
        </div>

        {/* Signal 4: Schema markup */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>Structured Schemas</span>
            <CheckCircle2 size={18} color={data.schema_types_found.length > 0 ? '#10b981' : '#f59e0b'} />
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            {data.schema_types_found.map(t => (
              <span key={t} style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>{t}</span>
            ))}
            {data.schema_types_found.length === 0 && (
              <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 600 }}>None found</span>
            )}
          </div>
        </div>
      </div>

      {/* Bot access tables */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>Crawler Permissions</h4>

        {/* 1. Citation Bots */}
        <div style={{ marginBottom: '24px' }}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Citation & Search Bots (Affects live answer search visibility)
          </h5>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Bot User-Agent</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Purpose / Platform</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a', width: '100px' }}>Status</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Citation Impact</th>
              </tr>
            </thead>
            <tbody>
              {data.bot_access.filter(b => citationBots.includes(b.user_agent)).map(b => (
                <tr key={b.user_agent} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', height: '40px' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>{b.user_agent}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#a1a1aa' }}>{b.display_name}</td>
                  <td style={{ padding: '8px 12px' }}>{getStatusBadge(b.status)}</td>
                  <td style={{ padding: '8px 12px', fontSize: '12px', color: b.status === 'blocked' ? '#ef4444' : '#a1a1aa' }}>
                    {b.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Training Bots */}
        <div>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Model Training Crawlers (Affects foundational model training)
          </h5>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Bot User-Agent</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Purpose / Platform</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a', width: '100px' }}>Status</th>
                <th style={{ padding: '8px 12px', fontSize: '12px', color: '#71717a' }}>Citation Impact</th>
              </tr>
            </thead>
            <tbody>
              {data.bot_access.filter(b => trainingBots.includes(b.user_agent)).map(b => (
                <tr key={b.user_agent} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', height: '40px' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>{b.user_agent}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#a1a1aa' }}>{b.display_name}</td>
                  <td style={{ padding: '8px 12px' }}>{getStatusBadge(b.status)}</td>
                  <td style={{ padding: '8px 12px', fontSize: '12px', color: '#a1a1aa' }}>{b.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* llms.txt Generator Frame */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>llms.txt Assistant</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
              Create an AI-friendly guide sheet to expose key keywords and query references directly on your domain.
            </p>
          </div>
          <button
            onClick={handleGenerateLlms}
            disabled={generatingLlms}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {generatingLlms ? <Loader2 className="spin" size={14} /> : <Code size={14} />}
            <span>Generate llms.txt</span>
          </button>
        </div>

        {llmsResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#e2e8f0'
            }}>
              <span>Ready for download: <code>{llmsResult.filename}</code></span>
              <button
                onClick={handleDownloadLlms}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Download size={12} /> Download File
              </button>
            </div>
            
            <pre style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              overflowX: 'auto',
              fontSize: '12px',
              color: '#a1a1aa',
              maxHeight: '260px',
              margin: 0
            }}>
              {llmsResult.content}
            </pre>
            
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              <strong>Instructions:</strong> Upload this generated file to the root of your web domain at <code>/llms.txt</code> to guide AI engines search crawlers.
            </div>
          </div>
        )}
      </div>

      {/* PageSpeed Insights Panel */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={16} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Google PageSpeed Insights</div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>Mobile performance · Powered by Google Lighthouse</div>
          </div>
        </div>

        {data.pagespeed?.available ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Performance', score: data.pagespeed.performance_score, icon: '⚡' },
                { label: 'SEO Score', score: data.pagespeed.seo_score, icon: '🔍' },
                { label: 'Accessibility', score: data.pagespeed.accessibility_score, icon: '♿' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: item.score >= 90 ? '#10b981' : item.score >= 50 ? '#f59e0b' : '#ef4444'
                  }}>{item.score}</div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Largest Contentful Paint', value: data.pagespeed.lcp },
                { label: 'Cumulative Layout Shift', value: data.pagespeed.cls },
                { label: 'Total Blocking Time', value: data.pagespeed.tbt },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'rgba(99, 102, 241, 0.06)',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.12)'
          }}>
            <div style={{ fontSize: '28px' }}>⚡</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '4px' }}>
                Enable PageSpeed Insights API to unlock Core Web Vitals
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
                Go to{' '}
                <a
                  href="https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline' }}
                >
                  console.cloud.google.com
                </a>
                {' '}→ Enable <strong>PageSpeed Insights API</strong>, then refresh this page.
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
