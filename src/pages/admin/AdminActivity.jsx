import React, { useState, useEffect, useContext, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { API_BASE as API } from '../../config/api.js';

export default function AdminActivity() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/activity?limit=100`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch activity error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.token]);

  // Unique actions for filtering
  const uniqueActions = useMemo(() => {
    const s = new Set();
    logs.forEach(l => { if (l.action) s.add(l.action); });
    return Array.from(s).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = search.toLowerCase();
      const matchQuery =
        !search ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.adminEmail && l.adminEmail.toLowerCase().includes(q)) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(q));

      const matchAction = actionFilter === 'ALL' || l.action === actionFilter;

      return matchQuery && matchAction;
    });
  }, [logs, search, actionFilter]);

  const getActionBadgeColor = (action) => {
    if (action.includes('COMPLETE')) return { bg: dark ? '#052e16' : '#dcfce7', text: '#16a34a' };
    if (action.includes('CANCEL') || action.includes('SUSPEND')) return { bg: dark ? '#450a0a' : '#fee2e2', text: '#ef4444' };
    if (action.includes('LOGIN')) return { bg: dark ? '#1e1b4b' : '#ede9fe', text: '#8b5cf6' };
    return { bg: dark ? '#1e3a8a' : '#dbeafe', text: '#2563eb' };
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              System Activity & Audit Logs
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Immutable administrative audit trail tracking operations, permissions, pricing modifications, and logins.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
              border: 'none', cursor: 'pointer'
            }}
          >
            ↻ Refresh Logs
          </button>
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
              placeholder="Search audit trail by admin, action, or payload..."
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

          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#777' : '#64748b' }}>Action Type:</span>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                color: dark ? '#fff' : '#000', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="ALL">All Actions ({logs.length})</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div style={{
          background: dark ? '#111111' : '#ffffff',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          borderRadius: 14, overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
              No audit logs recorded matching current filter.
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
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Timestamp</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Action</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Administrator</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Target Entity</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Summary</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(l => {
                    const badge = getActionBadgeColor(l.action || '');

                    return (
                      <tr
                        key={l._id}
                        style={{
                          borderBottom: `1px solid ${dark ? '#171717' : '#f1f5f9'}`,
                          transition: 'background 0.1s'
                        }}
                      >
                        <td style={{ padding: '14px 18px', color: dark ? '#aaa' : '#64748b', fontSize: 12 }}>
                          {new Date(l.createdAt).toLocaleString('en-IN', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: badge.bg, color: badge.text, fontFamily: 'monospace'
                          }}>
                            {l.action}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                            {l.adminEmail || 'System'}
                          </div>
                          {l.adminId && (
                            <div style={{ fontSize: 10, color: dark ? '#666' : '#999' }}>
                              ID: {String(l.adminId).slice(-6)}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', color: dark ? '#ddd' : '#334155' }}>
                          <span style={{ fontSize: 11, padding: '2px 6px', background: dark ? '#1e293b' : '#f1f5f9', borderRadius: 4 }}>
                            {l.targetModel || 'System'}
                          </span>
                          {l.targetId && (
                            <span style={{ fontSize: 11, color: dark ? '#777' : '#999', marginLeft: 6 }}>
                              #{String(l.targetId).slice(-6)}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', color: dark ? '#bbb' : '#475569', fontSize: 12 }}>
                          {l.details?.message || l.details?.reason || (typeof l.details === 'string' ? l.details : JSON.stringify(l.details).slice(0, 50))}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedLog(l)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: dark ? '#1f2937' : '#e2e8f0', color: dark ? '#fff' : '#000',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            Inspect JSON
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Log Details Modal ── */}
        {selectedLog && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              width: '100%', maxWidth: 520,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
              borderRadius: 16, padding: '24px', color: dark ? '#f0f0f0' : '#0f172a'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Audit Entry Inspection</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: dark ? '#aaa' : '#666' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: 12, marginBottom: 12, color: dark ? '#888' : '#64748b' }}>
                Action: <strong style={{ color: '#2563eb' }}>{selectedLog.action}</strong> • Performed: {new Date(selectedLog.createdAt).toLocaleString()}
              </div>

              <pre style={{
                background: dark ? '#0a0a0a' : '#f8fafc',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 8, padding: 14, fontSize: 12,
                overflowX: 'auto', maxHeight: 280, color: dark ? '#34d399' : '#059669',
                margin: '0 0 16px'
              }}>
                {JSON.stringify(selectedLog, null, 2)}
              </pre>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
