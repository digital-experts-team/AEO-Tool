'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClients } from '../../../../lib/api';
import { Client } from '../../../../types';
import ClientTopBar from '../../../../components/ClientTopBar';
import TechnicalAudit from '../../../../components/TechnicalAudit';
import GSCConnect from '../../../../components/GSCConnect';

export default function TechnicalPage() {
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    getClients().then(clients => {
      const c = clients.find(x => x.id === clientId) || null;
      setClient(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return <div style={{ padding: '32px', color: '#a1a1aa' }}>Loading technical suite...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ClientTopBar 
        clientName={client?.brand_name || client?.name || ''} 
        pageTitle="Technical AI Audit & GSC Integration" 
      />
      <GSCConnect clientId={clientId} />
      <TechnicalAudit clientId={clientId} brandName={client?.brand_name} />
    </div>
  );
}
