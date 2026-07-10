'use client';

import React from 'react';
import { Play, RefreshCw } from 'lucide-react';

interface ClientTopBarProps {
  clientName: string;
  pageTitle: string;
  // Run Now (GEO/LLM)
  onRunNow?: () => void;
  isRunning?: boolean;
  runMessage?: string | null;
  // Date range
  dateRange?: 7 | 14 | 30;
  onDateRangeChange?: (range: 7 | 14 | 30) => void;
  showDateRange?: boolean;
  // Custom right-side actions
  rightActions?: React.ReactNode;
  isMock?: boolean;
}

export default function ClientTopBar({
  clientName,
  pageTitle,
  onRunNow,
  isRunning = false,
  runMessage,
  dateRange = 30,
  onDateRangeChange,
  showDateRange = false,
  rightActions,
  isMock = false
}: ClientTopBarProps) {
  // Parse sub-title if pageTitle contains a separator
  const titleParts = pageTitle.split('—');
  const displayTitle = titleParts.length > 1 ? titleParts[1].trim() : pageTitle;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '20px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '24px',
      marginBottom: '24px'
    }}>
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
            Brand: {clientName}
          </span>
          <span style={{
            backgroundColor: isMock ? '#fef08a' : '#d1fae5',
            color: isMock ? '#854d0e' : '#065f46',
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isMock ? '#eab308' : '#059669' }} />
            {isMock ? 'Mock Data (Setup Credentials)' : 'Active Monitoring'}
          </span>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
          {displayTitle}
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showDateRange && onDateRangeChange && (
          <select 
            value={dateRange}
            onChange={(e) => onDateRangeChange(Number(e.target.value) as any)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        )}

        {rightActions}
        
        {onRunNow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {runMessage && (
              <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                {runMessage}
              </span>
            )}
            <button
              onClick={onRunNow}
              disabled={isRunning}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                opacity: isRunning ? 0.8 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isRunning ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
              <span>{isRunning ? 'Running...' : 'Run Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
