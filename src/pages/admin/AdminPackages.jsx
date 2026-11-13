import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminPackages() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [packages, setPackages] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Edit package modal
  const [editingPkg, setEditingPkg] = useState(null);
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgFeatures, setPkgFeatures] = useState('');
  const [savingPkg, setSavingPkg] = useState(false);

  // Edit / Add extra service modal
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraPrice, setExtraPrice] = useState('');
  const [extraCategory, setExtraCategory] = useState('');
  const [savingExtra, setSavingExtra] = useState(false);

  const fetchData = () => {
    if (!user?.token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/admin/packages`, { headers: { Authorization: `Bearer ${user.token}` } }).then(r => r.json()),
      fetch(`${API}/api/admin/extra-services`, { headers: { Authorization: `Bearer ${user.token}` } }).then(r => r.json())
    ])
      .then(([pkgs, extras]) => {
        setPackages(Array.isArray(pkgs) ? pkgs : []);
        setExtraServices(Array.isArray(extras) ? extras : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch packages error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [user?.token]);

  const openPkgEdit = (p) => {
    setEditingPkg(p);
    setPkgPrice(p.basePrice || 0);
    setPkgDesc(p.description || '');
    setPkgFeatures((p.features || []).join('\n'));
  };

  const handleSavePkg = async () => {
    if (!editingPkg) return;
    setSavingPkg(true);
    const updatedList = packages.map(p => {
      if (p.id === editingPkg.id) {
        return {
          ...p,
          basePrice: Number(pkgPrice),
          description: pkgDesc,
          features: pkgFeatures.split('\n').map(s => s.trim()).filter(Boolean)
        };
      }
      return p;
    });

    try {
      const res = await fetch(`${API}/api/admin/packages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ packages: updatedList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setPackages(updatedList);
      setMessage({ type: 'success', text: `${editingPkg.name} updated successfully.` });
      setEditingPkg(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPkg(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const openExtraEdit = (ex) => {
    setEditingExtra(ex || { id: `extra-${Date.now()}`, isNew: true });
    setExtraLabel(ex ? ex.label : '');
    setExtraPrice(ex ? ex.price : '');
    setExtraCategory(ex ? ex.category : 'General');
  };

  const handleSaveExtra = async () => {
    if (!extraLabel || !extraPrice) return;
    setSavingExtra(true);

    let updatedList;
    if (editingExtra.isNew) {
      updatedList = [
        ...extraServices,
        {
          id: extraLabel.toLowerCase().replace(/\s+/g, '-'),
          label: extraLabel,
          price: Number(extraPrice),
          category: extraCategory || 'General',
          active: true
        }
      ];
    } else {
      updatedList = extraServices.map(ex => {
        if (ex.id === editingExtra.id) {
          return {
            ...ex,
            label: extraLabel,
            price: Number(extraPrice),
            category: extraCategory
          };
        }
        return ex;
      });
    }

    try {
      const res = await fetch(`${API}/api/admin/extra-services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ extraServices: updatedList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setExtraServices(updatedList);
      setMessage({ type: 'success', text: `Extra service "${extraLabel}" saved.` });
      setEditingExtra(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingExtra(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleToggleExtraStatus = async (item) => {
    const updatedList = extraServices.map(ex => {
      if (ex.id === item.id) {
        return { ...ex, active: !ex.active };
      }
      return ex;
    });

    try {
      const res = await fetch(`${API}/api/admin/extra-services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ extraServices: updatedList })
      });
      if (res.ok) {
        setExtraServices(updatedList);
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Service Packages & Add-ons
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Configure base package offerings, tier specifications, pricing structures, and supplementary add-on catalog.
            </p>
          </div>
        </div>

        {/* Notification Banner */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 20,
            background: message.type === 'success' ? (dark ? '#064e3b' : '#ecfdf5') : (dark ? '#7f1d1d' : '#fef2f2'),
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#34d399' : '#f87171',
            fontSize: 13, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Section 1: 3 Core Packages */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Core Service Packages
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20
          }}>
            {packages.map(p => {
              const isPro = p.id === 'Pro';
              const isElite = p.id === 'Elite';
              const accentColor = isElite ? '#8b5cf6' : isPro ? '#2563eb' : '#10b981';

              return (
                <div
                  key={p.id}
                  style={{
                    background: dark ? '#111111' : '#ffffff',
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    borderRadius: 16, padding: '24px',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: isElite ? (dark ? '#2e1065' : '#ede9fe') : isPro ? (dark ? '#1e3a8a' : '#dbeafe') : (dark ? '#052e16' : '#dcfce7'),
                      color: accentColor
                    }}>
                      {p.badge || 'Tier'}
                    </span>
                    <button
                      onClick={() => openPkgEdit(p)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: dark ? '#1f2937' : '#f1f5f9', color: dark ? '#f0f0f0' : '#334155',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: dark ? '#f0f0f0' : '#0f172a' }}>
                    {p.name}
                  </h3>
                  <div style={{ fontSize: 26, fontWeight: 900, color: accentColor, marginBottom: 12 }}>
                    {formatINR(p.basePrice)}
                    <span style={{ fontSize: 12, fontWeight: 500, color: dark ? '#6b7280' : '#94a3b8' }}> / service</span>
                  </div>

                  <p style={{ fontSize: 13, color: dark ? '#888' : '#64748b', margin: '0 0 16px', lineHeight: 1.4, minHeight: 36 }}>
                    {p.description}
                  </p>

                  <div style={{ borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, paddingTop: 14, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                      Included Features:
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(p.features || []).map((feat, i) => (
                        <li key={i} style={{ fontSize: 12, color: dark ? '#d1d5db' : '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: accentColor, fontWeight: 800 }}>✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Supplementary Extra Services */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extra Services Catalog ({extraServices.length})
            </h2>
            <button
              onClick={() => openExtraEdit(null)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
              }}
            >
              + Add Extra Service
            </button>
          </div>

          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{
                  borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                  background: dark ? '#0a0a0a' : '#f8fafc',
                  color: dark ? '#6b7280' : '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Service Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Price</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {extraServices.map(ex => (
                  <tr
                    key={ex.id}
                    style={{
                      borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                      transition: 'background 0.1s'
                    }}
                  >
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                      {ex.label}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: dark ? '#1f2937' : '#f1f5f9', color: dark ? '#9ca3af' : '#475569'
                      }}>
                        {ex.category || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#3b82f6' }}>
                      {formatINR(ex.price)}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: ex.active !== false ? (dark ? '#052e16' : '#dcfce7') : (dark ? '#450a0a' : '#fee2e2'),
                        color: ex.active !== false ? '#16a34a' : '#ef4444'
                      }}>
                        {ex.active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openExtraEdit(ex)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                            border: 'none', cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleExtraStatus(ex)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: ex.active !== false ? (dark ? '#3f1313' : '#fee2e2') : (dark ? '#052e16' : '#dcfce7'),
                            color: ex.active !== false ? '#ef4444' : '#16a34a',
                            border: 'none', cursor: 'pointer'
                          }}
                        >
                          {ex.active !== false ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Edit Package Modal ── */}
        {editingPkg && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 480,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '24px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>
                Edit {editingPkg.name}
              </h3>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Base Price (₹)</label>
                <input
                  type="number"
                  value={pkgPrice}
                  onChange={e => setPkgPrice(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 14, fontWeight: 700, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  rows={2}
                  value={pkgDesc}
                  onChange={e => setPkgDesc(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>
                  Included Features (one per line)
                </label>
                <textarea
                  rows={5}
                  value={pkgFeatures}
                  onChange={e => setPkgFeatures(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 12, outline: 'none', fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={savingPkg}
                  onClick={() => setEditingPkg(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={savingPkg}
                  onClick={handleSavePkg}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {savingPkg ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit / Add Extra Service Modal ── */}
        {editingExtra && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 420,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '24px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>
                {editingExtra.isNew ? 'Add Extra Service' : 'Edit Extra Service'}
              </h3>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Service Label</label>
                <input
                  type="text"
                  placeholder="e.g., Brake Fluid Flush"
                  value={extraLabel}
                  onChange={e => setExtraLabel(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Category</label>
                <input
                  type="text"
                  placeholder="e.g., Detailing, Safety, Climate"
                  value={extraCategory}
                  onChange={e => setExtraCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Price (₹)</label>
                <input
                  type="number"
                  value={extraPrice}
                  onChange={e => setExtraPrice(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 14, fontWeight: 700, outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={savingExtra}
                  onClick={() => setEditingExtra(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={savingExtra || !extraLabel || !extraPrice}
                  onClick={handleSaveExtra}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {savingExtra ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
