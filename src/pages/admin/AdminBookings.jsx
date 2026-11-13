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

export default function AdminBookings() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState(null);

  // Modals state
  const [detailModal, setDetailModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for reschedule & cancel
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const fetchBookings = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch bookings error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, [user?.token]);

  // Real-Time Socket.IO Updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchBookings();
    };

    socket.on('booking:created', handleUpdate);
    socket.on('booking:updated', handleUpdate);
    socket.on('dashboard:updated', handleUpdate);
    socket.on('reconnect', handleUpdate);

    return () => {
      socket.off('booking:created', handleUpdate);
      socket.off('booking:updated', handleUpdate);
      socket.off('dashboard:updated', handleUpdate);
      socket.off('reconnect', handleUpdate);
    };
  }, [socket]);

  // Handle Simple Status Transitions (Confirm, Progress)
  const handleQuickStatus = async (bookingId, endpoint, successMsg) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bookings/${bookingId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setMessage({ type: 'success', text: successMsg });
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handle Mark as Done (Finalize Pricing)
  const handleConfirmCompletion = async () => {
    if (!completeModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bookings/${completeModal._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Completion failed');

      setMessage({
        type: 'success',
        text: `Booking marked as Completed! Finalized cost: ${formatINR(data.pricingSummary?.finalTotal || data.booking?.finalPrice)}. Expenditure has been recorded.`
      });
      setCompleteModal(null);
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handle Reschedule
  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal || !rescheduleDate) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bookings/${rescheduleModal._id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          serviceDate: rescheduleDate,
          serviceTime: rescheduleTime || rescheduleModal.serviceTime || '10:00 AM'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reschedule failed');

      setMessage({ type: 'success', text: `Service rescheduled to ${rescheduleDate} at ${rescheduleTime || '10:00 AM'}.` });
      setRescheduleModal(null);
      setRescheduleDate('');
      setRescheduleTime('');
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handle Cancel
  const handleCancelSubmit = async () => {
    if (!cancelModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/bookings/${cancelModal._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cancellation failed');

      setMessage({ type: 'success', text: 'Booking cancelled successfully.' });
      setCancelModal(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        (b.user?.name && b.user.name.toLowerCase().includes(q)) ||
        (b.user?.email && b.user.email.toLowerCase().includes(q)) ||
        (b.vehicle?.make && b.vehicle.make.toLowerCase().includes(q)) ||
        (b.vehicle?.model && b.vehicle.model.toLowerCase().includes(q)) ||
        (b.vehicle?.licensePlate && b.vehicle.licensePlate.toLowerCase().includes(q)) ||
        (b.servicePackage && b.servicePackage.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        b.status?.toLowerCase() === statusFilter.toLowerCase() ||
        (statusFilter.toLowerCase() === 'pending' && b.status?.toLowerCase().includes('pending'));

      return matchQuery && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  // Status helper colors
  const getStatusBadge = (st) => {
    switch (st) {
      case 'Completed':
        return { bg: dark ? '#052e16' : '#dcfce7', text: '#16a34a', border: '#10b981' };
      case 'In Progress':
        return { bg: dark ? '#1e1b4b' : '#ede9fe', text: '#8b5cf6', border: '#8b5cf6' };
      case 'Scheduled':
        return { bg: dark ? '#1e3a8a' : '#dbeafe', text: '#2563eb', border: '#3b82f6' };
      case 'Cancelled':
        return { bg: dark ? '#450a0a' : '#fee2e2', text: '#ef4444', border: '#ef4444' };
      case 'Pending':
      default:
        return { bg: dark ? '#451a03' : '#fef3c7', text: '#d97706', border: '#f59e0b' };
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Service Bookings
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Full operational queue: confirm requests, dispatch to workshop, reschedule, or complete with pricing settlement.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'Pending', 'Scheduled', 'In Progress', 'Completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: statusFilter === tab ? '1px solid #2563eb' : `1px solid ${dark ? '#222' : '#e2e8f0'}`,
                  background: statusFilter === tab ? '#2563eb' : (dark ? '#111' : '#fff'),
                  color: statusFilter === tab ? '#fff' : (dark ? '#aaa' : '#64748b'),
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {tab}
              </button>
            ))}
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

        {/* Search Bar */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'center'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by client, vehicle plate, model, package..."
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
        </div>

        {/* Bookings Table */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              Loading bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              No bookings found matching current filters.
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
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Client & Vehicle</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Package / Services</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Workshop</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Date & Slot</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Amount</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b => {
                    const badge = getStatusBadge(b.status);
                    const isCompleted = b.status === 'Completed';
                    const isCancelled = b.status === 'Cancelled';
                    const isPending = b.status === 'Pending' || b.status === 'Pending Confirmation';
                    const isScheduled = b.status === 'Scheduled';
                    const isInProgress = b.status === 'In Progress';

                    return (
                      <tr
                        key={b._id}
                        style={{
                          borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Client & Vehicle */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {b.vehicle?.make && <BrandLogo brand={b.vehicle.make} size={28} />}
                            <div>
                              <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                {b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}` : 'Vehicle'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>
                                  {b.vehicle?.licensePlate || 'N/A'}
                                </span>
                                <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                                  • {b.user?.name || 'Client'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Package / Services */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                            {b.servicePackage || 'Service'} Package
                          </div>
                          <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
                            {b.extraServices && b.extraServices.length > 0
                              ? `+ ${b.extraServices.length} Extra${b.extraServices.length > 1 ? 's' : ''}`
                              : 'No extra services'}
                          </div>
                        </td>

                        {/* Workshop */}
                        <td style={{ padding: '14px 18px', color: dark ? '#d1d5db' : '#334155' }}>
                          <div>{b.garageCity || b.garageLocation || 'Main Atelier'}</div>
                        </td>

                        {/* Date & Slot */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>{b.serviceDate}</div>
                          <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>{b.serviceTime || '10:00 AM'}</div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`
                          }}>
                            {b.status}
                          </span>
                        </td>

                        {/* Price */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: isCompleted ? '#10b981' : (dark ? '#f0f0f0' : '#0f172a') }}>
                            {formatINR(b.finalPrice || b.estimatedPrice || 0)}
                          </div>
                          <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8' }}>
                            {isCompleted ? 'Final Billed' : 'Estimated'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {/* View Details */}
                            <button
                              onClick={() => setDetailModal(b)}
                              style={{
                                padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
                                border: 'none', cursor: 'pointer'
                              }}
                            >
                              Details
                            </button>

                            {/* Pending: Confirm */}
                            {isPending && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleQuickStatus(b._id, 'confirm', 'Booking confirmed and scheduled.')}
                                style={{
                                  padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                                }}
                              >
                                Confirm
                              </button>
                            )}

                            {/* Scheduled: Start Service */}
                            {isScheduled && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleQuickStatus(b._id, 'progress', 'Service marked In Progress.')}
                                style={{
                                  padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer'
                                }}
                              >
                                Start Service
                              </button>
                            )}

                            {/* Active Bookings (Pending / Scheduled / In Progress): Mark as Done */}
                            {!isCompleted && !isCancelled && (
                              <button
                                onClick={() => setCompleteModal(b)}
                                style={{
                                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(16,185,129,0.3)'
                                }}
                              >
                                Mark as Done
                              </button>
                            )}

                            {/* Scheduled or In Progress: Reschedule */}
                            {(isPending || isScheduled || isInProgress) && (
                              <button
                                onClick={() => {
                                  setRescheduleModal(b);
                                  setRescheduleDate(b.serviceDate || '');
                                  setRescheduleTime(b.serviceTime || '10:00 AM');
                                }}
                                style={{
                                  padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: dark ? '#262626' : '#f1f5f9', color: dark ? '#bbb' : '#475569',
                                  border: `1px solid ${dark ? '#333' : '#cbd5e1'}`, cursor: 'pointer'
                                }}
                              >
                                Reschedule
                              </button>
                            )}

                            {/* Scheduled or In Progress: Cancel */}
                            {(isPending || isScheduled || isInProgress) && (
                              <button
                                onClick={() => setCancelModal(b)}
                                style={{
                                  padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: dark ? '#3f1313' : '#fee2e2', color: '#ef4444',
                                  border: 'none', cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detail Modal ── */}
        {detailModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 580,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '24px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Booking Details</h3>
                <button
                  onClick={() => setDetailModal(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: dark ? '#aaa' : '#666' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 12, background: dark ? '#0a0a0a' : '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: dark ? '#777' : '#94a3b8' }}>Client</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{detailModal.user?.name}</div>
                  <div style={{ fontSize: 11, color: dark ? '#999' : '#64748b' }}>{detailModal.user?.email}</div>
                </div>
                <div style={{ padding: 12, background: dark ? '#0a0a0a' : '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: dark ? '#777' : '#94a3b8' }}>Vehicle</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                    {detailModal.vehicle?.make} {detailModal.vehicle?.model}
                  </div>
                  <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'monospace' }}>
                    {detailModal.vehicle?.licensePlate}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: dark ? '#aaa' : '#475569', textTransform: 'uppercase' }}>
                  Pricing Breakdown
                </div>
                <div style={{ border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, borderRadius: 8, padding: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
                    <span>{detailModal.servicePackage} Package ({detailModal.serviceQuantity || 1} session)</span>
                    <strong style={{ color: dark ? '#fff' : '#000' }}>{formatINR(detailModal.packagePrice || detailModal.estimatedPrice)}</strong>
                  </div>
                  {detailModal.extraServices?.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, color: dark ? '#aaa' : '#64748b' }}>
                      <span>+ {ex.label || ex.id || 'Extra Service'}</span>
                      <span>{formatINR(ex.price)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6,
                    borderTop: `1px solid ${dark ? '#222' : '#e2e8f0'}`, fontWeight: 800, fontSize: 14
                  }}>
                    <span>{detailModal.status === 'Completed' ? 'Final Total' : 'Estimated Total'}</span>
                    <span style={{ color: detailModal.status === 'Completed' ? '#10b981' : '#2563eb' }}>
                      {formatINR(detailModal.finalPrice || detailModal.estimatedPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {detailModal.status !== 'Completed' && detailModal.status !== 'Cancelled' && (
                  <button
                    onClick={() => {
                      const target = detailModal;
                      setDetailModal(null);
                      setCompleteModal(target);
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(16,185,129,0.3)'
                    }}
                  >
                    Mark as Done
                  </button>
                )}
                <button
                  onClick={() => setDetailModal(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MARK AS DONE CONFIRMATION MODAL (Requirement 7) ── */}
        {completeModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 520,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '26px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: dark ? '#052e16' : '#dcfce7', color: '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>
                  ✓
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Mark Service as Done</h3>
                  <div style={{ fontSize: 12, color: dark ? '#777' : '#64748b' }}>
                    Finalize pricing, record expense, and update customer history.
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: dark ? '#bbb' : '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
                Are you sure you want to mark this service as completed?
              </p>

              {/* Service & Pricing Review Box */}
              <div style={{
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 10, padding: '14px', marginBottom: 20, fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Vehicle:</span>
                  <strong>{completeModal.vehicle?.make} {completeModal.vehicle?.model} ({completeModal.vehicle?.licensePlate})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: dark ? '#888' : '#64748b' }}>Package:</span>
                  <span>{completeModal.servicePackage} Package ({formatINR(completeModal.packagePrice || completeModal.estimatedPrice)})</span>
                </div>
                {completeModal.extraServices && completeModal.extraServices.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: dark ? '#888' : '#64748b', marginBottom: 4 }}>Extra Services:</div>
                    {completeModal.extraServices.map((ex, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 10, color: dark ? '#aaa' : '#555' }}>
                        <span>• {ex.label || ex.id}</span>
                        <span>{formatINR(ex.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', paddingTop: 10,
                  borderTop: `1px solid ${dark ? '#222' : '#e2e8f0'}`, fontWeight: 800, fontSize: 15
                }}>
                  <span>Final Service Cost:</span>
                  <span style={{ color: '#10b981' }}>
                    {formatINR(completeModal.estimatedPrice || completeModal.finalPrice || 0)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={actionLoading}
                  onClick={() => setCompleteModal(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleConfirmCompletion}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Finalizing...' : 'Finalize & Mark Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reschedule Modal ── */}
        {rescheduleModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 420,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 14, padding: 24, color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>Reschedule Service</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Select New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Select Time Slot</label>
                <select
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={actionLoading}
                  onClick={() => setRescheduleModal(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading || !rescheduleDate}
                  onClick={handleRescheduleSubmit}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Cancel Modal ── */}
        {cancelModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 420,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 14, padding: 24, color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px', color: '#ef4444' }}>Cancel Booking</h3>
              <p style={{ fontSize: 13, color: dark ? '#888' : '#64748b', margin: '0 0 14px' }}>
                Are you sure you want to cancel this booking for {cancelModal.vehicle?.make} {cancelModal.vehicle?.model}?
              </p>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 4 }}>Cancellation Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Customer requested, workshop capacity exceeded..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  disabled={actionLoading}
                  onClick={() => setCancelModal(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleCancelSubmit}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
