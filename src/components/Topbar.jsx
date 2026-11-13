import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const PAGE_TITLES = {
  '/dashboard':       'Dashboard',
  '/my-vehicles':     'My Vehicles',
  '/book-service':    'Book Service',
  '/service-history': 'Service History',
  '/expenditure':     'Monthly Expenditure',
};

const BellIcon   = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A4.5 4.5 0 003.5 6v3l-1 2h11l-1-2V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.4"/><path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const CloseIcon  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;

/* Sun icon for light mode */
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.06 1.06M3.05 12.95l1.06-1.06M11.9 4.1l1.06-1.06"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

/* Moon icon for dark mode */
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11A6 6 0 0113.5 10z"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

/* Notification type → icon + color */
const NOTIF_STYLE = {
  'booking:confirmed':  { icon: '✓', color: '#22c55e' },
  'booking:rescheduled':{ icon: '📅', color: '#3b82f6' },
  'booking:cancelled':  { icon: '✕', color: '#ef4444' },
  'service:started':    { icon: '🔧', color: '#f97316' },
  'service:completed':  { icon: '✓', color: '#22c55e' },
  'expenditure:updated':{ icon: '₹', color: '#8b5cf6' },
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

export default function Topbar({ onSearch }) {
  const { user, logout } = useContext(AuthContext);
  const { dark, toggle } = useTheme();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query,      setQuery]      = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bellOpen,   setBellOpen]   = useState(false);
  const inputRef  = useRef(null);
  const avatarRef = useRef(null);
  const bellRef   = useRef(null);

  const initials  = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const pageTitle = PAGE_TITLES[location.pathname] || 'AeroFleet';

  useEffect(() => { if (searchOpen && inputRef.current) inputRef.current.focus(); }, [searchOpen]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); onSearch?.(''); setBellOpen(false); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = e => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSearch = v => { setQuery(v); onSearch?.(v); };
  const handleLogout = () => { logout(); navigate('/login'); };

  /* icon button base style — adapts to theme via CSS vars */
  const iconBtn = {
    width: 36, height: 36, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: dark ? '#141414' : '#f1f5f9',
    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
    cursor: 'pointer',
    color: dark ? '#6b7280' : '#64748b',
    transition: 'all 0.15s',
    flexShrink: 0,
  };

  const hoverIn  = e => { e.currentTarget.style.background = dark ? '#1c1c1c' : '#e2e8f0'; e.currentTarget.style.color = dark ? '#f0f0f0' : '#0f172a'; };
  const hoverOut = e => { e.currentTarget.style.background = dark ? '#141414' : '#f1f5f9'; e.currentTarget.style.color = dark ? '#6b7280' : '#64748b'; };

  return (
    <div style={{
      height: 60,
      boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
      background: dark ? '#0d0d0d' : '#ffffff',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 30,
      transition: 'background 0.25s, border-color 0.25s',
    }} className="r-desktop-topbar">

      {/* Page title */}
      <div style={{ fontSize: 15, fontWeight: 600, color: dark ? '#a0a0a0' : '#475569', letterSpacing: '-0.01em' }}>
        {pageTitle}
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          {searchOpen && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: dark ? '#141414' : '#f8fafc',
              border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
              borderRadius: 8, padding: '0 10px 0 14px', height: 36, marginRight: 4,
            }}>
              <input
                ref={inputRef} value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: dark ? '#d1d5db' : '#0f172a',
                  fontSize: 13, fontFamily: 'Inter, sans-serif', width: 180,
                }}
              />
              <button onClick={() => { setSearchOpen(false); handleSearch(''); }}
                style={{ background: 'none', border: 'none', color: dark ? '#6b7280' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                <CloseIcon />
              </button>
            </div>
          )}
          <button onClick={() => setSearchOpen(v => !v)} style={{ ...iconBtn }}
            onMouseOver={hoverIn} onMouseOut={hoverOut} title="Search">
            <SearchIcon />
          </button>
        </div>

        {/* 🌙 / ☀ Dark / Light mode toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ ...iconBtn }}
          onMouseOver={hoverIn}
          onMouseOut={hoverOut}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Bell – Real Notification Center */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setBellOpen(v => !v); if (!bellOpen && unreadCount > 0) markAllRead(); }}
            style={{ ...iconBtn, position: 'relative' }}
            onMouseOver={hoverIn} onMouseOut={hoverOut} title="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: unreadCount > 9 ? 18 : 15, height: 15,
                borderRadius: 10, background: '#ef4444',
                color: '#fff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${dark ? '#0d0d0d' : '#ffffff'}`,
                lineHeight: 1,
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 340,
              background: dark ? '#0f0f0f' : '#ffffff',
              border: `1px solid ${dark ? '#2a2b30' : '#e2e8f0'}`,
              borderRadius: 12,
              boxShadow: dark ? '0 12px 32px rgba(0,0,0,0.7)' : '0 12px 32px rgba(0,0,0,0.14)',
              zIndex: 9999, overflow: 'hidden',
              maxHeight: 420,
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${dark ? '#1c1c1c' : '#f1f5f9'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#e5e7eb' : '#0f172a' }}>
                  Notifications
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

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: dark ? '#4b5563' : '#94a3b8', fontSize: 13 }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 20).map(n => {
                    const style = NOTIF_STYLE[n.type] || NOTIF_STYLE.general;
                    return (
                      <div key={n._id} style={{
                        padding: '10px 16px',
                        borderBottom: `1px solid ${dark ? '#111' : '#f8fafc'}`,
                        background: n.read ? 'transparent' : (dark ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.04)'),
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        cursor: 'default',
                      }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${style.color}18`, color: style.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1,
                        }}>
                          {style.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e7eb' : '#0f172a', marginBottom: 2 }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 11, color: dark ? '#9ca3af' : '#64748b', lineHeight: 1.4 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: 10, color: dark ? '#4b5563' : '#94a3b8', marginTop: 3 }}>
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

        {/* Avatar with dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setAvatarOpen(v => !v)}
            style={{
              width: 36, height: 36, borderRadius: '50%', background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
              border: avatarOpen ? '2px solid #3b82f6' : `2px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              transition: 'border-color 0.15s',
            }}
            title="Profile"
          >{initials}</div>

          {avatarOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: dark ? '#0f0f0f' : '#ffffff',
              border: `1px solid ${dark ? '#2a2b30' : '#e2e8f0'}`,
              borderRadius: 10,
              boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 200, zIndex: 9999, overflow: 'hidden',
            }}>
              {/* User info */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#f1f5f9'}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>{user?.email || ''}</div>
                <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {user?.role || 'Customer'}
                </div>
              </div>
              {[
                { label: 'Dashboard',       icon: '⊞', to: '/dashboard' },
                { label: 'My Vehicles',     icon: '🚗', to: '/my-vehicles' },
                { label: 'Book Service',    icon: '🔧', to: '/book-service' },
                { label: 'Service History', icon: '📋', to: '/service-history' },
              ].map(item => (
                <div
                  key={item.to}
                  onClick={() => { navigate(item.to); setAvatarOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    cursor: 'pointer', fontSize: 13,
                    color: dark ? '#d1d5db' : '#334155',
                    transition: 'background 0.1s',
                    borderBottom: `1px solid ${dark ? '#111' : '#f8fafc'}`,
                  }}
                  onMouseOver={e => e.currentTarget.style.background = dark ? '#141414' : '#f8fafc'}
                  onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
              <div
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  cursor: 'pointer', fontSize: 13, color: '#ef4444', transition: 'background 0.1s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
              >
                <span>↪</span> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
