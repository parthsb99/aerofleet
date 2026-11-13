import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api.js';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
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
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        navigate(data.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#070707', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* TOP NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid #111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, background: '#fff' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>AeroFleet</div>
          <div style={{ fontSize: 11, color: '#949494', letterSpacing: '0.1em' }}>/ AUTOMOTIVE ATELIER</div>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <span style={{ fontSize: 10, color: 'rgb(137, 137, 137)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>System Online</span>
          <Link to="/" style={{ fontSize: 10, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#888'}>About</Link>
        </div>
      </div>

      <div className="auth-wrap">
        
        {/* LEFT SIDE: Login Form */}
        <div className="auth-form-panel">
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Workshop Terminal Access</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 }}>Garage Operations<br/>Access</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 48, lineHeight: 1.6, maxWidth: '85%' }}>
            Sign in with technician or client credentials to access vehicle telemetry, service bays, and performance diagnostics.
          </p>

          {error && (
            <div style={{ border: '1px solid #5a1a1a', color: '#ff6b6b', padding: '12px 16px', fontSize: 12, marginBottom: 24 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: '#777', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Phone Number / Email</label>
              <input 
                type="text" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '14px 16px', outline: 'none', transition: 'border-color 0.2s' }}
                placeholder="Enter phone number or email"
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: '#777', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Security Passphrase</label>
                <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.05em', cursor: 'pointer' }}>RESET KEY?</span>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ccc', fontSize: 13, padding: '14px 16px', outline: 'none', transition: 'border-color 0.2s' }}
                placeholder=".................."
                onFocus={(e) => e.target.style.border = '1px solid #444'}
                onBlur={(e) => e.target.style.border = '1px solid #1a1a1a'}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '-4px' }}>
              <div style={{ width: 14, height: 14, border: '1px solid #333', background: 'transparent' }} />
              <span style={{ fontSize: 10, color: '#777', letterSpacing: '0.05em' }}>PERSIST 24H</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', background: loading ? '#555' : '#fff', color: loading ? '#aaa' : '#000', border: 'none', padding: '16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#e0e0e0'; }}
                onMouseOut={(e)  => { if (!loading) e.currentTarget.style.background = '#fff'; }}
              >
                {loading ? 'Authenticating…' : <>Authenticate Terminal <span style={{ fontSize: 14 }}>→</span></>}
              </button>
              
              <Link to="/register" style={{ width: '100%', textDecoration: 'none' }}>
                <button 
                  type="button" 
                  style={{ width: '100%', background: '#040404', color: '#999', border: '1px solid #1a1a1a', padding: '16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#0a0a0a'; e.target.style.color = '#fff'; e.target.style.borderColor = '#333'; }}
                  onMouseOut={(e) => { e.target.style.background = '#040404'; e.target.style.color = '#999'; e.target.style.borderColor = '#1a1a1a'; }}
                >
                  Client Portal Registration
                </button>
              </Link>
            </div>
          </form>
        </div>

        {/* RIGHT SIDE: Giant Slanted AeroFleet Text */}
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
