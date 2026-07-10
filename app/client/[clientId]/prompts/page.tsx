'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClients, getClientPrompts } from '../../../../lib/api';
import { Client } from '../../../../types';
import ClientTopBar from '../../../../components/ClientTopBar';

interface PromptData {
  query: string;
  reasoning: string;
  brand_description: string;
}

export default function PromptsPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    async function loadData() {
      try {
        const [clientsData, promptsData] = await Promise.all([
          getClients(),
          getClientPrompts(clientId)
        ]);

        const currentClient = clientsData.find((c: Client) => c.id === clientId);
        if (!currentClient) throw new Error("Client not found");
        
        setClient(currentClient);
        setPrompts(promptsData);
        
        if (promptsData.length > 0) {
          setSelectedPrompt(promptsData[0]);
        }
      } catch (err: any) {
        console.error("Error loading prompts:", err);
        setError(err.message || "Failed to load prompts data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '12px' }}>Loading Prompt Explorer...</span>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <ClientTopBar isMock={client?.is_mock}={client.brand_name || client.name}
        pageTitle={`${client.brand_name || client.name} — Prompt Explorer`}
      />

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: '600px' }}>
        
        {/* Left Column: Prompts List */}
        <div style={{ 
          width: '320px', 
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              Tracked Queries ({prompts.length})
            </h3>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {prompts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No runs recorded today.
              </div>
            ) : (
              prompts.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPrompt(p)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    backgroundColor: selectedPrompt?.query === p.query ? '#eff6ff' : '#ffffff',
                    borderLeft: selectedPrompt?.query === p.query ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: selectedPrompt?.query === p.query ? 600 : 500, 
                    color: selectedPrompt?.query === p.query ? '#1e40af' : '#334155' 
                  }}>
                    {p.query}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Prompt Details */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflowY: 'auto'
        }}>
          {selectedPrompt ? (
            <>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedPrompt.query}
                </h2>
                <span style={{ fontSize: '13px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 500 }}>
                  Latest AI Response Extract
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 600 }}>
                    Brand Description / Context
                  </h4>
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: 1.6
                  }}>
                    {selectedPrompt.brand_description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Brand not explicitly described.</span>}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 600 }}>
                    AI Reasoning
                  </h4>
                  <div style={{ 
                    backgroundColor: '#fefce8', 
                    border: '1px solid #fef08a', 
                    borderRadius: '8px', 
                    padding: '16px',
                    fontSize: '14px',
                    color: '#854d0e',
                    lineHeight: 1.6
                  }}>
                    {selectedPrompt.reasoning || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>No reasoning provided.</span>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '14px' }}>
              Select a query from the left to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
