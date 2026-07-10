'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getClients, deleteClient } from '../lib/api';
import { Client } from '../types';
import { useRouter } from 'next/navigation';

export default function ClientSwitcher({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error("Failed to load clients for switcher", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (e: React.MouseEvent, clientId: string, clientName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to remove the brand "${clientName}"?`)) {
      try {
        await deleteClient(clientId);
        setIsOpen(false);
        // If currently viewing deleted client, redirect to dashboard
        const match = pathname.match(/^\/client\/([^/]+)/);
        const currentClientId = match ? match[1] : null;
        if (currentClientId === clientId) {
          router.push('/dashboard');
        } else {
          loadClients();
        }
      } catch (err: any) {
        window.alert("Failed to delete brand: " + err.message);
      }
    }
  };

  if (loading || clients.length === 0) {
    return null;
  }

  // Find active client if we are on a client page
  const match = pathname.match(/^\/client\/([^/]+)/);
  const currentClientId = match ? match[1] : null;
  const currentClient = clients.find(c => c.id === currentClientId);

  return (
    <div className="client-switcher" style={{ position: 'relative', width: '100%', marginBottom: '24px' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'none',
          border: 'none',
          padding: isCollapsed ? '6px' : '8px',
          marginLeft: isCollapsed ? '-8px' : '0px',
          borderRadius: '8px',
          cursor: 'pointer',
          width: isCollapsed ? '44px' : '100%',
          backgroundColor: isOpen ? '#1e293b' : 'transparent',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isOpen ? '#1e293b' : 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '6px', 
            backgroundColor: '#2563eb', 
            color: '#ffffff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            flexShrink: 0
          }}>
            {currentClient ? (currentClient.brand_name || currentClient.name).substring(0, 2).toUpperCase() : 'AI'}
          </div>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#f8fafc', 
            maxWidth: '120px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            opacity: isCollapsed ? 0 : 1,
            transition: 'opacity 0.2s',
            width: isCollapsed ? 0 : 'auto'
          }}>
            {currentClient ? (currentClient.brand_name || currentClient.name) : 'Select Client'}
          </span>
        </div>
        {!isCollapsed && (isOpen ? <ChevronUp size={16} color="#94a3b8" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#94a3b8" style={{ flexShrink: 0 }} />)}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {clients.map(client => (
            <div
              key={client.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: client.id === currentClientId ? '#0f172a' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (client.id !== currentClientId) {
                  e.currentTarget.style.backgroundColor = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (client.id !== currentClientId) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Link 
                href={`/client/${client.id}`}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 4px',
                  textDecoration: 'none',
                  color: client.id === currentClientId ? '#ffffff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: client.id === currentClientId ? 600 : 500,
                  flexGrow: 1,
                  overflow: 'hidden'
                }}
              >
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '4px', 
                  backgroundColor: client.id === currentClientId ? '#3b82f6' : '#334155',
                  color: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {(client.brand_name || client.name).substring(0, 2).toUpperCase()}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.brand_name || client.name}
                </span>
              </Link>
              <button
                onClick={(e) => handleDelete(e, client.id, client.brand_name || client.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Remove Brand"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
