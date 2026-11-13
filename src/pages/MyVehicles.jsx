import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AppFooter from '../components/AppFooter';
import VehicleSelect from '../components/VehicleSelect';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { API_BASE as API } from '../config/api.js';

/* ── SVG Icons ─────────────────────────────────────────────────── */
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ── Helpers to parse fuel & transmission from vehicle specs ──── */
function parseSpecs(variant) {
  if (!variant || typeof variant !== 'string') {
    return { fuelType: 'Not available', transmission: 'Not available' };
  }
  let fuelType = 'Not available';
  if (/petrol\/cng/i.test(variant)) fuelType = 'Petrol / CNG';
  else if (/petrol\/diesel/i.test(variant)) fuelType = 'Petrol / Diesel';
  else if (/diesel/i.test(variant)) fuelType = 'Diesel';
  else if (/petrol/i.test(variant)) fuelType = 'Petrol';
  else if (/electric/i.test(variant)) fuelType = 'Electric';
  else if (/cng/i.test(variant)) fuelType = 'CNG';
  else if (/hybrid/i.test(variant)) fuelType = 'Hybrid';

  let transmission = 'Not available';
  if (/\bAT\b|automatic/i.test(variant)) transmission = 'Automatic (AT)';
  else if (/\bMT\b|manual/i.test(variant)) transmission = 'Manual (MT)';
  else if (/electric/i.test(variant)) transmission = 'Single-Speed Automatic';

  return { fuelType, transmission };
}

const EMPTY_FORM = { make: '', model: '', variant: '', year: '', licensePlate: '' };

export default function MyVehicles() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [vehicles,    setVehicles]   = useState([]);
  const [bookings,    setBookings]   = useState([]);
  const [loading,     setLoading]    = useState(true);

  /* Form modal/inline states */
  const [showForm,    setShowForm]   = useState(false);
  const [editId,      setEditId]     = useState(null);   // null = add, string = edit
  const [form,        setForm]       = useState(EMPTY_FORM);
  const [submitting,  setSubmitting] = useState(false);

  /* Info Modal state */
  const [selectedInfoVehicle, setSelectedInfoVehicle] = useState(null); // { vehicle, index }

  /* Delete Confirmation Dialog state */
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState(null); // vehicle
  const [deleting, setDeleting] = useState(false);

  /* Status messages */
  const [error,       setError]      = useState('');
  const [success,     setSuccess]    = useState('');
  const [searchQ,     setSearchQ]    = useState('');

  const headers = { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' };

  /* ── Fetch vehicles and bookings ── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, bRes] = await Promise.all([
        fetch(`${API}/api/vehicles`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/bookings`, { headers }).then(r => r.json()).catch(() => []),
      ]);
      setVehicles(Array.isArray(vRes) ? vRes : []);
      setBookings(Array.isArray(bRes) ? bRes : []);
    } catch {
      setVehicles([]);
      setBookings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.token) fetchData();
  }, [user]);

  /* ── Form Actions ── */
  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
    setTimeout(() => document.getElementById('vs-brand')?.focus(), 100);
  };

  const openEdit = (v) => {
    setEditId(v._id);
    setForm({
      make: v.make,
      model: v.model,
      variant: v.variant || '',
      year: String(v.year),
      licensePlate: v.licensePlate,
    });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setError('');
  };

  const handleVehicleSelect = (sel) => {
    setForm(f => ({ ...f, make: sel.make, model: sel.model, variant: sel.variant || '' }));
  };

  /* ── Submit (Add or Edit) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.year || !form.licensePlate) {
      setError('Brand, model, year, and license plate are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    const body = JSON.stringify({
      make: form.make,
      model: form.model,
      variant: form.variant,
      year: Number(form.year),
      licensePlate: form.licensePlate.toUpperCase(),
    });
    try {
      const url    = editId ? `${API}/api/vehicles/${editId}` : `${API}/api/vehicles`;
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers, body });
      const data   = await res.json();
      if (res.ok) {
        if (editId) {
          setVehicles(prev => prev.map(v => v._id === editId ? data : v));
          setSuccess('Vehicle updated successfully.');
        } else {
          setVehicles(prev => [data, ...prev]);
          setSuccess('Vehicle registered successfully.');
        }
        closeForm();
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch {
      setError('Server error. Check backend connection.');
    }
    setSubmitting(false);
  };

  /* ── Confirm Delete Action ── */
  const handleConfirmDelete = async () => {
    if (!confirmDeleteVehicle) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/vehicles/${confirmDeleteVehicle._id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v._id !== confirmDeleteVehicle._id));
        setSuccess(`${confirmDeleteVehicle.make} ${confirmDeleteVehicle.model} removed from fleet.`);
        setConfirmDeleteVehicle(null);
        setTimeout(() => setSuccess(''), 3500);
      } else {
        setError('Failed to remove vehicle. Please try again.');
      }
    } catch {
      setError('Server error while removing vehicle.');
    }
    setDeleting(false);
  };

  /* ── Filtered search ── */
  const filtered = vehicles.filter(v => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.variant || '').toLowerCase().includes(q) ||
      v.licensePlate.toLowerCase().includes(q)
    );
  });

  /* ── Status computation helper for info modal ── */
  const getVehicleStatusDetails = (v) => {
    const vBookings = bookings.filter(b => (b.vehicleId?._id === v._id || b.vehicleId === v._id));
    const activeBooking = vBookings.find(b => b.status === 'In Progress' || b.status === 'Pending');
    const lastServiceBooking = vBookings
      .filter(b => b.status === 'Completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const nextServiceBooking = vBookings
      .filter(b => b.status === 'Pending' || b.status === 'In Progress')
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    let currentStatus = 'Active';
    let statusColor = '#22c55e';
    if (v.mapStatus === 'maintenance' || activeBooking?.status === 'In Progress') {
      currentStatus = 'Under Maintenance';
      statusColor = '#f59e0b';
    } else if (activeBooking?.status === 'Pending') {
      currentStatus = 'Service Due';
      statusColor = '#3b82f6';
    } else if (v.mapStatus === 'alert') {
      currentStatus = 'Requires Attention';
      statusColor = '#ef4444';
    } else if (v.mapStatus === 'idle') {
      currentStatus = 'Idle';
      statusColor = '#60a5fa';
    }

    let serviceStatus = 'No pending services';
    if (activeBooking) {
      serviceStatus = `${activeBooking.serviceType} (${activeBooking.status})`;
    } else if (lastServiceBooking) {
      serviceStatus = 'Routine maintenance up to date';
    }

    let lastServiceDate = 'Not available';
    if (lastServiceBooking?.date) {
      lastServiceDate = new Date(lastServiceBooking.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    let nextScheduledService = 'Not available';
    if (nextServiceBooking?.date) {
      nextScheduledService = `${new Date(nextServiceBooking.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}${nextServiceBooking.time ? ` at ${nextServiceBooking.time}` : ''}`;
    }

    let alerts = 'No active alerts (All systems normal)';
    if (v.mapStatus === 'alert') {
      alerts = 'Engine diagnostic alert detected near recent route';
    } else if (activeBooking?.status === 'In Progress') {
      alerts = 'Vehicle currently undergoing scheduled workshop service';
    }

    return {
      currentStatus,
      statusColor,
      serviceStatus,
      lastServiceDate,
      nextScheduledService,
      alerts,
    };
  };

  /* ── 3-section bottom button style ── */
  const actionBtnStyle = {
    padding: '11px 0',
    background: 'transparent',
    border: 'none',
    color: dark ? '#9ca3af' : '#64748b',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.15s ease',
    width: '100%',
    fontFamily: 'inherit',
  };

  return (
    <div className="r-page-wrap">
      <Sidebar />
      <div className="r-content" style={{ background: dark ? '#0d0d0d' : '#f1f5f9' }}>
        <Topbar searchPlaceholder="Search vehicles..." onSearch={setSearchQ} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '28px 32px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                My Vehicles
              </h1>
              <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', marginTop: 4 }}>
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <button
              onClick={openAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#3b82f6'}
              onMouseOut={e  => e.currentTarget.style.background = '#2563eb'}
            >
              <PlusIcon /> Add Vehicle
            </button>
          </div>

          <div style={{ padding: '12px 32px 32px' }}>
            {/* Alerts */}
            {success && <div style={alertStyle('#22c55e')}>✓ {success}</div>}
            {error   && !showForm && <div style={alertStyle('#ef4444')}>⚠ {error}</div>}

            {/* Add / Edit Form */}
            {showForm && (
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 12, padding: 24, marginBottom: 24,
                boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 24px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    {editId ? 'Edit Vehicle Information' : 'Register New Vehicle'}
                  </div>
                  <button onClick={closeForm} style={{ background: 'none', border: 'none', color: dark ? '#6b7280' : '#94a3b8', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                {error && <div style={{ ...alertStyle('#ef4444'), marginBottom: 16 }}>⚠ {error}</div>}

                <form onSubmit={handleSubmit}>
                  {/* Cascading vehicle select */}
                  <div style={{ marginBottom: 16 }}>
                    <VehicleSelect
                      value={{ make: form.make, model: form.model, variant: form.variant }}
                      onChange={handleVehicleSelect}
                      required={true}
                      compact={true}
                    />
                  </div>

                  {/* Year + License plate */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div>
                      <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>Year <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        required type="number" min="1990" max={new Date().getFullYear() + 1}
                        className="form-input"
                        placeholder="e.g. 2022"
                        value={form.year}
                        onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>License Plate <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        required className="form-input"
                        placeholder="e.g. MH12AB1234"
                        value={form.licensePlate}
                        onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="submit" disabled={submitting}
                      style={{
                        flex: 1, padding: '12px', background: submitting ? (dark ? '#1c1c1c' : '#e2e8f0') : '#2563eb',
                        color: submitting ? (dark ? '#6b7280' : '#94a3b8') : '#fff', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Register Vehicle →'}
                    </button>
                    <button
                      type="button" onClick={closeForm}
                      style={{
                        padding: '12px 20px', background: 'transparent', color: dark ? '#9ca3af' : '#64748b',
                        border: `1px solid ${dark ? '#1c1c1c' : '#cbd5e1'}`, borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Search bar */}
            {vehicles.length > 0 && !showForm && (
              <div style={{ marginBottom: 20 }}>
                <input
                  className="form-input"
                  placeholder="Search by brand, model, plate, variant..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  style={{ maxWidth: 360 }}
                />
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
                <div style={{ marginBottom: 12, fontSize: 24 }}>⟳</div>Loading vehicles...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {filtered.map((v, idx) => {
                  return (
                    <div
                      key={v._id}
                      style={{
                        background: dark ? '#111111' : '#ffffff',
                        border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.borderColor = dark ? '#2a2b30' : '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = dark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 20px rgba(0,0,0,0.06)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.borderColor = dark ? '#1c1c1c' : '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Logo Header: Clean display, status badge & top icons removed */}
                      <div style={{
                        position: 'relative',
                        height: 135,
                        overflow: 'hidden',
                        background: dark
                          ? 'linear-gradient(135deg, #111111 0%, #161616 100%)'
                          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      }}>
                        <BrandLogo
                          brand={v.make}
                          size={76}
                          bg={true}
                          style={{
                            borderRadius: 14,
                            boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.45)' : '0 4px 14px rgba(0,0,0,0.06)',
                          }}
                        />
                      </div>

                      {/* Main Card Content: Only Manufacturer Name & Model Name visible */}
                      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: dark ? '#6b7280' : '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}>
                          {v.make}
                        </div>
                        <div style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: dark ? '#f0f0f0' : '#0f172a',
                          letterSpacing: '-0.02em',
                          marginTop: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }} title={`${v.make} ${v.model}`}>
                          {v.model}
                        </div>
                      </div>

                      {/* Bottom Action Bar: Exactly 3 equal-width sections */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                        background: dark ? '#0d0d0d' : '#fafafa',
                      }}>
                        {/* 1. Info Button */}
                        <button
                          onClick={() => setSelectedInfoVehicle({ vehicle: v, index: idx })}
                          style={actionBtnStyle}
                          onMouseOver={e => {
                            e.currentTarget.style.background = dark ? '#171717' : '#f1f5f9';
                            e.currentTarget.style.color = dark ? '#f0f0f0' : '#0f172a';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
                          }}
                          title="View complete vehicle details"
                        >
                          <InfoIcon /> Info
                        </button>

                        {/* 2. Edit Button */}
                        <button
                          onClick={() => openEdit(v)}
                          style={{
                            ...actionBtnStyle,
                            borderLeft: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            borderRight: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = dark ? '#171717' : '#f1f5f9';
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
                          }}
                          title="Edit vehicle details"
                        >
                          <EditIcon /> Edit
                        </button>

                        {/* 3. Remove Button */}
                        <button
                          onClick={() => setConfirmDeleteVehicle(v)}
                          style={actionBtnStyle}
                          onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
                          }}
                          title="Remove vehicle from fleet"
                        >
                          <TrashIcon /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add vehicle card */}
                <div
                  onClick={openAdd}
                  style={{
                    background: dark ? '#111111' : '#ffffff',
                    border: `2px dashed ${dark ? '#1c1c1c' : '#cbd5e1'}`,
                    borderRadius: 12,
                    minHeight: 220,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = dark ? '#141414' : '#f8fafc';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = dark ? '#1c1c1c' : '#cbd5e1';
                    e.currentTarget.style.background = dark ? '#111111' : '#ffffff';
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: dark ? '#1a1a1a' : '#f1f5f9',
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: dark ? '#6b7280' : '#64748b',
                  }}>
                    <PlusIcon />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: dark ? '#d1d5db' : '#0f172a', marginBottom: 4 }}>
                      Register Vehicle
                    </div>
                    <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b', maxWidth: 140, lineHeight: 1.5 }}>
                      Add a new asset to your fleet
                    </div>
                  </div>
                </div>

                {/* No search results */}
                {filtered.length === 0 && searchQ && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: dark ? '#6b7280' : '#64748b', fontSize: 13 }}>
                    No vehicles matching "{searchQ}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── VEHICLE INFO MODAL ────────────────────────────────────── */}
        {selectedInfoVehicle && (() => {
          const { vehicle: v, index } = selectedInfoVehicle;
          const afId = `AF-${String(index + 100).padStart(3, '0')}`;
          const specs = parseSpecs(v.variant);
          const statusInfo = getVehicleStatusDetails(v);

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
              onClick={() => setSelectedInfoVehicle(null)}
            >
              <div
                style={{
                  background: dark ? '#111111' : '#ffffff',
                  border: `1px solid ${dark ? '#222222' : '#e2e8f0'}`,
                  borderRadius: 16,
                  maxWidth: 620,
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: dark ? '0 24px 60px rgba(0,0,0,0.7)' : '0 24px 60px rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: dark ? '#0d0d0d' : '#f8fafc',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <BrandLogo brand={v.make} size={48} bg={true} style={{ borderRadius: 10 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                          {v.make} {v.model}
                        </h2>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#3b82f6',
                          background: 'rgba(59,130,246,0.12)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.04em',
                        }}>
                          {afId}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', margin: '3px 0 0' }}>
                        Registration: <strong style={{ color: dark ? '#d1d5db' : '#334155' }}>{v.licensePlate}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedInfoVehicle(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: dark ? '#6b7280' : '#94a3b8',
                      cursor: 'pointer',
                      padding: 6,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Close"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Section 1: Vehicle Information */}
                  <div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#3b82f6',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}>
                      Vehicle Information
                    </div>
                    <div style={{
                      background: dark ? '#0d0d0d' : '#f8fafc',
                      border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 14,
                    }}>
                      <InfoField label="Manufacturer" value={v.make} dark={dark} />
                      <InfoField label="Model" value={v.model} dark={dark} />
                      <InfoField label="Variant" value={v.variant || 'Not available'} dark={dark} />
                      <InfoField label="Manufacturing Year" value={v.year || 'Not available'} dark={dark} />
                      <InfoField label="Registration Number" value={v.licensePlate} dark={dark} />
                      <InfoField label="AeroFleet Vehicle ID" value={afId} dark={dark} highlight={true} />
                      <InfoField label="Fuel Type" value={specs.fuelType} dark={dark} />
                      <InfoField label="Transmission Type" value={specs.transmission} dark={dark} />
                    </div>
                  </div>

                  {/* Section 2: Vehicle Status & Health */}
                  <div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#3b82f6',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}>
                      Vehicle Status & Diagnostics
                    </div>
                    <div style={{
                      background: dark ? '#0d0d0d' : '#f8fafc',
                      border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}>
                      {/* Current Status Pill */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>Current Vehicle Status:</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: `${statusInfo.statusColor}18`,
                          color: statusInfo.statusColor,
                          border: `1px solid ${statusInfo.statusColor}35`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusInfo.statusColor }} />
                          {statusInfo.currentStatus}
                        </span>
                      </div>

                      <div style={{ height: 1, background: dark ? '#1c1c1c' : '#e2e8f0' }} />

                      <InfoRow label="Service Status" value={statusInfo.serviceStatus} dark={dark} />
                      <InfoRow label="Last Service Date" value={statusInfo.lastServiceDate} dark={dark} />
                      <InfoRow label="Next Scheduled Service" value={statusInfo.nextScheduledService} dark={dark} />
                      <InfoRow
                        label="Active Diagnostic Alerts"
                        value={statusInfo.alerts}
                        dark={dark}
                        valueColor={statusInfo.alerts.includes('No active') ? '#22c55e' : '#f59e0b'}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '14px 24px',
                  borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  background: dark ? '#0d0d0d' : '#f8fafc',
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                }}>
                  <button
                    onClick={() => {
                      const veh = selectedInfoVehicle.vehicle;
                      setSelectedInfoVehicle(null);
                      openEdit(veh);
                    }}
                    style={{
                      padding: '9px 18px',
                      background: 'transparent',
                      border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                      borderRadius: 8,
                      color: dark ? '#f0f0f0' : '#0f172a',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Edit Vehicle
                  </button>
                  <button
                    onClick={() => setSelectedInfoVehicle(null)}
                    style={{
                      padding: '9px 20px',
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── CONFIRM REMOVE DIALOG ─────────────────────────────────── */}
        {confirmDeleteVehicle && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => !deleting && setConfirmDeleteVehicle(null)}
          >
            <div
              style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#2a2b30' : '#e2e8f0'}`,
                borderRadius: 14,
                maxWidth: 440,
                width: '100%',
                padding: '24px',
                boxShadow: dark ? '0 24px 60px rgba(0,0,0,0.8)' : '0 20px 45px rgba(0,0,0,0.18)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Alert Icon & Heading */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangleIcon />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 4px' }}>
                    Remove Vehicle
                  </h3>
                  <p style={{ fontSize: 13, color: dark ? '#9ca3af' : '#475569', margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to remove <strong style={{ color: dark ? '#f0f0f0' : '#0f172a' }}>{confirmDeleteVehicle.make} {confirmDeleteVehicle.model}</strong> ({confirmDeleteVehicle.licensePlate}) from your fleet?
                  </p>
                </div>
              </div>

              <div style={{
                background: dark ? '#161616' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#e2e8f0'}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11,
                color: dark ? '#6b7280' : '#64748b',
                lineHeight: 1.45,
                marginBottom: 20,
              }}>
                This vehicle and its record will be removed from your AeroFleet dashboard. This action cannot be undone.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDeleteVehicle(null)}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                    borderRadius: 8,
                    color: dark ? '#d1d5db' : '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => !deleting && (e.currentTarget.style.background = '#ef4444')}
                  onMouseOut={e => !deleting && (e.currentTarget.style.background = '#dc2626')}
                >
                  {deleting ? 'Removing...' : 'Remove Vehicle'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AppFooter />
      </div>
    </div>
  );
}

/* ── Modal Information subcomponents ──────────────────────────── */
function InfoField({ label, value, dark, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: highlight ? '#3b82f6' : dark ? '#f0f0f0' : '#0f172a',
      }}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value, dark, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: dark ? '#9ca3af' : '#64748b' }}>{label}:</span>
      <span style={{
        fontWeight: 600,
        color: valueColor ? valueColor : dark ? '#f0f0f0' : '#0f172a',
      }}>
        {value}
      </span>
    </div>
  );
}

const alertStyle = (color) => ({
  background: `${color}18`,
  border: `1px solid ${color}40`,
  color,
  padding: '11px 16px',
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 16,
});
