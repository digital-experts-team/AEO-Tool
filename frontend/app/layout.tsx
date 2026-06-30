import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Bot, LayoutDashboard, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'AI Citation Tracker | Generative Engine Analytics',
  description: 'Monitor, score, and optimize your brand presence across Perplexity, Claude, and AI engines.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header Navigation */}
        <header style={{
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#0f172a' }}>
              <div style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}>
                <Bot size={20} color="#ffffff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>AI Citation Tracker</span>
            </Link>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>
                <LayoutDashboard size={16} color="#2563eb" /> Dashboard
              </Link>
              <div style={{
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={12} /> Google Sheets Active
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 24px', boxSizing: 'border-box' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          AI Citation Tracker © 2026 • Enterprise GEO Intelligence
        </footer>
      </body>
    </html>
  );
}
