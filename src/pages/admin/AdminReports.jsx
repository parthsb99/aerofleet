import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { API_BASE as API } from '../../config/api.js';

export default function AdminReports() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(res => {
        setReport(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch reports error:', err);
        setLoading(false);
      });
  }, [user?.token]);

  const s = report?.summary || {};

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Reports & Operational Analytics
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Service fulfillment benchmarks, cancellation metrics, add-on adoption, and fleet health.
            </p>
          </div>
        </div>

        {/* 4 Summary Performance Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, marginBottom: 28
        }}>
          {/* Completion Rate */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              SERVICE COMPLETION RATE
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', margin: '8px 0 2px' }}>
              {loading ? '—' : `${s.completionRate || 0}%`}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              {s.completedCount || 0} of {s.totalBookings || 0} bookings completed
            </div>
          </div>

          {/* Scheduled in Queue */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              SCHEDULED IN PIPELINE
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#3b82f6', margin: '8px 0 2px' }}>
              {loading ? '—' : s.scheduledCount || 0}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Upcoming booked slots
            </div>
          </div>

          {/* Cancellation Ratio */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              CANCELLED REQUESTS
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', margin: '8px 0 2px' }}>
              {loading ? '—' : s.cancelledCount || 0}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Voided or customer cancelled
            </div>
          </div>

          {/* Fleet to Client Ratio */}
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '20px'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              FLEET ENROLLMENT RATIO
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: dark ? '#f0f0f0' : '#0f172a', margin: '8px 0 2px' }}>
              {loading ? '—' : (s.totalUsers ? (s.totalVehicles / s.totalUsers).toFixed(1) : 0)}
            </div>
            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
              Vehicles per registered client
            </div>
          </div>
        </div>

        {/* Extra Services Popularity Breakdown */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, padding: '24px', marginBottom: 28
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Add-on Extra Services Adoption Ranking
          </h2>

          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: dark ? '#666' : '#999' }}>Loading analytics...</div>
          ) : !report?.extraServicesPopularity?.length ? (
            <div style={{ padding: 30, textAlign: 'center', color: dark ? '#666' : '#999' }}>No extra service requests recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {report.extraServicesPopularity.map((item, idx) => {
                const maxCount = Math.max(...report.extraServicesPopularity.map(x => x.count), 1);
                const pct = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                        {idx + 1}. {item.service}
                      </span>
                      <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                        {item.count} requested
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: dark ? '#1c1c1c' : '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                        borderRadius: 4, transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
