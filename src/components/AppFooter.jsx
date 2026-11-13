import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AppFooter() {
  const { dark } = useTheme();
  return (
    <div style={{
      borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', flexShrink: 0,
      background: dark ? '#0a0a0a' : '#ffffff',
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      <span>© 2024 AeroFleet Management. All rights reserved.</span>
      <div style={{ display: 'flex', gap: 20 }}>
        {['Privacy Policy','Terms of Service','Security','Fleet Standards'].map(l => (
          <a key={l} href="#" style={{ color: dark ? '#6b7280' : '#94a3b8', textDecoration: 'none' }}
            onMouseOver={e => e.currentTarget.style.color = dark ? '#9ca3af' : '#475569'}
            onMouseOut={e  => e.currentTarget.style.color = dark ? '#6b7280' : '#94a3b8'}
          >{l}</a>
        ))}
      </div>
    </div>
  );
}
