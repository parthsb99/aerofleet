import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* Vector SVG Icons */
const DashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="11.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M11 9.5c1.8.2 3.5 1.2 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const VehiclesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 9L4.8 5.5A1.5 1.5 0 016.2 4.5h3.6a1.5 1.5 0 011.4 1l1.3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="1.5" y="8.5" width="13" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="4.5" cy="12.5" r="1.2" fill="currentColor"/>
    <circle cx="11.5" cy="12.5" r="1.2" fill="currentColor"/>
  </svg>
);

const BookingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="8" cy="10.5" r="1.2" fill="currentColor"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const PackagesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5l6 3.5v6.5l-6 3.5-6-3.5V5l6-3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 15V8.5M14 5L8 8.5 2 5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

const GaragesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5.5 15V9.5h5V15" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

const RevenueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 8h1M11 8h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const ReportsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 13.5h11M4 11V7M8 11V4M12 11V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 8.5h3l2-5 3 10 2-5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M5.5 2H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 13h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10 10.5l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const adminNavItems = [
  { label: 'Dashboard',           path: '/admin/dashboard',        Icon: DashIcon },
  { label: 'Users',               path: '/admin/users',            Icon: UsersIcon },
  { label: 'Vehicles',            path: '/admin/vehicles',         Icon: VehiclesIcon },
  { label: 'Service Bookings',    path: '/admin/bookings',         Icon: BookingsIcon },
  { label: 'Service History',     path: '/admin/service-history',  Icon: HistoryIcon },
  { label: 'Service Packages',    path: '/admin/packages',         Icon: PackagesIcon },
  { label: 'Garages',             path: '/admin/garages',          Icon: GaragesIcon },
  { label: 'Expenditure & Revenue', path: '/admin/expenditure',    Icon: RevenueIcon },
  { label: 'Reports & Analytics', path: '/admin/reports',          Icon: ReportsIcon },
  { label: 'System Activity',     path: '/admin/activity',         Icon: ActivityIcon },
  { label: 'Settings',            path: '/admin/settings',         Icon: SettingsIcon },
];

export default function AdminSidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useContext(AuthContext);
  const { dark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (onNav) => (
    <div style={{
      width: 240,
      background: dark ? '#0a0a0a' : '#ffffff',
      borderRight: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'Inter, sans-serif',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(37,99,235,0.2)',
            color: '#3b82f6',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            ADMIN
          </span>
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: 'none', border: 'none',
              color: dark ? '#6b7280' : '#94a3b8',
              fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Admin Badge Pill */}
      <div style={{ padding: '12px 14px 4px' }}>
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: dark ? '#141414' : '#f8fafc',
          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: '#2563eb', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700
          }}>
            AD
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Administrator'}
            </div>
            <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>
              Super Admin
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {adminNavItems.map(item => {
          const active = location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname === '/admin');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNav}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? (dark ? '#ffffff' : '#2563eb') : (dark ? '#9ca3af' : '#64748b'),
                background: active
                  ? (dark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)')
                  : 'transparent',
                borderRadius: 8,
                transition: 'all 0.15s',
                marginBottom: 2,
                borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
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
                  e.currentTarget.style.color = dark ? '#9ca3af' : '#64748b';
                }
              }}
            >
              <span style={{ color: active ? '#2563eb' : 'currentColor', flexShrink: 0 }}>
                <item.Icon />
              </span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px 8px 16px', borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: dark ? '#ef4444' : '#dc2626',
            borderRadius: 8,
            transition: 'all 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
          }}
        >
          <SignOutIcon /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE OVERLAY */}
      <div
        className={`r-sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{
          display: mobileOpen ? 'block' : 'none',
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49
        }}
      />

      {/* SIDEBAR CONTAINER */}
      <div
        className={`r-sidebar ${mobileOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 240,
          height: '100vh',
          zIndex: 50,
          overflowY: 'auto',
          background: dark ? '#0a0a0a' : '#ffffff',
        }}
      >
        {sidebarContent(() => setMobileOpen(false))}
      </div>
    </>
  );
}
