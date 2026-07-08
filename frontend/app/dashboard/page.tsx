'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Fingerprint, BadgeCheck, LineChart, Sparkles, CheckCircle2, Plus, X, Loader2 } from 'lucide-react';
import { createClient, suggestQueries } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestQueries = async () => {
    if (!formData.brandName.trim()) {
      setError("Please enter the Primary Brand Name first to suggest queries.");
      return;
    }
    
    try {
      setSuggesting(true);
      setError(null);
      
      const aliases = formData.aliases.split(',').map(s => s.trim()).filter(Boolean);
      const competitors = formData.competitors.split(',').map(s => s.trim()).filter(Boolean);
      
      const suggestions = await suggestQueries(
        formData.brandName.trim(),
        aliases.length > 0 ? aliases : [formData.brandName.trim()],
        competitors
      );
      
      setFormData(prev => ({
        ...prev,
        queries: suggestions.join('\n')
      }));
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to auto-suggest queries.");
    } finally {
      setSuggesting(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    aliases: '',
    competitors: '',
    queries: '',
    domain: '',
    industry: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.brandName.trim()) {
      setError("Project/Client Name and Primary Brand Name are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Parse comma-separated and newline-separated inputs
      const aliases = formData.aliases.split(',').map(s => s.trim()).filter(Boolean);
      const competitors = formData.competitors.split(',').map(s => s.trim()).filter(Boolean);
      const queries = formData.queries.split('\n').map(s => s.trim()).filter(Boolean);

      const newClient = await createClient({
        name: formData.name.trim(),
        brand_name: formData.brandName.trim(),
        brand_aliases: aliases.length > 0 ? aliases : [formData.brandName.trim()],
        competitors: competitors,
        queries: queries,
        domain: formData.domain.trim(),
        industry: formData.industry.trim()
      });

      // Reset form and close modal
      setFormData({
        name: '',
        brandName: '',
        aliases: '',
        competitors: '',
        queries: '',
        domain: '',
        industry: ''
      });
      setIsModalOpen(false);

      // Redirect user to newly created client details page
      router.push(`/client/${newClient.id}`);
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err: any) {
      console.error("Error creating brand:", err);
      setError(err.message || "Failed to save brand details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 0',
      width: '100%'
    }}>
      
      {/* Center Graphic Icon */}
      <div style={{
        width: '100px',
        height: '100px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 40px -10px rgba(37, 99, 235, 0.15)',
        marginBottom: '48px',
        position: 'relative'
      }}>
        <LineChart size={48} color="#2563eb" strokeWidth={2.5} />
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: '#2563eb',
          borderRadius: '50%',
          padding: '4px',
          border: '3px solid #f8fafc'
        }}>
          <CheckCircle2 size={16} color="#ffffff" />
        </div>
        <Sparkles size={24} color="#3b82f6" style={{ position: 'absolute', left: '-12px', top: '12px' }} />
      </div>

      {/* Hero Typography */}
      <h1 style={{
        fontSize: '52px',
        fontWeight: 800,
        color: '#0f172a',
        margin: '0 0 20px 0',
        textAlign: 'center',
        letterSpacing: '-1.5px',
        lineHeight: 1.1
      }}>
        Protect Your Brand in the <span style={{ color: '#3b82f6' }}>AI Era</span>
      </h1>

      <p style={{
        fontSize: '17px',
        color: '#475569',
        maxWidth: '600px',
        textAlign: 'center',
        margin: '0 0 32px 0',
        lineHeight: 1.6
      }}>
        Take control of how Large Language Models perceive and reference your intellectual property. Select a client from the sidebar switcher or register a new brand to start monitoring.
      </p>

      {/* Add New Brand Trigger Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 28px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.2s',
          marginBottom: '56px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1d4ed8';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Plus size={20} />
        <span>Add New Brand</span>
      </button>

      {/* Feature Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1100px',
        marginTop: '20px'
      }}>
        {/* Card 1 */}
        <div className="glass-card" style={{
          padding: '32px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <Network size={24} />
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0' }}>01</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>Connect Data</h3>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
            Securely index your brand's digital footprints, whitepapers, and official verification tokens for AI ingestion.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-card" style={{
          padding: '32px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <Fingerprint size={24} />
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0' }}>02</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>Define Assets</h3>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
            Map out core keywords, trademarked product names, and unique value narratives you want AI to prioritize.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-card" style={{
          padding: '32px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <BadgeCheck size={24} />
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0' }}>03</span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>Audit Engine</h3>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
            Receive live daily reports on citation accuracy across GPT-4, Claude 3, Gemini, and Llama instances.
          </p>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add New Brand</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Project / Client Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Project / Client Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Notion Workspace"
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Brand Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Primary Brand Name</label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  placeholder="e.g. Notion"
                  required
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Brand Aliases */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Brand Aliases <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>(Comma separated)</span>
                </label>
                <input
                  type="text"
                  name="aliases"
                  value={formData.aliases}
                  onChange={handleInputChange}
                  placeholder="e.g. Notion, Notion AI, Notion App"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Competitors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Competitor Brands <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>(Comma separated)</span>
                </label>
                <input
                  type="text"
                  name="competitors"
                  value={formData.competitors}
                  onChange={handleInputChange}
                  placeholder="e.g. Obsidian, Coda, Evernote"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Primary Domain */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Primary Website Domain</label>
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  placeholder="e.g. notion.so"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Industry / Niche */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Brand Industry / Niche</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  placeholder="e.g. productivity software"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Queries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    Target Search Prompts <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>(One per line)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestQueries}
                    disabled={suggesting}
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {suggesting ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                    <span>{suggesting ? 'Analyzing...' : 'Auto-Suggest via AI'}</span>
                  </button>
                </div>
                <textarea
                  name="queries"
                  value={formData.queries}
                  onChange={handleInputChange}
                  placeholder="best note taking app&#10;notion vs obsidian&#10;best team collaboration software"
                  rows={4}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Errors */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fff5f5',
                  border: '1px solid #fee2e2',
                  borderRadius: '10px',
                  color: '#e11d48',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '12px',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Saving to Sheets...</span>
                    </>
                  ) : (
                    <span>Save Brand</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
