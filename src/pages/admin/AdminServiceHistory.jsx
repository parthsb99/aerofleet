import React, { useState, useEffect, useContext, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import BrandLogo from '../../components/BrandLogo';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminServiceHistory() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState('ALL');
  const [garageFilter, setGarageFilter] = useState('ALL');

  // Selected item for pricing breakdown modal
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchHistory = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/service-history`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch service history error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.token]);

  // Real-Time Socket.IO Updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchHistory();
    };

    socket.on('service:updated', handleUpdate);
    socket.on('dashboard:updated', handleUpdate);
    socket.on('booking:updated', handleUpdate);
    socket.on('reconnect', handleUpdate);

    return () => {
      socket.off('service:updated', handleUpdate);
      socket.off('dashboard:updated', handleUpdate);
      socket.off('booking:updated', handleUpdate);
      socket.off('reconnect', handleUpdate);
    };
  }, [socket]);

  // Unique Garages
  const uniqueGarages = useMemo(() => {
    const s = new Set();
    history.forEach(h => {
      const g = h.garageCity || h.garageLocation;
      if (g) s.add(g);
    });
    return Array.from(s).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        (h.user?.name && h.user.name.toLowerCase().includes(q)) ||
        (h.vehicle?.make && h.vehicle.make.toLowerCase().includes(q)) ||
        (h.vehicle?.model && h.vehicle.model.toLowerCase().includes(q)) ||
        (h.vehicle?.licensePlate && h.vehicle.licensePlate.toLowerCase().includes(q));

      const matchPackage =
        packageFilter === 'ALL' ||
        (h.servicePackage && h.servicePackage.toLowerCase() === packageFilter.toLowerCase());

      const matchGarage =
        garageFilter === 'ALL' ||
        (h.garageCity === garageFilter || h.garageLocation === garageFilter);

      return matchQuery && matchPackage && matchGarage;
    });
  }, [history, search, packageFilter, garageFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['Completion Date', 'Booking ID', 'Client Name', 'Client Email', 'Vehicle Make', 'Vehicle Model', 'Registration', 'Service Package', 'Extra Services', 'Garage Location', 'Final Cost (INR)'];
    const rows = filteredHistory.map(h => [
      h.completedAt ? new Date(h.completedAt).toISOString().split('T')[0] : h.serviceDate,
      h._id,
      `"${h.user?.name || 'Client'}"`,
      h.user?.email || '',
      h.vehicle?.make || '',
      h.vehicle?.model || '',
      h.vehicle?.licensePlate || '',
      h.servicePackage || 'Standard',
      `"${(h.extraServices || []).map(x => x.label || x.id).join(', ')}"`,
      `"${h.garageCity || h.garageLocation || 'Main Hub'}"`,
      h.finalPrice || h.estimatedPrice || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerofleet-completed-services-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = filteredHistory.reduce((sum, h) => sum + (h.finalPrice || h.estimatedPrice || 0), 0);

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Master Service History
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Historical archive of all completed fleet maintenance events, finalized pricing, and audit records.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              padding: '6px 14px', borderRadius: 8,
              background: dark ? '#111' : '#f1f5f9',
              border: `1px solid ${dark ? '#222' : '#e2e8f0'}`,
              fontSize: 12, fontWeight: 600, color: dark ? '#aaa' : '#475569'
            }}>
              Completed: <strong style={{ color: '#10b981' }}>{filteredHistory.length}</strong> • Total: <strong style={{ color: '#3b82f6' }}>{formatINR(totalRevenue)}</strong>
            </div>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by client, plate, vehicle model..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: 11, top: 10, color: dark ? '#555' : '#94a3b8', fontSize: 13 }}>🔍</span>
          </div>

          {/* Package Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Package:</span>
            <select
              value={packageFilter}
              onChange={e => setPackageFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Packages</option>
              <option value="Aero">Aero</option>
              <option value="Pro">Pro</option>
              <option value="Elite">Elite</option>
            </select>
          </div>

          {/* Garage Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Garage:</span>
            <select
              value={garageFilter}
              onChange={e => setGarageFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Garages</option>
              {uniqueGarages.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* History Table */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              Loading completed service records...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              No completed records found matching filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{
                    borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    color: dark ? '#6b7280' : '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Completion Date</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Vehicle</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Client</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Package</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Workshop</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Final Price</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Pricing Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => (
                    <tr
                      key={h._id}
                      style={{
                        borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          {h.completedAt
                            ? new Date(h.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                            : h.serviceDate}
                        </div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Completed ✓</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {h.vehicle?.make && <BrandLogo brand={h.vehicle.make} size={26} />}
                          <div>
                            <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              {h.vehicle ? `${h.vehicle.make} ${h.vehicle.model}` : 'Vehicle'}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>
                              {h.vehicle?.licensePlate || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: dark ? '#d1d5db' : '#334155', fontWeight: 500 }}>
                          {h.user?.name || 'Client'}
                        </div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                          {h.user?.email || ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: dark ? '#1e293b' : '#eff6ff',
                          color: '#3b82f6'
                        }}>
                          {h.servicePackage || 'Standard'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', color: dark ? '#aaa' : '#64748b' }}>
                        {h.garageCity || h.garageLocation || 'Main Hub'}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: 14 }}>
                          {formatINR(h.finalPrice || h.estimatedPrice || 0)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedItem(h)}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
                            border: 'none', cursor: 'pointer'
                          }}
                        >
                          Invoice Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pricing Detail Modal ── */}
        {selectedItem && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 540,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '26px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Finalized Pricing Summary</h3>
                  <div style={{ fontSize: 11, color: dark ? '#777' : '#94a3b8', marginTop: 2 }}>
                    ID: {selectedItem._id}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: dark ? '#aaa' : '#666' }}
                >
                  ✕
                </button>
              </div>

              {/* Service & Vehicle Info */}
              <div style={{
                background: dark ? '#0a0a0a' : '#f8fafc',
                padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Vehicle:</span>
                  <strong>{selectedItem.vehicle?.make} {selectedItem.vehicle?.model} ({selectedItem.vehicle?.licensePlate})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Client:</span>
                  <span>{selectedItem.user?.name} ({selectedItem.user?.email})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Workshop:</span>
                  <span>{selectedItem.garageCity || selectedItem.garageLocation || 'Main Workshop'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Completion Timestamp:</span>
                  <span>{selectedItem.completedAt ? new Date(selectedItem.completedAt).toLocaleString('en-IN') : selectedItem.serviceDate}</span>
                </div>
              </div>

              {/* Cost Line Items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: dark ? '#aaa' : '#475569', textTransform: 'uppercase' }}>
                  Cost Breakdown
                </div>
                <div style={{ border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, borderRadius: 8, padding: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
                    <span>{selectedItem.servicePackage} Package ({selectedItem.serviceQuantity || 1} session)</span>
                    <strong style={{ color: dark ? '#fff' : '#000' }}>
                      {formatINR(selectedItem.packagePrice || selectedItem.estimatedPrice)}
                    </strong>
                  </div>
                  {selectedItem.extraServices?.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, color: dark ? '#aaa' : '#64748b' }}>
                      <span>+ {ex.label || ex.id || 'Extra Service'}</span>
                      <span>{formatINR(ex.price)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6,
                    borderTop: `1px solid ${dark ? '#222' : '#e2e8f0'}`, fontWeight: 800, fontSize: 15
                  }}>
                    <span>Final Amount Billed:</span>
                    <span style={{ color: '#10b981' }}>
                      {formatINR(selectedItem.finalPrice || selectedItem.estimatedPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
