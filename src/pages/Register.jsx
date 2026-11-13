import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api.js';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  // For demo purposes, letting user choose role. In production, admin accounts should be created securely.
  const [role, setRole] = useState('customer'); 
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);

  // If already authenticated in this tab, redirect immediately to dashboard
  useEffect(() => {
    if (user?.token) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { name: name.trim(), email: email.trim(), number: '+91 ' + number.trim(), password, role };
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#070707', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* TOP NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid #111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, background: '#fff' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>AeroFleet</div>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>/ AUTOMOTIVE ATELIER</div>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase' }}>System Online</span>
          <Link to="/" style={{ fontSize: 10, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#888'}>About</Link>
        </div>
      </div>

      <div className="auth-wrap">
        
        {/* LEFT SIDE: Register Form */}
        <div className="auth-form-panel" style={{ overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Client Authorization</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 }}>Client Portal<br/>Registration</h1>
          
          {error && (
            <div style={{ border: '1px solid #5a1a1a', color: '#ff6b6b', padding: '12px 16px', fontSize: 12, marginBottom: 24 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s' }}
                placeholder="Enter your full name"
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Email Address</label>
              <input 
                type="email" 
                required
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                title="Please enter a valid email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s' }}
                placeholder="tech@aerofleet.auto"
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Phone Number</label>
              <div style={{ display: 'flex', border: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                <div style={{ padding: '12px 16px', borderRight: '1px solid #1a1a1a', color: '#555', fontSize: 13, display: 'flex', alignItems: 'center' }}>+91</div>
                <input 
                  type="tel" 
                  required
                  pattern="^[0-9]{10}$"
                  title="Please enter exactly 10 digits"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#ccc', fontSize: 13, padding: '12px 16px', outline: 'none' }}
                  placeholder="XXXXXXXXXX"
                  onFocus={(e) => e.target.parentElement.style.border = '1px solid #444'}
                  onBlur={(e) => e.target.parentElement.style.border = '1px solid #1a1a1a'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Security Passphrase</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s' }}
                placeholder=".................."
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#999', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Account Type</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '12px 16px', outline: 'none', transition: 'border-color 0.2s', appearance: 'none' }}
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              >
                <option value="customer">Client (Vehicle Owner)</option>
                <option value="admin">Admin (Service Centre)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <button 
                type="submit" 
                style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = '#e0e0e0'}
                onMouseOut={(e) => e.target.style.background = '#fff'}
              >
                Register Terminal <span style={{ fontSize: 14 }}>→</span>
              </button>
              
              <Link to="/login" style={{ width: '100%', textDecoration: 'none' }}>
                <button 
                  type="button" 
                  style={{ width: '100%', background: '#040404', color: '#999', border: '1px solid #1a1a1a', padding: '16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#0a0a0a'; e.target.style.color = '#fff'; e.target.style.borderColor = '#333'; }}
                  onMouseOut={(e) => { e.target.style.background = '#040404'; e.target.style.color = '#999'; e.target.style.borderColor = '#1a1a1a'; }}
                >
                  Return to Login
                </button>
              </Link>
            </div>
          </form>
        </div>

        <div className="auth-brand-panel">
          <div style={{ fontSize: 10, color: '#888', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12 }}>Performance &amp; Fleet Atelier</div>
          <svg width="100%" viewBox="0 0 880 120" preserveAspectRatio="none" style={{ display: 'block', userSelect: 'none' }}>
            <text
              x="0" y="108"
              textLength="720"
              lengthAdjust="spacingAndGlyphs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 110,
                fill: '#fff',
                letterSpacing: '-3px'
              }}
            >
              AEROFLEET
            </text>
          </svg>
          <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 12 }}>
            Workshop Bays • Dyno Tuning • Performance Telemetry
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderTop: '1px solid #111' }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.05em' }}>© AEROFLEET GARAGE &amp; AUTOMOTIVE <span style={{ margin: '0 8px', color: '#222' }}>|</span> ALL RIGHTS RESERVED</div>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.1em' }}>RSA-4096 ZERO-KNOWLEDGE NODE</div>
      </div>
    </div>
  );
}
