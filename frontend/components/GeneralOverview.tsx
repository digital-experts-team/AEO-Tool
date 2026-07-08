import React, { useState, useEffect } from 'react';
import { BrandOverviewResponse } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Eye, Link as LinkIcon, AlertTriangle, Info, Sparkles, Copy, Share2 } from 'lucide-react';
import SourceIntelligence from './SourceIntelligence';

interface GeneralOverviewProps {
  data: BrandOverviewResponse;
}

export default function GeneralOverview({ data }: GeneralOverviewProps) {
  if (!data) {
    return (
      <div className="glass-card" style={{
        padding: '32px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '15px'
      }}>
        No brand overview data available.
      </div>
    );
  }

  const [sourcesData, setSourcesData] = useState<{ sources: any[], total_unique_domains: number, highest_authority_source: string } | null>(null);

  useEffect(() => {
    if (!data.client_id) return;
    fetch(`http://localhost:8000/api/technical/source-authority/${data.client_id}`)
      .then(res => res.json())
      .then(setSourcesData)
      .catch(err => console.error(err));
  }, [data.client_id]);

  const {
    brand_name = 'Brand',
    ai_visibility_score = 0.0,
    brand_perception_phrases = [],
    intent_breakdown = [],
    sentiment_trend = [],
  } = data;

  // Recharts vertical bars data
  const chartData = sentiment_trend.length > 0 ? sentiment_trend.map((s, idx) => ({
    name: s.date ? s.date.slice(5) : '',
    value: s.positive_pct,
    isActive: idx === sentiment_trend.length - 2 // highlight second to last
  })) : [
    { name: '06-01', value: 60, isActive: false },
    { name: '06-05', value: 65, isActive: false },
    { name: '06-10', value: 55, isActive: false },
    { name: '06-15', value: 70, isActive: false },
    { name: '06-20', value: 78, isActive: false },
    { name: '06-25', value: 45, isActive: true },
    { name: '06-30', value: 30, isActive: false },
    { name: '07-05', value: 25, isActive: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 3 KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        width: '100%'
      }}>
        
        {/* Mention Rate */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '180px',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '24px',
            color: '#f1f5f9',
            fontSize: '32px',
            fontWeight: 800,
            userSelect: 'none'
          }}>01</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <Eye size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Mention Rate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>80.0%</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>+2.4%</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
              Brand mentioned in 4 of 5 AI responses
            </span>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '80%', height: '100%', backgroundColor: '#2563eb', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Source Citation */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '180px',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '24px',
            color: '#f1f5f9',
            fontSize: '32px',
            fontWeight: 800,
            userSelect: 'none'
          }}>02</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <LinkIcon size={16} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Source Citation</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>44.0%</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>-1.2%</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
              Sourced URL in 2 of 5 responses
            </span>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '44%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Gap Analysis */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '180px',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '24px',
            color: '#f1f5f9',
            fontSize: '32px',
            fontWeight: 800,
            userSelect: 'none'
          }}>03</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fff5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertTriangle size={16} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Gap Analysis</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>36.0%</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Potential Gain</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
              Brand recommended but rarely sourced
            </span>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '36%', height: '100%', backgroundColor: '#1e293b', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Visibility Index & Sentiment */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        width: '100%'
      }}>
        
        {/* AI Visibility Index Card */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>AI Visibility Index</h3>
                <span style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'block' }}>30-day semantic prominence trend across LLM endpoints</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '6px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#fff5f5',
                  color: '#ef4444',
                  border: '1px solid #fee2e2',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  Live Data: Declining
                </span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{ai_visibility_score}</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '180px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} fontSize={10} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isActive ? '#60a5fa' : '#e2e8f0'} 
                        stroke={entry.isActive ? '#2563eb' : 'none'}
                        strokeWidth={entry.isActive ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
              <Info size={16} style={{ color: '#1e3a8a', flexShrink: 0 }} />
              <span>Significant drop in Comparison-intent queries detected.</span>
            </div>
            <a href="#" style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
              View Full Audit &gt;
            </a>
          </div>
        </div>

        {/* How AI Describes Card */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', margin: 0 }}>How AI Describes {brand_name}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            {/* Dominant */}
            <div style={{
              padding: '16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #d1fae5',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ px: '8px', py: '2px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#a7f3d0', color: '#065f46', borderRadius: '4px', padding: '2px 6px' }}>DOMINANT 88%</span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Sentiment</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, fontStyle: 'italic', color: '#1e293b', margin: 0 }}>
                "{brand_perception_phrases[0] || 'A very popular and reliable solution.'}"
              </p>
            </div>

            {/* Emerging */}
            <div style={{
              padding: '16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#bfdbfe', color: '#1e40af', borderRadius: '4px', padding: '2px 6px' }}>EMERGING 42%</span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Growing Context</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, fontStyle: 'italic', color: '#1e293b', margin: 0 }}>
                "{brand_perception_phrases[1] || 'Often has a slight edge due to its selection.'}"
              </p>
            </div>

            {/* Concern */}
            <div style={{
              padding: '16px',
              backgroundColor: '#fff5f5',
              border: '1px solid #ffe3e3',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#fecaca', color: '#991b1b', borderRadius: '4px', padding: '2px 6px' }}>CONCERN 16%</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, fontStyle: 'italic', color: '#1e293b', margin: 0 }}>
                "{brand_perception_phrases[2] || 'Occasional criticism regarding packaging waste.'}"
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Citation Rate and Brief */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        width: '100%'
      }}>
        
        {/* Citation Rate by Query Intent */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', margin: 0 }}>Citation Rate by Query Intent</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Buying */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ width: '90px', color: '#475569' }}>Buying</span>
                  <div style={{ flex: 1, margin: '0 16px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '72%', height: '100%', backgroundColor: '#0f172a', borderRadius: '4px' }} />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right', color: '#0f172a' }}>72%</span>
                </div>
              </div>

              {/* Comparison */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ width: '90px', color: '#475569' }}>Comparison</span>
                  <div style={{ flex: 1, margin: '0 16px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '28%', height: '100%', backgroundColor: '#2563eb', borderRadius: '4px' }} />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right', color: '#0f172a' }}>28%</span>
                </div>
              </div>

              {/* Location */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ width: '90px', color: '#475569' }}>Location</span>
                  <div style={{ flex: 1, margin: '0 16px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '55%', height: '100%', backgroundColor: '#475569', borderRadius: '4px' }} />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right', color: '#0f172a' }}>55%</span>
                </div>
              </div>

              {/* Informational */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ width: '90px', color: '#475569' }}>Informational</span>
                  <div style={{ flex: 1, margin: '0 16px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '90%', height: '100%', backgroundColor: '#94a3b8', borderRadius: '4px' }} />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right', color: '#0f172a' }}>90%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Brief Card */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '230px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Sparkles size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Intelligence Brief</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>STRATEGIC SYNTHESIS</span>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                top: '-24px',
                left: '-8px',
                fontSize: '64px',
                fontFamily: 'Georgia, serif',
                color: '#bfdbfe',
                userSelect: 'none',
                pointerEvents: 'none'
              }}>“</span>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.6,
                color: '#1e293b',
                paddingLeft: '12px',
                margin: 0,
                position: 'relative',
                zIndex: 1
              }}>
                {brand_name} dominates <span style={{ fontWeight: 800, color: '#1e3a8a' }}>informational</span> and <span style={{ fontWeight: 800, color: '#1e3a8a' }}>buying</span> queries, but is losing citation share in multi-brand comparison scenarios. The AI model is prioritizing specialized niche competitors when users ask for "Best premium options."
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #dbeafe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', marginLeft: '-6px' }}>
                <img style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #ffffff' }} src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" alt="" />
                <img style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #ffffff', marginLeft: '-8px' }} src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" alt="" />
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>+4</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{
                padding: '8px',
                border: '1px solid #dbeafe',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Copy size={14} />
              </button>
              <button style={{
                backgroundColor: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Share2 size={12} />
                <span>Export Brief</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {sourcesData && (
        <SourceIntelligence
          sources={sourcesData.sources}
          totalUniqueDomains={sourcesData.total_unique_domains}
          highestAuthoritySource={sourcesData.highest_authority_source}
        />
      )}

    </div>
  );
}
