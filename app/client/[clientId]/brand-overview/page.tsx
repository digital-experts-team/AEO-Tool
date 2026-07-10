'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClients, getBrandOverview } from '../../../../lib/api';
import { Client, BrandOverviewResponse } from '../../../../types';
import ClientTopBar from '../../../../components/ClientTopBar';
import GeneralOverview from '../../../../components/GeneralOverview';

export default function BrandOverviewPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [brandOverview, setBrandOverview] = useState<BrandOverviewResponse | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    async function loadData() {
      try {
        setLoading(true);
        const [clientsData, overviewData] = await Promise.all([
          getClients(),
          getBrandOverview(clientId)
        ]);

        const currentClient = clientsData.find((c: Client) => c.id === clientId);
        if (!currentClient) throw new Error("Client not found");
        
        setClient(currentClient);
        setBrandOverview(overviewData);
        
      } catch (err: any) {
        console.error("Error loading brand overview:", err);
        setError(err.message || "Failed to load brand overview data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '300px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={{ height: '260px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <div style={{ height: '260px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '24px', color: '#dc2626' }}>
        {error || 'Client not found in directory.'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ClientTopBar isMock={client?.is_mock} clientName={client?.brand_name || client?.name || ''} 
        pageTitle="Brand Overview" 
      />
      {brandOverview && <GeneralOverview data={brandOverview} />}
    </div>
  );
}
