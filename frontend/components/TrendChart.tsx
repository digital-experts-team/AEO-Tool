'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function TrendChart() {
  // SVG based smooth chart visualization
  const points = [
    { day: 'Mon', score: 58 },
    { day: 'Tue', score: 62 },
    { day: 'Wed', score: 60 },
    { day: 'Thu', score: 68 },
    { day: 'Fri', score: 71 },
    { day: 'Sat', score: 70 },
    { day: 'Sun', score: 75 },
  ];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp color="#10b981" size={22} /> 7-Day Citation Trend Analysis
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
            Historical progression of brand visibility rate across automated daily LLM runs.
          </p>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
          +17% this week
        </div>
      </div>

      <div style={{ height: '180px', width: '100%', position: 'relative', marginTop: '10px' }}>
        <svg viewBox="0 0 500 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

          {/* Area Fill */}
          <path
            d="M 0,115 L 75,100 L 150,108 L 225,80 L 300,70 L 375,73 L 450,55 L 450,150 L 0,150 Z"
            fill="url(#chartGradient)"
          />

          {/* Smooth Line */}
          <path
            d="M 0,115 L 75,100 L 150,108 L 225,80 L 300,70 L 375,73 L 450,55"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {[
            { x: 0, y: 115, val: '58%' },
            { x: 75, y: 100, val: '62%' },
            { x: 150, y: 108, val: '60%' },
            { x: 225, y: 80, val: '68%' },
            { x: 300, y: 70, val: '71%' },
            { x: 375, y: 73, val: '70%' },
            { x: 450, y: 55, val: '75%' },
          ].map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="5" fill="#10b981" stroke="#09090b" strokeWidth="2" />
              <text x={pt.x} y={pt.y - 12} fill="#a1a1aa" fontSize="10" textAnchor="middle" fontWeight="600">{pt.val}</text>
            </g>
          ))}
        </svg>

        {/* X Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#71717a', paddingLeft: '4px', paddingRight: '4px' }}>
          {points.map((p, i) => (
            <span key={i}>{p.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
