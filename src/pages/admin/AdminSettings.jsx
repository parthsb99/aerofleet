import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { API_BASE as API } from '../../config/api.js';

export default function AdminSettings() {
  const { user, setUser } = useContext(AuthContext);
  const { dark } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Profile Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // System Settings Form
  const [taxRate, setTaxRate] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(12);
  const [platformName, setPlatformName] = useState('AeroFleet Automotive Atelier');
  const [notificationEmails, setNotificationEmails] = useState(true);
  const [systemSaving, setSystemSaving] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.admin) {
          setName(data.admin.name || '');
          setEmail(data.admin.email || '');
          setNumber(data.admin.number || data.admin.phone || '');
        }
        if (data.systemSettings) {
          setTaxRate(data.systemSettings.taxRate || 0);
          setMaxCapacity(data.systemSettings.maxDailyCapacityPerGarage || 12);
          setPlatformName(data.systemSettings.platformName || 'AeroFleet Automotive Atelier');
          setNotificationEmails(data.systemSettings.notificationEmails !== false);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch settings error:', err);
        setLoading(false);
      });
  }, [user?.token]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/settings/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ name, number })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Profile update failed');

      setMessage({ type: 'success', text: 'Admin profile updated successfully.' });
      if (setUser) {
        setUser(prev => ({ ...prev, name }));
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/settings/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');

      setMessage({ type: 'success', text: 'Admin security password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Handle System Settings Update
  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    setSystemSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/settings/system`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          taxRate: Number(taxRate),
          maxDailyCapacityPerGarage: Number(maxCapacity),
          platformName,
          notificationEmails
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'System settings update failed');

      setMessage({ type: 'success', text: 'System configuration saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSystemSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px 32px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
              Admin Settings
            </h1>
            <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: '4px 0 0' }}>
              Account profile, security credentials, and system operational parameters.
            </p>
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

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[
            { id: 'profile', label: 'Admin Profile' },
            { id: 'security', label: 'Security & Password' },
            { id: 'system', label: 'System Configuration' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: activeTab === tab.id ? '1px solid #2563eb' : `1px solid ${dark ? '#222' : '#e2e8f0'}`,
                background: activeTab === tab.id ? '#2563eb' : (dark ? '#111' : '#fff'),
                color: activeTab === tab.id ? '#fff' : (dark ? '#aaa' : '#64748b'),
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Profile ── */}
        {activeTab === 'profile' && (
          <div style={{
            maxWidth: 580,
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '24px'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 16px' }}>
              Administrator Profile
            </h2>
            <form onSubmit={handleProfileSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Admin Email (Immutable)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#1a1a1a' : '#f1f5f9',
                    border: `1px solid ${dark ? '#262626' : '#e2e8f0'}`,
                    color: dark ? '#777' : '#94a3b8', fontSize: 13, cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {/* ── Tab 2: Security ── */}
        {activeTab === 'security' && (
          <div style={{
            maxWidth: 580,
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '24px'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 16px' }}>
              Change Master Password
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>New Secure Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {passwordSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* ── Tab 3: System Settings ── */}
        {activeTab === 'system' && (
          <div style={{
            maxWidth: 580,
            background: dark ? '#111111' : '#ffffff',
            border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
            borderRadius: 14, padding: '24px'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 16px' }}>
              System Configuration
            </h2>
            <form onSubmit={handleSystemSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Platform Brand Title</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={e => setPlatformName(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>GST / Applicable Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: dark ? '#888' : '#64748b', display: 'block', marginBottom: 6 }}>Max Daily Capacity per Workshop (Bays)</label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={e => setMaxCapacity(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: dark ? '#0a0a0a' : '#f8fafc',
                    border: `1px solid ${dark ? '#222' : '#cbd5e1'}`,
                    color: dark ? '#fff' : '#000', fontSize: 13, outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="notifEmailsCheck"
                  checked={notificationEmails}
                  onChange={e => setNotificationEmails(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="notifEmailsCheck" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Enable Real-time Workshop Alert Notifications
                </label>
              </div>

              <button
                type="submit"
                disabled={systemSaving}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {systemSaving ? 'Saving Parameters...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
