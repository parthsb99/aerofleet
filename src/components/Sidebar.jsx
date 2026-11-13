import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
  </svg>
);

const CalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 9L4.8 5.5A1.5 1.5 0 016.2 4.5h3.6a1.5 1.5 0 011.4 1l1.3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="1.5" y="8.5" width="13" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="4.5" cy="12.5" r="1.2" fill="currentColor"/>
    <circle cx="11.5" cy="12.5" r="1.2" fill="currentColor"/>
  </svg>
);

const SupportIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5.5 6a2 2 0 114 0c0 1.5-2 2-2 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="7.5" cy="11.5" r="0.7" fill="currentColor"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M5.5 2H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 13h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10 10.5l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExpenditureIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 8h1M11 8h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const navItems = [
  { label: 'Dashboard',           path: '/dashboard',           Icon: DashIcon },
  { label: 'Book Service',        path: '/book-service',        Icon: CalIcon },
  { label: 'Service History',     path: '/service-history',     Icon: HistoryIcon },
  { label: 'My Vehicles',         path: '/my-vehicles',         Icon: CarIcon },
  { label: 'Monthly Expenditure', path: '/expenditure',         Icon: ExpenditureIcon },
];

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const { dark } = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (onNav) => (
    <div style={{
      width: 220,
      background: dark ? '#0a0a0a' : '#ffffff',
      borderRight: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
      display: 'flex', flexDirection: 'column',
      height: '100%', fontFamily: 'Inter, sans-serif',
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      {/* Brand Header */}
      <div style={{
        height: 60,
        boxSizing: 'border-box',
        padding: '0 20px',
        borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: dark ? '#ffffff' : '#0f172a',
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            AeroFleet
          </div>
        </div>
        <button
          className="r-mobile-close"
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: dark ? '#6b7280' : '#94a3b8', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}
        >✕</button>
      </div>

      {/* Add Vehicle Button */}
      <div style={{ padding: '14px 12px 4px' }}>
        <Link
          to="/my-vehicles"
          onClick={onNav}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px', background: '#2563eb', color: '#fff', borderRadius: 8,
            fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s',
            width: '100%',
          }}
          onMouseOver={e => e.currentTarget.style.background='#3b82f6'}
          onMouseOut={e => e.currentTarget.style.background='#2563eb'}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Vehicle
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNav}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', textDecoration: 'none',
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? (dark ? '#ffffff' : '#2563eb') : (dark ? '#6b7280' : '#64748b'),
                background: active
                  ? (dark ? 'rgba(255,255,255,0.07)' : 'rgba(37,99,235,0.08)')
                  : 'transparent',
                borderRadius: 8,
                transition: 'all 0.15s',
                marginBottom: 2,
                borderLeft: active ? '2px solid #2563eb' : '2px solid transparent',
              }}
              onMouseOver={e => {
                if (!active) {
                  e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = dark ? '#d1d5db' : '#0f172a';
                }
              }}
              onMouseOut={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = dark ? '#6b7280' : '#64748b';
                }
              }}
            >
              <span style={{ color: active ? '#2563eb' : 'currentColor', flexShrink: 0 }}>
                <item.Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px 8px 16px', borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 12px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: dark ? '#9ca3af' : '#64748b',
            borderRadius: 8, transition: 'all 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.color = dark ? '#d1d5db' : '#0f172a';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
          }}
        >
          <SupportIcon /> Support
        </button>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 12px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: dark ? '#9ca3af' : '#64748b',
            borderRadius: 8, transition: 'all 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.color = dark ? '#d1d5db' : '#0f172a';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
          }}
        >
          <SignOutIcon /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE TOPBAR */}
      <div className="r-mobile-topbar" style={{
        display: 'none',
        background: dark ? '#0a0a0a' : '#ffffff',
        borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`
      }}>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', color: dark ? '#fff' : '#0f172a', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          ☰ <span style={{ fontSize: 14, fontWeight: 700 }}>AeroFleet</span>
        </button>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`, color: dark ? '#9ca3af' : '#64748b', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer', borderRadius: 6 }}
        >
          Sign Out
        </button>
      </div>

      {/* OVERLAY */}
      <div className={`r-sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      {/* SIDEBAR */}
      <div
        className={`r-sidebar ${open ? 'open' : ''}`}
        style={{
          position: 'fixed', left: 0, top: 0, width: 220, height: '100vh', zIndex: 50, overflowY: 'auto',
          background: dark ? '#0a0a0a' : '#ffffff',
        }}
      >
        {sidebarContent(() => setOpen(false))}
      </div>
    </>
  );
}
