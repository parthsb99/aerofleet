import React, { useState, useEffect, useContext, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import BrandLogo from '../../components/BrandLogo';

import { API_BASE as API } from '../../config/api.js';

function formatINR(val) {
  return '₹' + Math.round(val || 0).toLocaleString('en-IN');
}

export default function AdminExpenditure() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExpenditure = useCallback(() => {
    if (!user?.token) return;
    fetch(`${API}/api/admin/expenditure`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch expenditure error:', err);
        setLoading(false);
      });
  }, [user?.token]);

  useEffect(() => {
    fetchExpenditure();
  }, [fetchExpenditure]);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchExpenditure();
    };

    socket.on('expenditure:updated', handleUpdate);
    socket.on('service:updated', handleUpdate);
    socket.on('dashboard:updated', handleUpdate);
    socket.on('reconnect', handleUpdate);

    return () => {
      socket.off('expenditure:updated', handleUpdate);
      socket.off('service:updated', handleUpdate);
      socket.off('dashboard:updated', handleUpdate);
      socket.off('reconnect', handleUpdate);
    };
  }, [socket, fetchExpenditure]);

  const handleExportCSV = () => {
    if (!data?.vehicleBreakdown?.length) return;
    const headers = ['Vehicle', 'Registration', 'Owner', 'Services Completed', 'Package Spend', 'Extras Spend', 'Total Revenue'];
    const rows = data.vehicleBreakdown.map(v => [
      `"${v.vehicle?.make || ''} ${v.vehicle?.model || ''}"`,
      v.vehicle?.licensePlate || '',
      `"${v.owner?.name || 'Client'}"`,
      v.completedCount,
      v.packageTotal,
      v.extrasTotal,
      v.totalAmount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerofleet-revenue-breakdown-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Expenditure & Revenue Ledger
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Comprehensive financial audit: completed service billings, extra add-ons revenue, and customer fleet expenditure.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#f0f0f0' : '#1e293b',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            📥 Export Financial Report
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, marginBottom: 28
        }}>
          {/* Total Billed Revenue */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOTAL PLATFORM REVENUE
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(data?.totalCompletedCharges)}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              From {data?.completedCount || 0} completed services
            </div>
          </div>

          {/* Current Month Billed */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              THIS MONTH'S REVENUE
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(data?.monthlyCompletedCharges)}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Settled in {new Date().toLocaleString('default', { month: 'long' })}
            </div>
          </div>

          {/* Extra Services Revenue */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              EXTRA SERVICES BILLING
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(data?.extraServicesCharges)}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Add-on detailing, repairs & sanitization
            </div>
          </div>

          {/* Avg Service Ticket */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              AVG SERVICE TICKET
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : formatINR(data?.avgServiceValue)}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Average invoice across completed jobs
            </div>
          </div>
        </div>

        {/* Two Columns: Garage Breakdown & Vehicle-wise Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
          {/* Garage Performance */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 14px' }}>
              Revenue by Workshop Center
            </h3>
            {data?.garageBreakdown?.length === 0 ? (
              <p style={{ fontSize: 12, color: dark ? '#666' : '#999' }}>No completed workshop records yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: dark ? '#6b7280' : '#64748b', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                    <th style={{ padding: '8px 4px' }}>Center</th>
                    <th style={{ padding: '8px 4px' }}>Completed Jobs</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.garageBreakdown?.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${dark ? '#171717' : '#f8fafc'}` }}>
                      <td style={{ padding: '10px 4px', fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {g.garage}
                      </td>
                      <td style={{ padding: '10px 4px', color: dark ? '#aaa' : '#64748b' }}>
                        {g.count}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                        {formatINR(g.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* User Manual Logs vs AeroFleet Services */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 14px' }}>
              Platform Revenue vs Customer Logged Expenses
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 14, background: dark ? '#0a0a0a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 11, color: dark ? '#888' : '#64748b', textTransform: 'uppercase' }}>AeroFleet Service Revenue</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                  {formatINR(data?.totalCompletedCharges)}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#666' : '#999', marginTop: 2 }}>
                  Direct bookings executed & paid via AeroFleet workshops
                </div>
              </div>

              <div style={{ padding: 14, background: dark ? '#0a0a0a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 11, color: dark ? '#888' : '#64748b', textTransform: 'uppercase' }}>User Offline / Self-Reported Costs</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                  {formatINR(data?.userManualExpenditure)}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#666' : '#999', marginTop: 2 }}>
                  Fuel, tolls & 3rd-party repairs logged manually by users
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle-wise Ledger */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Vehicle-Wise Completed Expenditure Breakdown
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: dark ? '#666' : '#999' }}>Loading vehicle ledger...</div>
          ) : data?.vehicleBreakdown?.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: dark ? '#666' : '#999' }}>No completed services recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{
                    borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    color: dark ? '#6b7280' : '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Vehicle</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Owner</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Completed Jobs</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Package Spend</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Extra Services</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Total Expenditure</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.vehicleBreakdown?.map((v, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}` }}
                    >
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {v.vehicle?.make && <BrandLogo brand={v.vehicle.make} size={26} />}
                          <div>
                            <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              {v.vehicle?.make} {v.vehicle?.model}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>
                              {v.vehicle?.licensePlate || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 18px', color: dark ? '#d1d5db' : '#334155' }}>
                        {v.owner?.name || 'Client'}
                      </td>

                      <td style={{ padding: '12px 18px', color: dark ? '#f0f0f0' : '#0f172a', fontWeight: 600 }}>
                        {v.completedCount}
                      </td>

                      <td style={{ padding: '12px 18px', color: dark ? '#aaa' : '#64748b' }}>
                        {formatINR(v.packageTotal)}
                      </td>

                      <td style={{ padding: '12px 18px', color: dark ? '#aaa' : '#64748b' }}>
                        {formatINR(v.extrasTotal)}
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: 14 }}>
                        {formatINR(v.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
