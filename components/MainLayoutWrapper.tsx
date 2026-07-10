'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Settings, ChevronDown, Bell, Building } from 'lucide-react';
import { getClients } from '../lib/api';
import { Client } from '../types';
import { deleteClient } from '../lib/api';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';


export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract client ID from pathname if exists
  const match = pathname.match(/^\/client\/([^/]+)/);
  const currentClientId = match ? match[1] : null;

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch (e) {
      console.error("Failed to load clients in layout wrapper", e);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const handleDelete = async (e: React.MouseEvent, clientId: string, clientName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to remove the brand "${clientName}"?`)) {
      try {
        await deleteClient(clientId);
        setIsDropdownOpen(false);
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


  useEffect(() => {
    if (currentClientId && clients.length > 0) {
      const client = clients.find(c => c.id === currentClientId);
      if (client) {
        setCurrentClientName(client.name);
      }
    } else {
      setCurrentClientName(null);
    }
  }, [currentClientId, clients]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      position: 'relative',
      overflowX: 'hidden',
      minWidth: 0
    }}>
      {/* Universal Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 40px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Left Side: Client Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} ref={dropdownRef}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            color: '#1e3a8a'
          }}>
            <Building size={20} />
          </div>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                {currentClientName || 'Select Client'}
              </span>
              <ChevronDown size={16} color="#64748b" />
            </div>
          </div>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 100,
              minWidth: '220px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              {clients.map(client => (
                <div
                  key={client.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '8px',
                    backgroundColor: client.id === currentClientId ? '#f1f5f9' : 'transparent',
                    padding: '2px 4px',
                  }}
                  onMouseEnter={(e) => {
                    if (client.id !== currentClientId) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
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
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px',
                      textDecoration: 'none',
                      color: client.id === currentClientId ? '#0f172a' : '#64748b',
                      fontSize: '14px',
                      fontWeight: 500,
                      flexGrow: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.name}
                    </span>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, client.id, client.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
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

        {/* Middle: Search Bar */}
        <div style={{
          position: 'relative',
          width: '420px'
        }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search analytics, queries, or reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 44px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#0f172a',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Right Side: Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#64748b';
          }}
          >
            <Bell size={18} />
          </button>
          
          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#64748b';
          }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        padding: '32px 40px', 
        position: 'relative', 
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
    </div>
  );
}
