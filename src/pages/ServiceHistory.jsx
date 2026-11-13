import React, { useState, useEffect, useContext, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AppFooter from '../components/AppFooter';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { TIME_SLOTS } from '../data/servicePackages';
import GARAGE_LOCATIONS from '../data/garageLocations';

import { API_BASE as API } from '../config/api.js';
const PER_PAGE = 8;

/* Status badge color configurations according to specification */
const STATUS_CONFIG = {
  'Pending Confirmation': { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', color: '#eab308' }, // Yellow
  'Pending':              { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', color: '#eab308' }, // Yellow
  'Scheduled':            { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }, // Blue
  'In Progress':          { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316' }, // Orange
  'Completed':            { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' },   // Green
  'Cancelled':            { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },   // Red
};

function StatusBadge({ status }) {
  const norm = status === 'Pending' ? 'Pending Confirmation' : status;
  const cfg = STATUS_CONFIG[norm] || STATUS_CONFIG['Pending Confirmation'];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 20,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {norm}
    </span>
  );
}

// Map level number to ordinal text
const ORDINAL_NAMES = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th+',
};

export default function ServiceHistory() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search & Sort
  const [statusFilter, setStatusFilter] = useState('All');
  const [packageFilter, setPackageFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [sortField, setSortField] = useState('date'); // 'date' | 'createdAt'
  const [sortDir, setSortDir] = useState('desc');     // 'desc' | 'asc'
  const [page, setPage] = useState(1);

  // Modals & Action States (Mark as Done is restricted to Admin Portal only)
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

  // Reschedule Form State
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newGarageId, setNewGarageId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const headers = { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch Bookings ── */
  const fetchBookings = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/bookings`, { headers })
      .then(r => r.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  /* ── Real-Time Socket.IO Updates ── */
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload) => {
      fetchBookings();
      if (payload?.bookingId && selectedBookingForDetails?._id === payload.bookingId) {
        setSelectedBookingForDetails(prev => prev ? { ...prev, status: payload.status, finalPricing: payload.finalPricing || prev.finalPricing } : null);
      }
    };

    socket.on('service:updated', handleUpdate);
    socket.on('booking:updated', handleUpdate);
    socket.on('reconnect', handleUpdate);

    return () => {
      socket.off('service:updated', handleUpdate);
      socket.off('booking:updated', handleUpdate);
      socket.off('reconnect', handleUpdate);
    };
  }, [socket, selectedBookingForDetails]);

  /* ── Format Service Column (Package – Xth Service) ── */
  const formatServiceLabel = (booking) => {
    let pkg = booking.packageName || 'Pro';
    if (!['Aero', 'Pro', 'Elite'].includes(pkg)) {
      if (/elite/i.test(booking.serviceType)) pkg = 'Elite';
      else if (/aero/i.test(booking.serviceType)) pkg = 'Aero';
      else pkg = 'Pro';
    }

    let levelNumber = booking.serviceQuantity || 1;
    if (!booking.serviceQuantity) {
      const match = (booking.serviceType || '').match(/(\d)(?:st|nd|rd|th)/i);
      if (match) levelNumber = parseInt(match[1], 10);
    }

    const ordinal = ORDINAL_NAMES[levelNumber] || `${levelNumber}th`;
    return `${pkg} – ${ordinal} Service`;
  };

  /* ── Cancel Booking Action ── */
  const handleCancelBooking = async () => {
    if (!confirmCancelBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings/${confirmCancelBooking._id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(prev => prev.map(b => b._id === confirmCancelBooking._id ? data : b));
        if (selectedBookingForDetails?._id === confirmCancelBooking._id) {
          setSelectedBookingForDetails(data);
        }
        showToast('Service booking cancelled successfully.');
        setConfirmCancelBooking(null);
      } else {
        showToast(data.message || 'Failed to cancel booking.', 'error');
      }
    } catch {
      showToast('Network error while cancelling booking.', 'error');
    }
    setActionLoading(false);
  };

  /* ── Reschedule Booking Action ── */
  const handleOpenReschedule = (b, e) => {
    e?.stopPropagation();
    setRescheduleBooking(b);
    setNewDate(b.date ? new Date(b.date).toISOString().split('T')[0] : '');
    setNewTime(b.time || TIME_SLOTS[0]);
    setNewGarageId(b.garage?.id || GARAGE_LOCATIONS[0].id);
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking || !newDate || !newTime) return;
    setActionLoading(true);

    const chosenGarage = GARAGE_LOCATIONS.find(g => g.id === newGarageId) || rescheduleBooking.garage;

    try {
      const res = await fetch(`${API}/api/bookings/${rescheduleBooking._id}/reschedule`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          date: newDate,
          time: newTime,
          garage: {
            id: chosenGarage.id,
            name: chosenGarage.name,
            city: chosenGarage.city,
            address: chosenGarage.address,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(prev => prev.map(b => b._id === rescheduleBooking._id ? data : b));
        if (selectedBookingForDetails?._id === rescheduleBooking._id) {
          setSelectedBookingForDetails(data);
        }
        showToast('Service appointment rescheduled successfully.');
        setRescheduleBooking(null);
      } else {
        showToast(data.message || 'Failed to reschedule appointment.', 'error');
      }
    } catch {
      showToast('Network error while rescheduling.', 'error');
    }
    setActionLoading(false);
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    const rows = [['Booking ID', 'Date', 'Vehicle', 'Plate', 'Service', 'Status', 'Time', 'Garage', 'Total Amount']];
    bookings.forEach(b => {
      const vehicle = b.vehicleId ? `${b.vehicleId.make} ${b.vehicleId.model}` : '—';
      const plate = b.vehicleId?.licensePlate || '—';
      const svc = formatServiceLabel(b);
      const garageName = b.garage?.name || 'AeroFleet Workshop';
      const amt = b.cost || b.packageSubtotal || 0;
      rows.push([
        b._id,
        new Date(b.date).toLocaleDateString('en-IN'),
        vehicle,
        plate,
        svc,
        b.status,
        b.time,
        garageName,
        amt,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aerofleet_service_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Extract Unique Vehicles for Filter ── */
  const uniqueVehicles = Array.from(
    new Set(
      bookings
        .filter(b => b.vehicleId)
        .map(b => `${b.vehicleId.make} ${b.vehicleId.model}`)
    )
  );

  /* ── Filtering + Searching + Sorting ── */
  const statusOptions = ['All', 'Pending Confirmation', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

  let display = [...bookings];

  // Status Filter
  if (statusFilter !== 'All') {
    display = display.filter(b => {
      const normalized = b.status === 'Pending' ? 'Pending Confirmation' : b.status;
      return normalized === statusFilter;
    });
  }

  // Package Filter
  if (packageFilter !== 'All') {
    display = display.filter(b => (b.packageName || 'Pro') === packageFilter);
  }

  // Vehicle Filter
  if (vehicleFilter !== 'All') {
    display = display.filter(b => {
      const name = b.vehicleId ? `${b.vehicleId.make} ${b.vehicleId.model}` : '';
      return name === vehicleFilter;
    });
  }

  // Search filter
  if (searchQ) {
    const q = searchQ.toLowerCase();
    display = display.filter(b => {
      const make = b.vehicleId?.make || '';
      const model = b.vehicleId?.model || '';
      const plate = b.vehicleId?.licensePlate || '';
      const refId = b._id || '';
      const pkg = b.packageName || '';
      const svcLabel = formatServiceLabel(b);
      return (
        make.toLowerCase().includes(q) ||
        model.toLowerCase().includes(q) ||
        plate.toLowerCase().includes(q) ||
        refId.toLowerCase().includes(q) ||
        pkg.toLowerCase().includes(q) ||
        svcLabel.toLowerCase().includes(q)
      );
    });
  }

  // Sorting
  display.sort((a, b) => {
    let da, db;
    if (sortField === 'createdAt') {
      da = new Date(a.createdAt || 0);
      db = new Date(b.createdAt || 0);
    } else {
      da = new Date(a.date);
      db = new Date(b.date);
    }
    return sortDir === 'desc' ? db - da : da - db;
  });

  const totalPages = Math.max(1, Math.ceil(display.length / PER_PAGE));
  const paginated = display.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, packageFilter, vehicleFilter, searchQ, sortField, sortDir]);

  // Minimum date for rescheduling
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="r-page-wrap">
      <Sidebar />
      <div className="r-content" style={{ background: dark ? '#0a0a0a' : '#f1f5f9' }}>
        <Topbar onSearch={setSearchQ} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Toast Notification */}
          {toast && (
            <div style={{
              position: 'fixed',
              top: 20,
              right: 24,
              zIndex: 9999,
              background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
              color: toast.type === 'error' ? '#ef4444' : '#22c55e',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
            }}>
              {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
            </div>
          )}

          {/* Header */}
          <div style={{ padding: '28px 32px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Service History
              </h1>
              <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', marginTop: 4 }}>
                {bookings.length} total service appointment{bookings.length !== 1 ? 's' : ''} on record
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={bookings.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'transparent',
                color: bookings.length === 0 ? (dark ? '#4b5563' : '#94a3b8') : (dark ? '#9ca3af' : '#475569'),
                border: `1px solid ${dark ? '#1c1c1c' : '#cbd5e1'}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: bookings.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => {
                if (bookings.length > 0) {
                  e.currentTarget.style.background = dark ? '#141414' : '#ffffff';
                  e.currentTarget.style.color = dark ? '#f0f0f0' : '#0f172a';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = dark ? '#9ca3af' : '#475569';
              }}
            >
              Export CSV
            </button>
          </div>

          <div style={{ padding: '8px 32px 32px' }}>
            {/* Filter Bar */}
            <div style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Row 1: Status Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
                  Status:
                </span>
                {statusOptions.map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      background: statusFilter === st ? '#2563eb' : (dark ? '#1a1a1a' : '#f1f5f9'),
                      color: statusFilter === st ? '#ffffff' : (dark ? '#9ca3af' : '#64748b'),
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Row 2: Secondary Dropdowns + Search + Sort */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {/* Package Filter */}
                  <select
                    value={packageFilter}
                    onChange={e => setPackageFilter(e.target.value)}
                    className="form-input"
                    style={{ padding: '6px 12px', fontSize: 12, width: 140 }}
                  >
                    <option value="All">All Packages</option>
                    <option value="Aero">Aero Package</option>
                    <option value="Pro">Pro Package</option>
                    <option value="Elite">Elite Package</option>
                  </select>

                  {/* Vehicle Filter */}
                  {uniqueVehicles.length > 0 && (
                    <select
                      value={vehicleFilter}
                      onChange={e => setVehicleFilter(e.target.value)}
                      className="form-input"
                      style={{ padding: '6px 12px', fontSize: 12, width: 160 }}
                    >
                      <option value="All">All Vehicles</option>
                      {uniqueVehicles.map(vName => (
                        <option key={vName} value={vName}>{vName}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search vehicle, plate, ref..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="form-input"
                    style={{ width: 220, padding: '6px 12px', fontSize: 12 }}
                  />

                  {/* Sort Order */}
                  <select
                    value={`${sortField}-${sortDir}`}
                    onChange={e => {
                      const [field, dir] = e.target.value.split('-');
                      setSortField(field);
                      setSortDir(dir);
                    }}
                    className="form-input"
                    style={{ padding: '6px 12px', fontSize: 12, width: 170 }}
                  >
                    <option value="date-desc">Date (Newest first)</option>
                    <option value="date-asc">Date (Oldest first)</option>
                    <option value="createdAt-desc">Booked (Recent first)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
                Loading service records...
              </div>
            ) : display.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 0',
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                  {searchQ || statusFilter !== 'All' || packageFilter !== 'All' ? 'No matching service records found' : 'No service history yet'}
                </div>
                <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', marginTop: 4 }}>
                  {searchQ || statusFilter !== 'All' ? 'Try adjusting your filters or search terms.' : 'Booked maintenance appointments will appear here.'}
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  background: dark ? '#111111' : '#ffffff',
                  border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  {/* Table Header: Exactly Date | Vehicle | Service | Status | Time | Actions */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 2.1fr 1.9fr 1.5fr 1fr 220px',
                    padding: '12px 20px',
                    borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    background: dark ? '#0d0d0d' : '#f8fafc',
                    alignItems: 'center',
                  }}>
                    {['Date', 'Vehicle', 'Service', 'Status', 'Time', 'Actions'].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: dark ? '#6b7280' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          textAlign: h === 'Actions' ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Rows */}
                  {paginated.map((b, i) => {
                    const vehicleName = b.vehicleId ? `${b.vehicleId.make} ${b.vehicleId.model}` : 'Vehicle Not Specified';
                    const plate = b.vehicleId?.licensePlate || '';
                    const brand = b.vehicleId?.make || '';
                    const dateFormatted = new Date(b.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const serviceLabel = formatServiceLabel(b);
                    const isCompleted = b.status === 'Completed';
                    const isCancelled = b.status === 'Cancelled';
                    const isActionable = !isCompleted && !isCancelled;

                    return (
                      <div
                        key={b._id}
                        onClick={() => setSelectedBookingForDetails(b)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 2.1fr 1.9fr 1.5fr 1fr 220px',
                          padding: '16px 20px',
                          alignItems: 'center',
                          borderBottom: i < paginated.length - 1 ? `1px solid ${dark ? '#161616' : '#f1f5f9'}` : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* 1. Date */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#d1d5db' : '#334155' }}>
                          {dateFormatted}
                        </div>

                        {/* 2. Vehicle (Logo + Name + Plate) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <BrandLogo brand={brand} size={32} bg={true} style={{ borderRadius: 6, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {vehicleName}
                            </div>
                            {plate && (
                              <div style={{ fontSize: 11, color: dark ? '#93c5fd' : '#2563eb', fontFamily: 'monospace', fontWeight: 600 }}>
                                {plate}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Service (Package – Milestone) */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          {serviceLabel}
                        </div>

                        {/* 4. Status Badge */}
                        <div>
                          <StatusBadge status={b.status} />
                        </div>

                        {/* 5. Time */}
                        <div style={{ fontSize: 12, color: dark ? '#9ca3af' : '#64748b', fontWeight: 500 }}>
                          {b.time}
                        </div>

                        {/* 6. Actions (Cancel | Reschedule | Mark as Done) */}
                        <div
                          style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}
                          onClick={e => e.stopPropagation()} // Prevent opening details modal when action clicked
                        >
                          {isActionable ? (
                            <>
                              {/* Cancel */}
                              <button
                                type="button"
                                onClick={() => setConfirmCancelBooking(b)}
                                title="Cancel this service appointment"
                                style={{
                                  padding: '5px 9px',
                                  background: 'transparent',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: '#ef4444',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                              >
                                Cancel
                              </button>

                              {/* Reschedule */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenReschedule(b, e)}
                                title="Reschedule appointment date and time"
                                style={{
                                  padding: '5px 9px',
                                  background: 'transparent',
                                  border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                                  color: dark ? '#d1d5db' : '#475569',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = dark ? '#222' : '#e2e8f0';
                                  e.currentTarget.style.color = '#3b82f6';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = dark ? '#d1d5db' : '#475569';
                                }}
                              >
                                Reschedule
                              </button>

                              {/* Mark as Done – admin only (removed from customer panel) */}
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: dark ? '#4b5563' : '#94a3b8', fontStyle: 'italic', paddingRight: 4 }}>
                              {isCompleted ? 'Completed' : 'Cancelled'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                    <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b' }}>
                      Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, display.length)} of {display.length} records
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: '6px 12px',
                          background: dark ? '#111111' : '#ffffff',
                          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                          color: page === 1 ? (dark ? '#4b5563' : '#cbd5e1') : (dark ? '#d1d5db' : '#475569'),
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          style={{
                            padding: '6px 12px',
                            background: p === page ? '#2563eb' : (dark ? '#111111' : '#ffffff'),
                            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            color: p === page ? '#ffffff' : (dark ? '#9ca3af' : '#475569'),
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: p === page ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: '6px 12px',
                          background: dark ? '#111111' : '#ffffff',
                          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                          color: page === totalPages ? (dark ? '#4b5563' : '#cbd5e1') : (dark ? '#d1d5db' : '#475569'),
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* MODAL 1: CONFIRM CANCEL SERVICE BOOKING                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        {confirmCancelBooking && (
          <div
            style={modalBackdropStyle}
            onClick={() => !actionLoading && setConfirmCancelBooking(null)}
          >
            <div
              style={{ ...modalBoxStyle(dark), maxWidth: 440 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(239,68,68,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  ⚠
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
                    Cancel Service Appointment
                  </h3>
                  <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
                    Confirm appointment cancellation
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: dark ? '#d1d5db' : '#334155', lineHeight: 1.5, marginBottom: 16 }}>
                Are you sure you want to cancel this service appointment? This booking will be marked as Cancelled and kept in your history.
              </p>

              <div style={{
                background: dark ? '#0d0d0d' : '#f8fafc',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div><strong>Vehicle:</strong> {confirmCancelBooking.vehicleId ? `${confirmCancelBooking.vehicleId.make} ${confirmCancelBooking.vehicleId.model} (${confirmCancelBooking.vehicleId.licensePlate})` : '—'}</div>
                <div><strong>Service:</strong> {formatServiceLabel(confirmCancelBooking)}</div>
                <div><strong>Scheduled Date:</strong> {new Date(confirmCancelBooking.date).toLocaleDateString('en-IN')} at {confirmCancelBooking.time}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmCancelBooking(null)}
                  style={btnSecondary(dark)}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelBooking}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* MODAL 3: RESCHEDULE SERVICE APPOINTMENT                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {rescheduleBooking && (
          <div
            style={modalBackdropStyle}
            onClick={() => !actionLoading && setRescheduleBooking(null)}
          >
            <div
              style={{ ...modalBoxStyle(dark), maxWidth: 480 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
                  Reschedule Appointment
                </h3>
                <button
                  onClick={() => setRescheduleBooking(null)}
                  style={{ background: 'none', border: 'none', color: dark ? '#6b7280' : '#94a3b8', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{
                background: dark ? '#0d0d0d' : '#f8fafc',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                <div><strong>Vehicle:</strong> {rescheduleBooking.vehicleId ? `${rescheduleBooking.vehicleId.make} ${rescheduleBooking.vehicleId.model}` : '—'}</div>
                <div><strong>Service:</strong> {formatServiceLabel(rescheduleBooking)}</div>
                <div><strong>Current Schedule:</strong> {new Date(rescheduleBooking.date).toLocaleDateString('en-IN')} at {rescheduleBooking.time}</div>
              </div>

              <form onSubmit={handleSaveReschedule}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>
                      Workshop Garage Location
                    </label>
                    <select
                      value={newGarageId}
                      onChange={e => setNewGarageId(e.target.value)}
                      className="form-input"
                    >
                      {GARAGE_LOCATIONS.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.city})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>
                      New Preferred Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={minDateStr}
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569', marginBottom: 8 }}>
                      New Preferred Time Slot <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {TIME_SLOTS.map(slot => {
                        const isSel = newTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setNewTime(slot)}
                            style={{
                              padding: '8px 0',
                              borderRadius: 6,
                              border: isSel ? '1.5px solid #2563eb' : `1px solid ${dark ? '#2a2b30' : '#e2e8f0'}`,
                              background: isSel ? '#2563eb' : (dark ? '#141414' : '#f8fafc'),
                              color: isSel ? '#fff' : (dark ? '#d1d5db' : '#334155'),
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', marginTop: 4 }}>
                      *Rescheduled appointments are marked as Scheduled.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setRescheduleBooking(null)}
                    style={btnSecondary(dark)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !newDate || !newTime}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 8,
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: (actionLoading || !newDate || !newTime) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {actionLoading ? 'Saving...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* MODAL 4: COMPLETE SERVICE BOOKING DETAILS MODAL            */}
        {/* ─────────────────────────────────────────────────────────── */}
        {selectedBookingForDetails && (() => {
          const b = selectedBookingForDetails;
          const v = b.vehicleId;
          const dateStr = new Date(b.date).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const createdStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) : '—';
          const completedStr = b.completedAt ? new Date(b.completedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) : null;

          return (
            <div
              style={modalBackdropStyle}
              onClick={() => setSelectedBookingForDetails(null)}
            >
              <div
                style={{ ...modalBoxStyle(dark), maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Service Booking Details
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '4px 0 2px' }}>
                      {formatServiceLabel(b)}
                    </h3>
                    <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace' }}>
                      Ref ID: {b._id}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={b.status} />
                    <button
                      onClick={() => setSelectedBookingForDetails(null)}
                      style={{ background: 'none', border: 'none', color: dark ? '#6b7280' : '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Vehicle Section */}
                  <div style={detailsCardStyle(dark)}>
                    <div style={detailsSectionTitle}>Vehicle Information</div>
                    {v ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <BrandLogo brand={v.make} size={50} bg={true} style={{ borderRadius: 10 }} />
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Make & Model</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>{v.make} {v.model}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Registration Number</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#93c5fd' : '#2563eb', fontFamily: 'monospace' }}>{v.licensePlate}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Year</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#d1d5db' : '#334155' }}>{v.year || 'Not specified'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Variant / Fuel</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#d1d5db' : '#334155' }}>{v.variant || 'Standard'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#ef4444' }}>Vehicle record not found</div>
                    )}
                  </div>

                  {/* Schedule & Workshop Section */}
                  <div style={detailsCardStyle(dark)}>
                    <div style={detailsSectionTitle}>Schedule & Location</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Scheduled Date</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>{dateStr}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Time Slot</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>{b.time}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>AeroFleet Garage</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>{b.garage?.name || 'AeroFleet Workshop'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Workshop Address</div>
                        <div style={{ fontSize: 12, color: dark ? '#d1d5db' : '#475569' }}>{b.garage?.address || `${b.garage?.city || 'Mumbai'}`}</div>
                      </div>
                    </div>
                  </div>

                  {/* Service Inclusions & Extras */}
                  <div style={detailsCardStyle(dark)}>
                    <div style={detailsSectionTitle}>Service Package & Add-ons</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {b.packageName || 'Pro'} Package
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                        ₹{(b.packageSubtotal || b.packagePrice || 2999).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {b.extraServices && b.extraServices.length > 0 && (
                      <div style={{ borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, paddingTop: 8, marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', marginBottom: 6 }}>
                          Extra Services Included:
                        </div>
                        {b.extraServices.map((ex, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: dark ? '#d1d5db' : '#334155' }}>• {ex.label}</span>
                            <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>₹{ex.price.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div style={detailsCardStyle(dark)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={detailsSectionTitle}>
                        {b.status === 'Completed' ? 'Finalized Pricing Summary' : 'Estimated Pricing Summary'}
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: b.status === 'Completed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: b.status === 'Completed' ? '#22c55e' : '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {b.status === 'Completed' ? 'Finalized' : 'Estimated'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>Selected Package</span>
                        <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>{b.packageName || 'Aero'} Package</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>Package Base Price</span>
                        <span>₹{(b.packagePrice || 1499).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>Number of Service Sessions</span>
                        <span>{b.serviceQuantity || 1} {b.serviceQuantity === 1 ? 'Session' : 'Sessions'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>{b.status === 'Completed' ? 'Completed Service Cost' : 'Package Subtotal'}</span>
                        <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          ₹{(b.finalPricing?.packageCost || b.packageSubtotal || b.packagePrice || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>Extra Services & Charges</span>
                        <span>₹{(b.finalPricing?.extraServicesCost || b.extraServicesSubtotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                        <span>Applicable Taxes</span>
                        <span>₹{(b.finalPricing?.tax || b.tax || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div style={{ height: 1, background: dark ? '#1c1c1c' : '#e2e8f0', margin: '4px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                            {b.status === 'Completed' ? 'Final Total' : 'Estimated Total'}
                          </div>
                          {b.status === 'Completed' ? (
                            <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>
                              Added to Monthly Expenditure {completedStr ? `on ${completedStr}` : ''}
                            </div>
                          ) : (
                            <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
                              Not added to expenditure until completed
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
                          ₹{(b.finalPricing?.finalCost || b.cost || (b.packageSubtotal + (b.extraServicesSubtotal || 0))).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div style={detailsCardStyle(dark)}>
                    <div style={detailsSectionTitle}>Booking Activity & Log</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: dark ? '#9ca3af' : '#64748b' }}>Created On:</span>
                        <span style={{ color: dark ? '#d1d5db' : '#334155' }}>{createdStr}</span>
                      </div>
                      {completedStr && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Completed On:</span>
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>{completedStr}</span>
                        </div>
                      )}
                      {b.rescheduledAt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#3b82f6' }}>Last Rescheduled:</span>
                          <span style={{ color: '#3b82f6' }}>{new Date(b.rescheduledAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      )}
                      {b.notes && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                          <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>Notes:</div>
                          <div style={{ color: dark ? '#d1d5db' : '#334155', fontStyle: 'italic' }}>{b.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => setSelectedBookingForDetails(null)}
                    style={btnSecondary(dark)}
                  >
                    Close
                  </button>
                  {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                    <>
                      <button
                        onClick={() => {
                          const target = b;
                          setSelectedBookingForDetails(null);
                          setConfirmCancelBooking(target);
                        }}
                        style={{
                          padding: '9px 16px',
                          borderRadius: 8,
                          background: 'transparent',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel Appointment
                      </button>
                      {/* Mark as Done removed – admin only */}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <AppFooter />
      </div>
    </div>
  );
}

/* ── Modal & Layout Helper Styles ── */
const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalBoxStyle = (dark) => ({
  background: dark ? '#111111' : '#ffffff',
  border: `1px solid ${dark ? '#222222' : '#e2e8f0'}`,
  borderRadius: 14,
  padding: '24px',
  width: '100%',
  boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.8)' : '0 20px 45px rgba(0,0,0,0.15)',
});

const detailsCardStyle = (dark) => ({
  background: dark ? '#0d0d0d' : '#f8fafc',
  border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
  borderRadius: 10,
  padding: '14px 16px',
});

const detailsSectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#3b82f6',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
};

const btnSecondary = (dark) => ({
  padding: '9px 18px',
  background: 'transparent',
  border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
  borderRadius: 8,
  color: dark ? '#d1d5db' : '#475569',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});
