'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Link as LinkIcon, MessageSquare, Zap, ExternalLink, Globe, LineChart, Award } from 'lucide-react';
import ClientSwitcher from './ClientSwitcher';

export default function Sidebar() {
  const pathname = usePathname();
  const match = pathname.match(/^\/client\/([^/]+)/);
  const currentClientId = match ? match[1] : null;

  const getLinkStyle = (path: string, exact: boolean = false) => {
    const isActive = exact ? pathname === path : (pathname === path || (path !== '/dashboard' && pathname.startsWith(path)));
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 600,
      color: isActive ? '#ffffff' : '#475569',
      backgroundColor: isActive ? '#2563eb' : 'transparent',
      transition: 'all 0.2s',
      width: '100%',
      boxSizing: 'border-box' as const
    };
  };

  return (
    <aside 
      style={{
        width: '260px',
        flexShrink: 0,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        boxSizing: 'border-box',
        zIndex: 50
      }}
    >
      {/* Brand Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center' }}>
        <Link href="/dashboard" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          textDecoration: 'none', 
          color: '#0f172a'
        }}>
          <span style={{ 
            fontWeight: 855, 
            fontSize: '22px', 
            letterSpacing: '-0.5px',
            color: '#1e3a8a'
          }}>
            Synthetix
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            INTELLIGENCE SUITE
          </span>
        </Link>
      </div>

      {/* Navigation Group */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {currentClientId ? (
              <>
                <Link href={`/client/${currentClientId}/brand-overview`} style={getLinkStyle(`/client/${currentClientId}/brand-overview`)}>
                  <LayoutDashboard size={18} style={{ flexShrink: 0 }} /> 
                  <span>Overview</span>
                </Link>

                <Link href={`/client/${currentClientId}/citations`} style={getLinkStyle(`/client/${currentClientId}/citations`)}>
                  <LinkIcon size={18} style={{ flexShrink: 0 }} />
                  <span>Citations</span>
                </Link>

                <Link href={`/client/${currentClientId}/technical`} style={getLinkStyle(`/client/${currentClientId}/technical`)}>
                  <Globe size={18} style={{ flexShrink: 0 }} />
                  <span>Technical Audit</span>
                </Link>

                <Link href={`/client/${currentClientId}`} style={getLinkStyle(`/client/${currentClientId}`, true)}>
                  <LineChart size={18} style={{ flexShrink: 0 }} />
                  <span>Trends</span>
                </Link>

                <Link href={`/client/${currentClientId}/prompts`} style={getLinkStyle(`/client/${currentClientId}/prompts`)}>
                  <MessageSquare size={18} style={{ flexShrink: 0 }} />
                  <span>Brief</span>
                </Link>
              </>
            ) : (
              <Link href="/dashboard" style={getLinkStyle('/dashboard', true)}>
                <LayoutDashboard size={18} style={{ flexShrink: 0 }} /> 
                <span>Overview</span>
              </Link>
            )}
          </div>
        </div>

        {currentClientId && (
          <div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#94a3b8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px', 
              marginBottom: '8px', 
              paddingLeft: '12px'
            }}>
              Search AI
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Link href={`/client/${currentClientId}/google-ai`} style={getLinkStyle(`/client/${currentClientId}/google-ai`)}>
                <Globe size={18} style={{ flexShrink: 0 }} />
                <span>Google AI Visibility</span>
              </Link>
              <Link href={`/client/${currentClientId}/actions`} style={getLinkStyle(`/client/${currentClientId}/actions`)}>
                <Zap size={18} style={{ flexShrink: 0 }} />
                <span>Action Center</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Generate Report Button */}
      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <button
          style={{
            width: '100%',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid currentColor',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: 1
          }}>+</span>
          <span>Generate Report</span>
        </button>
      </div>
    </aside>
  );
}
