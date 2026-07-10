'use client';

import React from 'react';
import { CitationScoreData } from '../types';
import { Award, Target, PieChart, ThumbsUp } from 'lucide-react';

interface Props {
  score: CitationScoreData;
}

export default function CitationScore({ score }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* Metric 1 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>Citation Rate</span>
          <Target size={20} color="#6366f1" />
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
          {score.citation_rate}%
        </div>
        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
          Cited in {score.cited_count} of {score.total_queries} prompts
        </div>
      </div>

      {/* Metric 2 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>Average Position</span>
          <Award size={20} color="#10b981" />
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
          #{score.average_rank > 0 ? score.average_rank : 'N/A'}
        </div>
        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
          Rank order when mentioned
        </div>
      </div>

      {/* Metric 3 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>Share of Voice</span>
          <PieChart size={20} color="#f59e0b" />
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
          {score.share_of_voice}%
        </div>
        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
          Share vs direct competitors
        </div>
      </div>

      {/* Metric 4 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>Positive Sentiment</span>
          <ThumbsUp size={20} color="#ec4899" />
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
          {score.positive_sentiment_pct}%
        </div>
        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
          Positive context mentions
        </div>
      </div>
    </div>
  );
}
