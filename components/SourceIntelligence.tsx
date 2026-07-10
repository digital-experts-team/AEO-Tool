'use client';

import React from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';

interface SourceItem {
  domain: string;
  favicon_url: string;
  times_cited: number;
  authority_score: number | null;
  global_rank: number | null;
  is_client_domain: boolean;
}

interface Props {
  sources: SourceItem[];
  totalUniqueDomains: number;
  highestAuthoritySource: string;
}

export default function SourceIntelligence({ sources = [], totalUniqueDomains = 0, highestAuthoritySource = "None" }: Props) {
  const maxCitations = sources.length > 0 ? Math.max(...sources.map(s => s.times_cited)) : 1;
  const isAuthorityNullEverywhere = sources.every(s => s.authority_score === null);

  const getDomainFavicon = (domain: string) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>Source Intelligence & Authority</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
            Domains citing your brand in AI search results, scaled by authority.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#71717a', display: 'block', textTransform: 'uppercase' }}>Unique Citing Domains</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1' }}>{totalUniqueDomains}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#71717a', display: 'block', textTransform: 'uppercase' }}>Highest Authority Source</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
              {highestAuthoritySource !== "None" ? highestAuthoritySource : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {sources.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '14px' }}>
          No citing sources detected yet. Run an analysis to fetch references.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#71717a', width: '60px' }}>Rank</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#71717a' }}>Domain</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#71717a', width: '220px' }}>Times Cited</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#71717a', width: '130px' }}>Authority Score</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#71717a', width: '100px' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src, index) => {
                const citationPercent = Math.round((src.times_cited / maxCitations) * 100);
                return (
                  <tr key={src.domain} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', height: '48px' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#a1a1aa' }}>
                      #{index + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={getDomainFavicon(src.domain)}
                          alt=""
                          width={16}
                          height={16}
                          style={{ borderRadius: '2px', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '1px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                        <a 
                          href={`https://${src.domain}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onMouseOver={e => e.currentTarget.style.color = '#6366f1'}
                          onMouseOut={e => e.currentTarget.style.color = '#ffffff'}
                        >
                          {src.domain}
                          <ExternalLink size={12} style={{ opacity: 0.6 }} />
                        </a>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ minWidth: '24px', fontWeight: 600, color: '#ffffff' }}>{src.times_cited}</span>
                        <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${citationPercent}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #4f46e5)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {src.authority_score !== null ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: src.authority_score >= 7 ? 'rgba(16, 185, 129, 0.15)' : src.authority_score >= 4 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: src.authority_score >= 7 ? '#10b981' : src.authority_score >= 4 ? '#f59e0b' : '#ef4444',
                          border: `1px solid ${src.authority_score >= 7 ? 'rgba(16, 185, 129, 0.3)' : src.authority_score >= 4 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {src.authority_score}/10
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#71717a' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {src.is_client_domain ? (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          Owned
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
                          Source
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAuthorityNullEverywhere && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '16px',
          padding: '10px 14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#71717a'
        }}>
          <HelpCircle size={14} color="#71717a" />
          <span>Connect your OpenPageRank API key in settings or `.env` to unlock source Domain Authority scores.</span>
        </div>
      )}
    </div>
  );
}
