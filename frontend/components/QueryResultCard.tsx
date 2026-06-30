'use client';

import React, { useState } from 'react';
import { QueryResult } from '../types';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Bot } from 'lucide-react';

interface Props {
  result: QueryResult;
}

export default function QueryResultCard({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: result.client_cited ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${result.client_cited ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {result.client_cited ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                  Cited #{result.client_rank || 1}
                </span>
              </>
            ) : (
              <>
                <XCircle size={16} color="#ef4444" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>Omitted</span>
              </>
            )}
          </div>

          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f4f4f5' }}>
              "{result.query_text}"
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#a1a1aa' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                <Bot size={12} /> {result.engine}
              </span>
              <span>• {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#d4d4d8',
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          {expanded ? 'Hide Trace' : 'Inspect AI Output'}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Mention Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
        {result.mentions.map((m, idx) => (
          <div
            key={idx}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              background: m.mentioned
                ? m.is_client
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${
                m.mentioned
                  ? m.is_client
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)'
              }`,
              color: m.mentioned ? (m.is_client ? '#818cf8' : '#e4e4e7') : '#52525b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{m.brand_name}</span>
            {m.mentioned && (
              <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '10px' }}>
                #{m.position_rank || '?'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Expanded Output */}
      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 600, marginBottom: '8px' }}>
            AI Generated Response snippet:
          </div>
          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '13px',
            color: '#d4d4d8',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {result.raw_response}
          </div>
        </div>
      )}
    </div>
  );
}
