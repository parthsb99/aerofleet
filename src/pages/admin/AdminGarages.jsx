import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AeroFleetMap from '../../components/AeroFleetMap';

import { API_BASE as API } from '../../config/api.js';

export default function AdminGarages() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Edit Modal
  const [editingGarage, setEditingGarage] = useState(null);
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGarages = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/garages`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setGarages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch garages error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGarages();
  }, [user?.token]);

  const openEdit = (g) => {
    setEditingGarage(g);
    setFormAddress(g.address || '');
    setFormPhone(g.phone || '');
    setFormHours(g.operatingHours || '08:00 AM – 08:00 PM');
    setFormCapacity(g.capacity || 10);
    setFormActive(g.active !== false);
  };

  const handleSave = async () => {
    if (!editingGarage) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/garages/${editingGarage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          address: formAddress,
          phone: formPhone,
          operatingHours: formHours,
          capacity: Number(formCapacity),
          active: formActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setMessage({ type: 'success', text: `Workshop ${editingGarage.name} updated successfully.` });
      setEditingGarage(null);
      fetchGarages();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleQuickToggle = async (g) => {
    try {
      const res = await fetch(`${API}/api/admin/garages/${g.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ active: !g.active })
      });
      if (res.ok) {
        setGarages(garages.map(item => item.id === g.id ? { ...item, active: !item.active } : item));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const totalCapacity = garages.reduce((sum, g) => sum + (g.capacity || 0), 0);
  const activeCount = garages.filter(g => g.active !== false).length;

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Workshops & Garages
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Facility logistics, geographic distribution, operational status, and daily bay capacities.
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 14px', borderRadius: 8,
            background: dark ? '#111' : '#f1f5f9',
            border: `1px solid ${dark ? '#222' : '#e2e8f0'}`,
            fontSize: 12, fontWeight: 600, color: dark ? '#aaa' : '#475569'
          }}>
            <span>Active Centers: <strong style={{ color: '#10b981' }}>{activeCount}/{garages.length}</strong></span>
            <span>•</span>
            <span>Total Fleet Capacity: <strong style={{ color: '#3b82f6' }}>{totalCapacity} bays/day</strong></span>
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

        {/* Map Integration */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 16, overflow: 'hidden', marginBottom: 28
        }}>
          <div style={{
            padding: '14px 18px', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🗺️</span>
              <span>Regional Coverage & Workshop Geo-Locations</span>
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
              Maharashtra, Goa & Gujarat
            </div>
          </div>
          <div style={{ height: 280, position: 'relative' }}>
            <AeroFleetMap />
          </div>
        </div>

        {/* Garages Grid */}
        <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Authorized Service Centers
        </h2>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: dark ? '#666' : '#999' }}>Loading workshops...</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16
          }}>
            {garages.map(g => {
              const isActive = g.active !== false;

              return (
                <div
                  key={g.id}
                  style={{
                    background: dark ? '#111111' : '#ffffff',
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    borderRadius: 14, padding: '20px',
                    display: 'flex', flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: '#2563eb', color: '#fff', textTransform: 'uppercase'
                      }}>
                        {g.city}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 2px', color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {g.name}
                      </h3>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: isActive ? (dark ? '#052e16' : '#dcfce7') : (dark ? '#450a0a' : '#fee2e2'),
                      color: isActive ? '#16a34a' : '#ef4444'
                    }}>
                      {isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: dark ? '#888' : '#64748b', margin: '0 0 14px', lineHeight: 1.4, flex: 1 }}>
                    📍 {g.address}
                  </p>

                  <div style={{
                    borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    paddingTop: 12, marginBottom: 14,
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11
                  }}>
                    <div>
                      <div style={{ color: dark ? '#666' : '#999' }}>Hours:</div>
                      <div style={{ fontWeight: 600, color: dark ? '#ddd' : '#334155', marginTop: 2 }}>{g.operatingHours}</div>
                    </div>
                    <div>
                      <div style={{ color: dark ? '#666' : '#999' }}>Capacity:</div>
                      <div style={{ fontWeight: 600, color: dark ? '#ddd' : '#334155', marginTop: 2 }}>{g.capacity} Bays / Day</div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ color: dark ? '#666' : '#999' }}>Phone:</div>
                      <div style={{ fontWeight: 600, color: '#3b82f6', marginTop: 2 }}>{g.phone}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => openEdit(g)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      Edit Center
                    </button>
                    <button
                      onClick={() => handleQuickToggle(g)}
                      style={{
                        padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: isActive ? (dark ? '#3f1313' : '#fee2e2') : (dark ? '#052e16' : '#dcfce7'),
                        color: isActive ? '#ef4444' : '#16a34a',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      {isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Edit Modal ── */}
        {editingGarage && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 460,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '24px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>
                Edit {editingGarage.name}
              </h3>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Full Address</label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Contact Phone</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Operating Hours</label>
                  <input
                    type="text"
                    value={formHours}
                    onChange={e => setFormHours(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: dark ? '#0a0a0a' : '#f8fafc',
                      border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                      color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Daily Bay Capacity</label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={e => setFormCapacity(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: dark ? '#0a0a0a' : '#f8fafc',
                      border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                      color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="garageActiveCheck"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="garageActiveCheck" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Operational / Open for Bookings
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={saving}
                  onClick={() => setEditingGarage(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={handleSave}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Workshop'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
