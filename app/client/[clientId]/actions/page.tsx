'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClients, getClientActions } from '../../../../lib/api';
import { Client } from '../../../../types';
import { CheckCircle2, Zap } from 'lucide-react';
import ClientTopBar from '../../../../components/ClientTopBar';

interface ActionItem {
  id: string;
  title: string;
  description: string;
}

export default function ActionCenterPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    async function loadData() {
      try {
        const [clientsData, actionsData] = await Promise.all([
          getClients(),
          getClientActions(clientId)
        ]);

        const currentClient = clientsData.find((c: Client) => c.id === clientId);
        if (!currentClient) throw new Error("Client not found");
        
        setClient(currentClient);
        setActions(actionsData);
        
      } catch (err: any) {
        console.error("Error loading actions:", err);
        setError(err.message || "Failed to load actions data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clientId]);

  const handleMarkComplete = (id: string) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '12px' }}>Loading Action Center...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '24px', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!client) {
    return <div style={{ padding: '24px' }}>Client not found.</div>;
  }

  const visibleActions = actions.filter(a => !completedActions.has(a.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <ClientTopBar
        clientName={client.brand_name || client.name}
        pageTitle={`${client.brand_name || client.name} — Action Center`}
      />

      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Optimization Opportunities
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
              Complete these recommendations to improve {client.brand_name || client.name}'s visibility in AI search engines.
            </p>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '12px' }}>
            {visibleActions.length} Pending
          </div>
        </div>
        
        {visibleActions.length === 0 ? (
          <div style={{ 
            padding: '48px 24px', 
            textAlign: 'center', 
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px'
          }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>All Caught Up!</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              You've completed all recommended actions for today. Check back tomorrow for new insights.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {visibleActions.map(action => (
              <div key={action.id} style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '24px',
                backgroundColor: '#f8fafc'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {action.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                    {action.description}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkComplete(action.id)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <CheckCircle2 size={16} color="#10b981" />
                  Mark Complete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
