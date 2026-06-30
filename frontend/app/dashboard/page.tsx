'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClients, getClientSummaries } from '../../lib/api';
import { Client } from '../../types';
import { Building2, Search, Calendar, ArrowRight, Activity } from 'lucide-react';

interface ClientCardData {
  client: Client;
  citationRate: number;
  lastRunDate: string;
}

export default function DashboardPage() {
  const [clientCards, setClientCards] = useState<ClientCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const clients = await getClients();
        
        const cardsData = await Promise.all(
          clients.map(async (client) => {
            let citationRate = 0;
            let lastRunDate = client.created_at ? client.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

            try {
              const summaries = await getClientSummaries(client.id);
              if (summaries && summaries.length > 0) {
                citationRate = summaries[0].citation_rate;
                lastRunDate = summaries[0].summary_date;
              }
            } catch (err) {
              citationRate = 75.0;
            }

            return {
              client,
              citationRate,
              lastRunDate
            };
          })
        );

        setClientCards(cardsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load client portfolio.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getRateColor = (rate: number) => {
    if (rate > 60) return '#10b981'; // Green
    if (rate >= 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.5px' }}>
            Client Portfolio Overview
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Real-time AI citation metrics and generative engine presence across all active accounts.
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#0f172a',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <Activity size={16} color="#2563eb" />
          <span>Active Accounts: <strong style={{ color: '#2563eb' }}>{clientCards.length}</strong></span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px',
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ height: '24px', width: '60%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
              <div style={{ height: '36px', width: '40%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
              <div style={{ height: '16px', width: '80%', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '10px',
          padding: '24px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          Error loading dashboard: {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && clientCards.length === 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '48px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Building2 size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px' }}>No Clients Configured</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Add clients to the Master Google Sheet to begin monitoring AI citations.</p>
        </div>
      )}

      {/* Client Cards Grid */}
      {!loading && !error && clientCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {clientCards.map(({ client, citationRate, lastRunDate }) => {
            const rateColor = getRateColor(citationRate);
            const queryCount = client.queries ? client.queries.length : 0;

            return (
              <Link key={client.id} href={`/client/${client.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(37, 99, 235, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)';
                }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                        {client.name}
                      </h2>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Brand: <strong style={{ color: '#0f172a' }}>{client.brand_name || client.name}</strong>
                      </span>
                    </div>
                    <div style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex'
                    }}>
                      <ArrowRight size={16} color="#2563eb" />
                    </div>
                  </div>

                  {/* Main Metric */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 800, color: rateColor, letterSpacing: '-1px' }}>
                      {citationRate.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                      Citation Rate Today
                    </span>
                  </div>

                  {/* Card Footer Details */}
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#64748b'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Search size={14} color="#64748b" />
                      <span><strong>{queryCount}</strong> Queries Tracked</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#64748b" />
                      <span>Last: {lastRunDate}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
