import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    if (!user?.token) return;
    fetch(`${API}/api/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Admin stats error:', err);
        setLoading(false);
      });
  }, [user?.token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchStats();
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
  }, [socket, fetchStats]);

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Platform Overview
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Real-time monitoring across users, fleet vehicles, workshops, and service revenue.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/admin/bookings')}
              style={{
                padding: '8px 16px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.15s'
              }}
            >
              Manage Bookings
            </button>
          </div>
        </div>

        {/* ── 8 Primary Metric Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}>
          {/* Card 1: Total Users */}
          <div
            onClick={() => navigate('/admin/users')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOTAL USERS
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.totalUsers || 0}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Registered Clients →</div>
          </div>

          {/* Card 2: Total Vehicles */}
          <div
            onClick={() => navigate('/admin/vehicles')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOTAL VEHICLES
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.totalVehicles || 0}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Registered Fleet →</div>
          </div>

          {/* Card 3: Total Service Bookings */}
          <div
            onClick={() => navigate('/admin/bookings')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOTAL BOOKINGS
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.totalBookings || 0}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#9ca3af' : '#64748b' }}>Platform Total</div>
          </div>

          {/* Card 4: Pending Services */}
          <div
            onClick={() => navigate('/admin/bookings')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              PENDING CONFIRMATION
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.pendingServices || 0}
            </div>
            <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Needs Review</div>
          </div>

          {/* Card 5: Scheduled Services */}
          <div
            onClick={() => navigate('/admin/bookings')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              SCHEDULED
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.scheduledServices || 0}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Upcoming Bay Appointments</div>
          </div>

          {/* Card 6: Completed Services */}
          <div
            onClick={() => navigate('/admin/service-history')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              COMPLETED SERVICES
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', margin: '8px 0 2px' }}>
              {loading ? '—' : stats?.completedServices || 0}
            </div>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Successfully Serviced</div>
          </div>

          {/* Card 7: Total Service Revenue */}
          <div
            onClick={() => navigate('/admin/expenditure')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#2563eb' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOTAL SERVICE REVENUE
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(stats?.totalRevenue)}
            </div>
            <div style={{ fontSize: 11, color: '#10b981' }}>From Completed Services Only</div>
          </div>

          {/* Card 8: Monthly Service Revenue */}
          <div
            onClick={() => navigate('/admin/expenditure')}
            style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14, padding: '20px', cursor: 'pointer',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#10b981' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              MONTHLY REVENUE
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(stats?.monthlyRevenue)}
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6' }}>Current Calendar Month</div>
          </div>
        </div>

        {/* ── Charts & Visual Analytics Section ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 28
        }}>
          {/* Monthly Bookings & Revenue Trend */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            padding: '20px 24px',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                  6-Month Service Bookings & Revenue
                </h3>
                <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
                  Monthly trend from actual database records
                </span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 180, display: 'flex', alignItems: 'flex-end', gap: 10, paddingTop: 16 }}>
              {stats?.monthlyTrend?.map((mObj, idx) => {
                const maxBookings = Math.max(...(stats.monthlyTrend.map(t => t.bookings) || [1]), 1);
                const heightPct = Math.max(12, Math.round((mObj.bookings / maxBookings) * 100));

                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>
                      {mObj.bookings}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%)',
                      borderRadius: '4px 4px 2px 2px',
                    }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: dark ? '#9ca3af' : '#64748b' }}>
                      {mObj.month}
                    </span>
                    <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>
                      {formatINR(mObj.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Package Popularity */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            padding: '20px 24px',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: dark ? '#f0f0f0' : '#0f172a' }}>
              Service Package Popularity
            </h3>
            <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b', marginBottom: 16 }}>
              Customer package distribution across all bookings
            </span>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              {stats?.packagePopularity?.map(pkg => {
                const total = stats.totalBookings || 1;
                const pct = Math.round((pkg.count / total) * 100);
                const colors = {
                  Aero: '#3b82f6',
                  Pro: '#8b5cf6',
                  Elite: '#f59e0b',
                  Custom: '#6b7280'
                };
                const color = colors[pkg.name] || '#3b82f6';

                return (
                  <div key={pkg.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {pkg.name} Package
                      </span>
                      <span style={{ fontWeight: 700, color: color }}>
                        {pkg.count} bookings ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 7, background: dark ? '#1c1c1c' : '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle Manufacturer Distribution */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            padding: '20px 24px',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: dark ? '#f0f0f0' : '#0f172a' }}>
              Manufacturer Distribution
            </h3>
            <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b', marginBottom: 16 }}>
              Most common makes in customer fleets
            </span>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              {stats?.manufacturerDistribution?.slice(0, 5).map(m => (
                <div key={m.make} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 12px', borderRadius: 8,
                  background: dark ? '#161616' : '#f8fafc',
                  border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    {m.make}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>
                    {m.count} {m.count === 1 ? 'car' : 'cars'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Recent Activity & Recent Users ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Recent Audit / System Activity */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                Recent System Activity
              </h3>
              <span onClick={() => navigate('/admin/activity')} style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
                View All Activity →
              </span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {stats?.recentActivity?.length === 0 ? (
                <div style={{ padding: '24px 20px', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                  No system activity logged yet.
                </div>
              ) : (
                stats?.recentActivity?.slice(0, 5).map(act => (
                  <div key={act._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: `1px solid ${dark ? '#181818' : '#f1f5f9'}`
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {act.details}
                      </div>
                      <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
                        by {act.adminName} · {new Date(act.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(37,99,235,0.15)', color: '#3b82f6'
                    }}>
                      {act.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Customer Signups */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                Recent User Registrations
              </h3>
              <span onClick={() => navigate('/admin/users')} style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
                View All Users →
              </span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {stats?.recentUsers?.length === 0 ? (
                <div style={{ padding: '24px 20px', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                  No users registered yet.
                </div>
              ) : (
                stats?.recentUsers?.map(u => (
                  <div key={u._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: `1px solid ${dark ? '#181818' : '#f1f5f9'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 14,
                        background: '#2563eb', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700
                      }}>
                        {u.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#64748b' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
