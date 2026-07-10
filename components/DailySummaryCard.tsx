'use client';

import React from 'react';
import { DailySummaryData } from '../types';
import { Sparkles, BellRing, Calendar } from 'lucide-react';

interface Props {
  summary: DailySummaryData;
}

export default function DailySummaryCard({ summary }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)',
      border: '1px solid rgba(168, 85, 247, 0.25)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#8b5cf6', padding: '8px', borderRadius: '10px', display: 'flex' }}>
            <Sparkles color="#ffffff" size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
              AI Daily Intelligence Brief
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#c084fc', marginTop: '2px' }}>
              <Calendar size={12} /> {summary.date}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', color: '#e9d5ff', fontWeight: 600 }}>
          <span>Score Delta:</span>
          <span style={{ color: summary.score_change_24h >= 0 ? '#4ade80' : '#f87171' }}>
            {summary.score_change_24h >= 0 ? `+${summary.score_change_24h}%` : `${summary.score_change_24h}%`}
          </span>
        </div>
      </div>

      {/* Key Takeaway */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '14px',
        color: '#f4f4f5',
        lineHeight: 1.6,
        marginBottom: '16px'
      }}>
        <strong style={{ color: '#c084fc' }}>Key Takeaway: </strong>
        {summary.key_takeaway}
      </div>

      {/* Alerts */}
      {summary.alerts && summary.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {summary.alerts.map((alert, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e4e4e7' }}>
              <BellRing size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
