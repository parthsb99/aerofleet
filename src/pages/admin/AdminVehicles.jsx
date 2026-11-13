import React, { useState, useEffect, useContext, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../../components/BrandLogo';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminVehicles() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [makeFilter, setMakeFilter] = useState('ALL');

  // Selected vehicle for details modal
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchVehicles = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/vehicles`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setVehicles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch vehicles error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVehicles();
  }, [user?.token]);

  const openVehicleDetails = (v) => {
    setSelectedVehicle(v);
    setDetailsLoading(true);
    fetch(`${API}/api/admin/vehicles/${v._id}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setVehicleDetails(data);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error('Vehicle details error:', err);
        setDetailsLoading(false);
      });
  };

  // Distinct makes for filter
  const uniqueMakes = useMemo(() => {
    const s = new Set();
    vehicles.forEach(v => { if (v.make) s.add(v.make); });
    return Array.from(s).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        (v.make && v.make.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
        (v.owner && (
          (v.owner.name && v.owner.name.toLowerCase().includes(q)) ||
          (v.owner.email && v.owner.email.toLowerCase().includes(q))
        ));

      const matchMake = makeFilter === 'ALL' || v.make === makeFilter;

      return matchQuery && matchMake;
    });
  }, [vehicles, search, makeFilter]);

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Fleet Vehicles
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Master registry of all vehicles enrolled across AeroFleet with owner records and service logs.
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 8,
            background: dark ? '#111' : '#f1f5f9',
            border: `1px solid ${dark ? '#222' : '#e2e8f0'}`,
            fontSize: 12, fontWeight: 600, color: dark ? '#aaa' : '#475569'
          }}>
            <span>Total Enrolled: <strong style={{ color: '#3b82f6' }}>{vehicles.length}</strong></span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by vehicle, registration number, or owner..."
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

          {/* Make Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Manufacturer:</span>
            <select
              value={makeFilter}
              onChange={e => setMakeFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Manufacturers</option>
              {uniqueMakes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicles Table */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              Loading fleet vehicles...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              No vehicles found matching criteria.
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
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Vehicle Details</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Registration</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Owner</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Fuel / Type</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Services</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Total Spent</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Enrolled</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr
                      key={v._id}
                      style={{
                        borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <BrandLogo brand={v.make} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              {v.make} {v.model}
                            </div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                              {v.year || '—'} {v.color ? `• ${v.color}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
                          padding: '3px 8px', borderRadius: 6,
                          background: dark ? '#1e293b' : '#e0f2fe',
                          color: '#0284c7', border: `1px solid ${dark ? '#0369a1' : '#bae6fd'}`
                        }}>
                          {v.licensePlate || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: dark ? '#d1d5db' : '#334155' }}>
                          {v.owner?.name || v.userId?.name || 'Unknown Owner'}
                        </div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                          {v.owner?.email || v.userId?.email || ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: dark ? '#1f2937' : '#f1f5f9',
                          color: dark ? '#9ca3af' : '#475569'
                        }}>
                          {v.fuelType || 'Petrol'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', color: dark ? '#f0f0f0' : '#0f172a', fontWeight: 600 }}>
                        {v.completedCount ?? v.completedBookingsCount ?? 0}
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        {formatINR(v.totalExpenditure || 0)}
                      </td>

                      <td style={{ padding: '14px 18px', color: dark ? '#9ca3af' : '#64748b', fontSize: 12 }}>
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => openVehicleDetails(v)}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                          }}
                        >
                          History & Specs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Vehicle Details Modal ── */}
        {selectedVehicle && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto',
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '28px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <BrandLogo brand={selectedVehicle.make} size={42} />
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
                        padding: '2px 8px', borderRadius: 4,
                        background: '#0284c7', color: '#fff'
                      }}>
                        {selectedVehicle.licensePlate}
                      </span>
                      <span style={{ fontSize: 12, color: dark ? '#888' : '#64748b' }}>
                        Owner: <strong>{selectedVehicle.owner?.name}</strong> ({selectedVehicle.owner?.email})
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedVehicle(null); setVehicleDetails(null); }}
                  style={{
                    background: dark ? '#1f2937' : '#f1f5f9',
                    border: 'none', borderRadius: '50%', width: 32, height: 32,
                    fontSize: 16, cursor: 'pointer', color: dark ? '#aaa' : '#666'
                  }}
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: dark ? '#666' : '#999' }}>Loading vehicle specs & history...</div>
              ) : vehicleDetails ? (
                <div>
                  {/* Vehicle Spec Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24,
                    background: dark ? '#0a0a0a' : '#f8fafc', padding: 14, borderRadius: 10,
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Fuel Type</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{vehicleDetails.vehicle?.fuelType || 'Petrol'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Color</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{vehicleDetails.vehicle?.color || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Odometer</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{vehicleDetails.vehicle?.mileage ? `${vehicleDetails.vehicle.mileage} km` : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Total Spent</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                        {formatINR(vehicleDetails.totalExpenditure || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Service History for this Vehicle */}
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: dark ? '#bbb' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Service & Maintenance History ({vehicleDetails.bookings?.length || 0})
                    </h3>
                    {vehicleDetails.bookings?.length === 0 ? (
                      <p style={{ fontSize: 12, color: dark ? '#666' : '#999' }}>No service records for this vehicle.</p>
                    ) : (
                      <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: dark ? '#0a0a0a' : '#f1f5f9', color: dark ? '#666' : '#64748b' }}>
                              <th style={{ padding: '8px 12px' }}>Package</th>
                              <th style={{ padding: '8px 12px' }}>Garage</th>
                              <th style={{ padding: '8px 12px' }}>Date</th>
                              <th style={{ padding: '8px 12px' }}>Status</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vehicleDetails.bookings.map(b => (
                              <tr key={b._id} style={{ borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}` }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{b.servicePackage || 'Aero'}</td>
                                <td style={{ padding: '8px 12px', color: dark ? '#aaa' : '#555' }}>{b.garageCity || b.garageLocation || 'Workshop'}</td>
                                <td style={{ padding: '8px 12px', color: dark ? '#888' : '#666' }}>{b.serviceDate}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{
                                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                    background: b.status === 'Completed' ? (dark ? '#064e3b' : '#dcfce7') : (dark ? '#1f2937' : '#f3f4f6'),
                                    color: b.status === 'Completed' ? '#34d399' : '#3b82f6'
                                  }}>
                                    {b.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                                  {formatINR(b.finalPrice || b.estimatedPrice || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
