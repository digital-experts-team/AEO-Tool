import './globals.css';
import React from 'react';
import Sidebar from '../components/Sidebar';
import MainLayoutWrapper from '../components/MainLayoutWrapper';

export const metadata = {
  title: 'AI Citation Tracker | Generative Engine Analytics',
  description: 'Monitor, score, and optimize your brand presence across Gemini, Claude, and AI engines.',
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
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex' }}>
        
        <Sidebar />

        <MainLayoutWrapper>
          {children}
        </MainLayoutWrapper>
      </body>
    </html>
  );
}
