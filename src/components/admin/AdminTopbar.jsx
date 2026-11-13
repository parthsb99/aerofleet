import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

const ADMIN_PAGE_TITLES = {
  '/admin':                  'Platform Overview',
  '/admin/dashboard':        'Platform Overview',
  '/admin/users':            'User Management',
  '/admin/vehicles':         'Fleet Vehicle Management',
  '/admin/bookings':         'Service Booking Operations',
  '/admin/service-history':  'Master Service History',
  '/admin/packages':         'Service Packages & Pricing',
  '/admin/garages':          'Workshop Garage Management',
  '/admin/expenditure':      'Revenue & Financial Management',
  '/admin/reports':          'Reports & Platform Analytics',
  '/admin/activity':         'System Activity & Audit Logs',
  '/admin/settings':         'Platform & Admin Settings',
};

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6v3l-1 2h11l-1-2V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.06 1.06M3.05 12.95l1.06-1.06M11.9 4.1l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11A6 6 0 0113.5 10z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

/* Notification type → icon + color mapping */
const NOTIF_STYLE = {
  'booking:created':    { icon: '📦', color: '#3b82f6' },
  'booking:confirmed':  { icon: '✓', color: '#22c55e' },
  'booking:rescheduled':{ icon: '📅', color: '#f59e0b' },
  'booking:cancelled':  { icon: '✕', color: '#ef4444' },
  'service:started':    { icon: '🔧', color: '#f97316' },
  'service:completed':  { icon: '✓', color: '#22c55e' },
  'user:registered':    { icon: '👤', color: '#8b5cf6' },
  'general':            { icon: '•', color: '#6b7280' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminTopbar({ onSearch, onToggleMobile }) {
  const { user, logout } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle = ADMIN_PAGE_TITLES[location.pathname] || 'AeroFleet Admin';

  // Click outside handlers
  useEffect(() => {
    const h = e => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: 60,
      boxSizing: 'border-box',
      background: dark ? '#0a0a0a' : '#ffffff',
      borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      {/* Left: Mobile hamburger & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onToggleMobile}
          style={{
            display: 'none',
            background: 'none', border: 'none',
            color: dark ? '#fff' : '#0f172a',
            fontSize: 20, cursor: 'pointer', padding: 0
          }}
          className="admin-mobile-toggle"
        >
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {pageTitle}
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(37,99,235,0.2)',
            color: '#3b82f6',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1
          }}>
            ADMIN PORTAL
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: dark ? '#161616' : '#f1f5f9',
            border: `1px solid ${dark ? '#27272a' : '#cbd5e1'}`,
            color: dark ? '#f0f0f0' : '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Notifications Bell Dropdown – Real-time from NotificationContext */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen && unreadCount > 0) markAllRead();
            }}
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: dark ? '#161616' : '#f1f5f9',
              border: `1px solid ${dark ? '#27272a' : '#cbd5e1'}`,
              color: dark ? '#f0f0f0' : '#0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative'
            }}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: unreadCount > 9 ? 18 : 15, height: 15,
                borderRadius: 10, background: '#ef4444',
                color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${dark ? '#0a0a0a' : '#ffffff'}`,
                lineHeight: 1, padding: '0 3px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 42, width: 360,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#27272a' : '#e2e8f0'}`,
              borderRadius: 12, boxShadow: dark ? '0 12px 36px rgba(0,0,0,0.6)' : '0 12px 36px rgba(0,0,0,0.16)',
              zIndex: 100, overflow: 'hidden',
              maxHeight: 440,
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                  Platform Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12, color: dark ? '#71717a' : '#94a3b8' }}>
                    No platform notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 25).map(n => {
                    const style = NOTIF_STYLE[n.type] || NOTIF_STYLE.general;
                    return (
                      <div
                        key={n._id}
                        onClick={() => {
                          if (n.type?.includes('booking')) navigate('/admin/bookings');
                          else if (n.type?.includes('service')) navigate('/admin/service-history');
                          setNotificationsOpen(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderBottom: `1px solid ${dark ? '#181818' : '#f1f5f9'}`,
                          cursor: 'pointer',
                          background: n.read ? 'transparent' : (dark ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.04)'),
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = dark ? '#181818' : '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : (dark ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.04)')}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${style.color}18`, color: style.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1,
                        }}>
                          {style.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: dark ? '#ffffff' : '#0f172a', fontSize: 12 }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: dark ? '#9ca3af' : '#64748b', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: 9, color: dark ? '#6b7280' : '#94a3b8', marginTop: 3 }}>
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {!n.read && (
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#3b82f6',
                            flexShrink: 0, marginTop: 6,
                          }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Avatar Profile Dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#2563eb', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700
            }}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
          </button>

          {avatarOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 42, width: 200,
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#27272a' : '#e2e8f0'}`,
              borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
              padding: '6px', zIndex: 100
            }}>
              <div style={{ padding: '8px 10px', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#ffffff' : '#0f172a' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => { navigate('/admin/settings'); setAvatarOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: 'none', border: 'none', fontSize: 12,
                  color: dark ? '#d4d4d8' : '#334155', cursor: 'pointer', borderRadius: 6
                }}
                onMouseOver={e => e.currentTarget.style.background = dark ? '#1c1c1c' : '#f1f5f9'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                Settings & Profile
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: 'none', border: 'none', fontSize: 12,
                  color: '#ef4444', cursor: 'pointer', borderRadius: 6
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
