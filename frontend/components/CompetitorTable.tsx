'use client';

import React from 'react';
import { CompetitorGapAnalysis } from '../types';
import { ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  gapAnalysis: CompetitorGapAnalysis;
}

export default function CompetitorTable({ gapAnalysis }: Props) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert color="#f59e0b" size={22} /> Competitor Gap Opportunities
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
            Queries where competitors are cited or outranking your brand in AI search output.
          </p>
        </div>
        
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '13px',
          color: '#fbbf24',
          fontWeight: 600
        }}>
          Top Rival: {gapAnalysis.top_winning_competitor}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 16px' }}>Prompt Query</th>
              <th style={{ padding: '12px 16px' }}>Client Status</th>
              <th style={{ padding: '12px 16px' }}>Competitors Cited</th>
              <th style={{ padding: '12px 16px' }}>Priority</th>
              <th style={{ padding: '12px 16px' }}>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {gapAnalysis.gap_items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e4e4e7' }}>
                <td style={{ padding: '16px', fontWeight: 500, maxWidth: '240px' }}>
                  {item.query_text}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: item.client_cited ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: item.client_cited ? '#60a5fa' : '#f87171'
                  }}>
                    {item.client_cited ? 'Ranked Low' : 'Omitted'}
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#a1a1aa' }}>
                  {item.competitors_cited.join(', ')}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: item.opportunity_score >= 8 ? '#ef4444' : '#f59e0b' }}>
                    <AlertCircle size={14} /> {item.opportunity_score}/10
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#cbd5e1', maxWidth: '320px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Sparkles size={14} color="#a855f7" style={{ marginTop: '3px', flexShrink: 0 }} />
                    <span>{item.recommended_action}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
