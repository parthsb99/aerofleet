import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { useTheme } from '../../context/ThemeContext';

export default function AdminLayout({ children, onSearch }) {
  const { dark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: dark ? '#0a0a0a' : '#f1f5f9',
      color: dark ? '#ffffff' : '#0f172a',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div style={{
        flex: 1,
        marginLeft: 240,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'margin-left 0.2s',
      }}
      className="admin-main-content"
      >
        <AdminTopbar onSearch={onSearch} onToggleMobile={() => setMobileOpen(!mobileOpen)} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
