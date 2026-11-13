import React, { useState, useEffect, useContext, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../../components/BrandLogo';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminUsers() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status toggle confirmation
  const [confirmStatusModal, setConfirmStatusModal] = useState({ open: false, targetUser: null, newStatus: '' });
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/users`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch users error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [user?.token]);

  const openUserDetails = (u) => {
    setSelectedUser(u);
    setDetailsLoading(true);
    fetch(`${API}/api/admin/users/${u._id}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setUserDetails(data);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error('User details error:', err);
        setDetailsLoading(false);
      });
  };

  const handleStatusChange = async () => {
    const { targetUser, newStatus } = confirmStatusModal;
    if (!targetUser) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`${API}/api/admin/users/${targetUser._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');

      setMessage({ type: 'success', text: `User ${targetUser.name} has been ${newStatus.toLowerCase()} successfully.` });
      setConfirmStatusModal({ open: false, targetUser: null, newStatus: '' });
      fetchUsers();
      if (selectedUser && selectedUser._id === targetUser._id) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setStatusUpdating(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (u.status || 'Active').toUpperCase() === statusFilter;

      const matchRole =
        roleFilter === 'ALL' ||
        (u.role || 'customer').toUpperCase() === roleFilter;

      return matchQuery && matchStatus && matchRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const activeCount = users.filter(u => (u.status || 'Active') === 'Active').length;
  const suspendedCount = users.filter(u => u.status === 'Suspended').length;

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              User Management
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Manage registered accounts, view connected vehicles, inspect historical expenditure, and control account status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 8,
              background: dark ? '#111' : '#f1f5f9',
              border: `1px solid ${dark ? '#222' : '#e2e8f0'}`,
              fontSize: 12, fontWeight: 600, color: dark ? '#aaa' : '#475569'
            }}>
              <span>Active: <strong style={{ color: '#10b981' }}>{activeCount}</strong></span>
              <span>•</span>
              <span>Suspended: <strong style={{ color: '#ef4444' }}>{suspendedCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Notification Alert */}
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
              placeholder="Search by name, email, or phone..."
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              No users found matching your search.
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
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>User Profile</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Contact Info</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Role</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Vehicles</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Completed Services</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Joined</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const isSuspended = u.status === 'Suspended';
                    const initials = (u.name || 'User')
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr
                        key={u._id}
                        style={{
                          borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: u.role === 'admin' ? '#2563eb' : (dark ? '#262626' : '#e2e8f0'),
                              color: u.role === 'admin' ? '#fff' : (dark ? '#f0f0f0' : '#1e293b'),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                {u.name || 'Unnamed User'}
                              </div>
                              <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                                ID: {u._id.slice(-6)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ color: dark ? '#d1d5db' : '#334155' }}>{u.email}</div>
                          <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>{u.number || u.phone || 'No phone'}</div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: u.role === 'admin' ? (dark ? '#1e3a8a' : '#dbeafe') : (dark ? '#1f2937' : '#f3f4f6'),
                            color: u.role === 'admin' ? '#60a5fa' : (dark ? '#9ca3af' : '#4b5563')
                          }}>
                            {u.role === 'admin' ? 'Administrator' : 'Customer'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: isSuspended ? (dark ? '#450a0a' : '#fee2e2') : (dark ? '#052e16' : '#dcfce7'),
                            color: isSuspended ? '#f87171' : '#16a34a'
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSuspended ? '#ef4444' : '#10b981' }} />
                            {u.status || 'Active'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', color: dark ? '#f0f0f0' : '#0f172a', fontWeight: 600 }}>
                          {u.vehiclesCount ?? u.vehicleCount ?? 0}
                        </td>

                        <td style={{ padding: '14px 18px', color: dark ? '#f0f0f0' : '#0f172a', fontWeight: 600 }}>
                          {u.completedCount ?? u.completedBookingsCount ?? 0}
                        </td>

                        <td style={{ padding: '14px 18px', color: dark ? '#9ca3af' : '#64748b', fontSize: 12 }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              onClick={() => openUserDetails(u)}
                              style={{
                                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
                                border: 'none', cursor: 'pointer'
                              }}
                            >
                              Details
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => setConfirmStatusModal({
                                  open: true,
                                  targetUser: u,
                                  newStatus: isSuspended ? 'Active' : 'Suspended'
                                })}
                                style={{
                                  padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                  background: isSuspended ? '#10b981' : '#ef4444',
                                  color: '#fff', border: 'none', cursor: 'pointer'
                                }}
                              >
                                {isSuspended ? 'Activate' : 'Suspend'}
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

        {/* ── User Details Modal ── */}
        {selectedUser && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '28px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                    {selectedUser.name}
                  </h2>
                  <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b', marginTop: 4 }}>
                    {selectedUser.email} • {selectedUser.phone || 'No phone'} • Status: <strong>{selectedUser.status || 'Active'}</strong>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserDetails(null); }}
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
                <div style={{ padding: 40, textAlign: 'center', color: dark ? '#666' : '#999' }}>Loading details...</div>
              ) : userDetails ? (
                <div>
                  {/* Financial & Activity Summary */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
                    background: dark ? '#0a0a0a' : '#f8fafc', padding: 14, borderRadius: 10,
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Total Spent</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>
                        {formatINR(userDetails.totalExpenditure)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Fleet Size</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#000', marginTop: 4 }}>
                        {userDetails.vehicles?.length || 0} Cars
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: dark ? '#666' : '#999', textTransform: 'uppercase' }}>Services Completed</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                        {userDetails.bookings?.filter(b => b.status === 'Completed').length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Registered Vehicles */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: dark ? '#bbb' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Registered Vehicles ({userDetails.vehicles?.length || 0})
                    </h3>
                    {userDetails.vehicles?.length === 0 ? (
                      <p style={{ fontSize: 12, color: dark ? '#666' : '#999' }}>No vehicles registered yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                        {userDetails.vehicles.map(v => (
                          <div key={v._id} style={{
                            padding: 12, borderRadius: 8,
                            background: dark ? '#171717' : '#f8fafc',
                            border: `1px solid ${dark ? '#262626' : '#e2e8f0'}`,
                            display: 'flex', alignItems: 'center', gap: 10
                          }}>
                            <BrandLogo brand={v.make} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.make} {v.model} ({v.year})</div>
                              <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'monospace', fontWeight: 600 }}>{v.licensePlate}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking / Service History */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: dark ? '#bbb' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recent Bookings ({userDetails.bookings?.length || 0})
                    </h3>
                    {userDetails.bookings?.length === 0 ? (
                      <p style={{ fontSize: 12, color: dark ? '#666' : '#999' }}>No booking records found.</p>
                    ) : (
                      <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`, borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: dark ? '#0a0a0a' : '#f1f5f9', color: dark ? '#666' : '#64748b' }}>
                              <th style={{ padding: '8px 12px' }}>Service</th>
                              <th style={{ padding: '8px 12px' }}>Vehicle</th>
                              <th style={{ padding: '8px 12px' }}>Date</th>
                              <th style={{ padding: '8px 12px' }}>Status</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetails.bookings.map(b => (
                              <tr key={b._id} style={{ borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}` }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{b.servicePackage || 'Standard'}</td>
                                <td style={{ padding: '8px 12px', color: dark ? '#aaa' : '#555' }}>
                                  {b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}` : '—'}
                                </td>
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

        {/* ── Status Confirmation Modal ── */}
        {confirmStatusModal.open && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 440,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 14, padding: 24, textAlign: 'center'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>
                {confirmStatusModal.newStatus === 'Suspended' ? '⚠️' : '✅'}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 8px' }}>
                {confirmStatusModal.newStatus === 'Suspended' ? 'Suspend Account' : 'Activate Account'}
              </h3>
              <p style={{ fontSize: 13, color: dark ? '#888' : '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Are you sure you want to {confirmStatusModal.newStatus.toLowerCase()} <strong>{confirmStatusModal.targetUser?.name}</strong>?
                {confirmStatusModal.newStatus === 'Suspended' ? ' They will no longer be able to log in or book services until reactivated.' : ' They will regain full access to their dashboard and vehicle management.'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  disabled={statusUpdating}
                  onClick={() => setConfirmStatusModal({ open: false, targetUser: null, newStatus: '' })}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={statusUpdating}
                  onClick={handleStatusChange}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: confirmStatusModal.newStatus === 'Suspended' ? '#ef4444' : '#10b981',
                    color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  {statusUpdating ? 'Processing...' : `Confirm ${confirmStatusModal.newStatus}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
