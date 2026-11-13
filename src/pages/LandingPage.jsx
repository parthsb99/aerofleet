import React, { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Custom hook for intersection observer animations
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.12 }
    );
    const all = document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right');
    all.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const stats = [
  { value: '12K+', label: 'Vehicles Serviced' },
  { value: '98%', label: 'Customer Satisfaction' },
  { value: '50+', label: 'Certified Technicians' },
  { value: '15+', label: 'Years of Expertise' },
];

const services = [
  { icon: 'ENG', title: 'Engine Diagnostics', desc: 'Advanced OBD-II scanning and full engine health assessment by trained specialists.' },
  { icon: 'SVC', title: 'Periodic Maintenance', desc: 'Timely oil changes, filter replacements, and fluid top-ups to keep your car running smooth.' },
  { icon: 'TYR', title: 'Tyre & Alignment', desc: 'Precision wheel balancing, alignment checks, and tyre rotations for optimal safety.' },
  { icon: 'A/C', title: 'AC & Climate Control', desc: 'Full AC gas refill, compressor inspection, and cabin filter replacement.' },
  { icon: 'BAT', title: 'Battery & Electricals', desc: 'Battery health check, alternator diagnostics, and full electrical system inspection.' },
  { icon: 'BDY', title: 'Bodywork & Paint', desc: 'Scratch repair, dent removal, and premium paint correction services.' },
];

const vehicleCards = [
  { make: 'BMW', model: '5 Series', year: '2022', status: 'Serviced', km: '18,500 km', img: '/images/bmw_5series_bw.jpg' },
  { make: 'Mercedes-Benz', model: 'E-Class', year: '2021', status: 'Due Soon', km: '32,100 km', img: '/images/mercedes_eclass_bw.jpg' },
  { make: 'Audi', model: 'A6', year: '2023', status: 'Healthy', km: '8,200 km', img: '/images/audi_a6_bw.jpg' },
];

export default function LandingPage() {
  useScrollAnimation();
  const { user } = useContext(AuthContext);
  const portalPath = user?.role === 'admin' ? '/admin' : '/dashboard';
  const portalLabel = user?.role === 'admin' ? 'Admin Portal' : 'Dashboard';

  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* STYLE TAG for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .scroll-animate {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .scroll-animate.delay-1 { transition-delay: 0.1s; }
        .scroll-animate.delay-2 { transition-delay: 0.2s; }
        .scroll-animate.delay-3 { transition-delay: 0.3s; }
        .scroll-animate.delay-4 { transition-delay: 0.4s; }
        .scroll-animate.delay-5 { transition-delay: 0.5s; }
        .scroll-animate.delay-6 { transition-delay: 0.6s; }
        .animate-in .scroll-animate,
        .scroll-animate.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .scroll-animate-left {
          opacity: 0;
          transform: translateX(-60px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        .scroll-animate-left.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .scroll-animate-right {
          opacity: 0;
          transform: translateX(60px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        .scroll-animate-right.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .nav-link {
          color: #aaa;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }
        .cta-btn {
          background: #fff;
          color: #000;
          border: none;
          padding: 14px 36px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s, color 0.2s;
        }
        .cta-btn:hover { background: #e0e0e0; }
        .cta-btn-outline {
          background: transparent;
          color: #fff;
          border: 1px solid #fff;
          padding: 13px 36px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s, color 0.2s;
        }
        .cta-btn-outline:hover { background: #fff; color: #000; }
        .service-card {
          border: 1px solid #1a1a1a;
          padding: 36px 28px;
          background: #0a0a0a;
          transition: border-color 0.3s, transform 0.3s;
        }
        .service-card:hover { border-color: #444; transform: translateY(-4px); }
        .vehicle-card {
          border: 1px solid #1a1a1a;
          padding: 28px;
          background: #080808;
          transition: border-color 0.3s;
        }
        .vehicle-card:hover { border-color: #333; }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .status-serviced { background: #1a1a1a; color: #aaa; }
        .status-due { background: #2a1a00; color: #e0a000; }
        .status-healthy { background: #0a1a0a; color: #5a9a5a; }
        .divider-line {
          width: 60px;
          height: 2px;
          background: #fff;
          margin-bottom: 24px;
        }
        .counter-num {
          font-size: clamp(40px, 6vw, 80px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .section-tag {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 16px;
        }
        .hero-title {
          font-size: clamp(56px, 9vw, 130px);
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.04em;
          font-style: italic;
          text-transform: uppercase;
        }
        .section-title {
          font-size: clamp(36px, 5vw, 72px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }
        .scroll-line {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 1px;
          height: 100%;
          background: linear-gradient(to bottom, transparent, #333, transparent);
        }
        .feature-num {
          font-size: 72px;
          font-weight: 900;
          color: #111;
          line-height: 1;
          position: absolute;
          top: -10px;
          right: 0;
          letter-spacing: -0.05em;
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-animate { animation: heroFadeUp 1s ease forwards; }
        .hero-animate-2 { animation: heroFadeUp 1s ease 0.2s forwards; opacity: 0; }
        .hero-animate-3 { animation: heroFadeUp 1s ease 0.4s forwards; opacity: 0; }
        .hero-animate-4 { animation: heroFadeUp 1s ease 0.6s forwards; opacity: 0; }
        .img-grayscale { filter: grayscale(100%) contrast(1.1); }
        .schedule-step {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          padding: 28px 0;
          border-bottom: 1px solid #111;
        }
        .step-num {
          font-size: 48px;
          font-weight: 900;
          color: #1a1a1a;
          line-height: 1;
          min-width: 60px;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px' }}>
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase', fontStyle: 'italic' }}>AEROFLEET</span>
          {/* Desktop links */}
          <div className="landing-nav-links">
            <a href="#home" className="nav-link">Home</a>
            <a href="#expertise" className="nav-link">Services</a>
            <a href="#schedule" className="nav-link">Book</a>
            <a href="#vehicles" className="nav-link">Vehicles</a>
          </div>
          {/* Desktop sign in / portal */}
          {user?.token ? (
            <Link to={portalPath} className="nav-link landing-nav-links" style={{ color: '#60a5fa', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontSize: 12 }}>
              {portalLabel} →
            </Link>
          ) : (
            <Link to="/login" className="nav-link landing-nav-links" style={{ color: '#ccc', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', fontSize: 12 }}>Sign In</Link>
          )}
          {/* Mobile hamburger */}
          <button
            className="landing-hamburger"
            id="landing-ham-btn"
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'none' }}
            onClick={() => {
              const m = document.getElementById('landing-mobile-menu');
              m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
            }}
          >☰</button>
        </div>
        {/* Mobile dropdown menu */}
        <div id="landing-mobile-menu" style={{
          display: 'none', flexDirection: 'column', gap: 0,
          background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #111',
          padding: '8px 0',
        }}>
          {[['#home','Home'],['#expertise','Services'],['#schedule','Book'],['#vehicles','Vehicles']].map(([href,label]) => (
            <a key={href} href={href} className="nav-link"
              onClick={() => { document.getElementById('landing-mobile-menu').style.display='none'; }}
              style={{ display:'block', padding:'14px 24px', color:'#ccc', textDecoration:'none', fontSize:13, borderBottom:'1px solid #0d0d0d' }}>
              {label}
            </a>
          ))}
          {user?.token ? (
            <Link to={portalPath}
              style={{ display:'block', padding:'14px 24px', color:'#60a5fa', fontWeight: 700, textDecoration:'none', fontSize:13 }}>
              {portalLabel} →
            </Link>
          ) : (
            <Link to="/login"
              style={{ display:'block', padding:'14px 24px', color:'#ccc', textDecoration:'none', fontSize:13 }}>
              Sign In →
            </Link>
          )}
        </div>
      </nav>


      {/* ── HERO SECTION ── */}
      <section id="home" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 80px', overflow: 'hidden' }}>
        {/* Car image fills background */}
        <img
          src="/images/hero_car.png"
          alt="Hero Car"
          className="img-grayscale"
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 900, objectFit: 'contain', opacity: 0.85 }}
        />
        {/* Dark gradient overlay at bottom */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, #000 8%, transparent 50%)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-animate" style={{ marginBottom: 8 }}>
            <span className="section-tag">Est. 2010 · Premium Vehicle Care</span>
          </div>
          <h1 className="hero-title hero-animate-2">Performance<br />Impact</h1>
          <div style={{ width: 80, height: 2, background: '#fff', margin: '24px 0', animation: 'heroFadeUp 1s ease 0.5s forwards', opacity: 0 }} />
          <p className="hero-animate-3" style={{ maxWidth: 500, fontSize: 16, color: '#999', lineHeight: 1.7, marginBottom: 32 }}>
            India's most trusted vehicle service platform. Expert care for your everyday car — transparent, hassle-free, and always on time.
          </p>
          <div className="hero-animate-4" style={{ display: 'flex', gap: 16 }}>
            <Link to={user?.token ? portalPath : "/register"} className="cta-btn">
              {user?.token ? `Open ${portalLabel}` : 'Book a Service'}
            </Link>
            <a href="#expertise" className="cta-btn-outline">Explore</a>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ borderTop: '1px solid #111', borderBottom: '1px solid #111', padding: '40px 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {stats.map((s, i) => (
          <div key={i} className="scroll-animate" style={{ textAlign: 'center', borderRight: i < 3 ? '1px solid #111' : 'none', padding: '0 24px' }}>
            <div className="counter-num">{s.value}</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── SECTION 1: SERVICE EXPERTISE ── */}
      <section id="expertise" style={{ padding: '120px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div className="scroll-animate-left">
          <img src="/images/service_expertise.png" alt="Service Expertise" className="img-grayscale" style={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '1/1' }} />
        </div>
        <div>
          <p className="section-tag scroll-animate">01 — Service Expertise</p>
          <h2 className="section-title scroll-animate delay-1">Precision<br />Care.</h2>
          <div className="divider-line scroll-animate delay-2" />
          <p className="scroll-animate delay-2" style={{ fontSize: 16, color: '#777', lineHeight: 1.8, marginBottom: 48 }}>
            Over 15 years of mastering automotive care. Our certified technicians handle everything from routine oil changes to complex engine overhauls — with the precision your car deserves.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {services.map((svc, i) => (
              <div key={i} className={`service-card scroll-animate delay-${(i % 3) + 1}`} style={{ borderRight: i % 2 === 0 ? '1px solid #1a1a1a' : 'none', borderBottom: i < 4 ? '1px solid #1a1a1a' : 'none' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.12em', marginBottom: 14, padding: '4px 8px', border: '1px solid #1e1e1e', display: 'inline-block' }}>{svc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, letterSpacing: '0.02em' }}>{svc.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{svc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: DASHBOARD ── */}
      <section id="dashboard" style={{ padding: '120px 48px', background: '#050505', borderTop: '1px solid #111', borderBottom: '1px solid #111' }}>
        <div style={{ maxWidth: 800, margin: '0 auto 80px', textAlign: 'center' }}>
          <p className="section-tag scroll-animate">02 — Smart Dashboard</p>
          <h2 className="section-title scroll-animate delay-1">Track<br />Everything.</h2>
          <div className="divider-line scroll-animate delay-2" style={{ margin: '24px auto' }} />
          <p className="scroll-animate delay-2" style={{ fontSize: 16, color: '#666', lineHeight: 1.8 }}>
            Your personal command centre. See your vehicle's health, upcoming services, and full history — all in one clean, intuitive dashboard.
          </p>
        </div>

        {/* Dashboard mock UI — Premium */}
        <div className="scroll-animate" style={{ border: '1px solid #1c1c1c', background: '#080808', overflow: 'hidden', maxWidth: 1040, margin: '0 auto', borderRadius: 2 }}>
          {/* Top bar */}
          <div style={{ background: '#060606', borderBottom: '1px solid #111', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#3a1a1a' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#2a2a1a' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#1a2e1a' }} />
              </div>
              <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.18em', textTransform: 'uppercase' }}>aerofleet.app/dashboard</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#5a9a5a' }} />
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em' }}>Rahul Sharma</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#181818', border: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 700 }}>R</span>
              </div>
            </div>
          </div>

          {/* Dashboard body */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 460 }}>
            {/* Sidebar */}
            <div style={{ borderRight: '1px solid #0f0f0f', padding: '32px 0', background: '#060606' }}>
              <div style={{ padding: '0 20px 24px', fontSize: 10, color: '#222', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Menu</div>
              {[['Dashboard', true], ['My Vehicles', false], ['Book Service', false], ['History', false], ['Settings', false]].map(([item, active], i) => (
                <div key={i} style={{
                  padding: '11px 20px',
                  fontSize: 12,
                  color: active ? '#e0e0e0' : '#333',
                  background: active ? '#101010' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? '2px solid #e0e0e0' : '2px solid transparent',
                  letterSpacing: '0.02em',
                  marginBottom: 2,
                }}>{item}</div>
              ))}
              <div style={{ margin: '24px 20px 0', paddingTop: 20, borderTop: '1px solid #0f0f0f' }}>
                <div style={{ fontSize: 10, color: '#1e1e1e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Active Vehicle</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>BMW 5 Series</div>
                <div style={{ fontSize: 11, color: '#2a2a2a', marginTop: 3 }}>2022 · MH 01 AB 1234</div>
              </div>
            </div>

            {/* Main content */}
            <div style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#3a3a3a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 5 }}>Overview · Oct 2026</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8', letterSpacing: '-0.02em' }}>Good Morning, Rahul</div>
                  <div style={{ fontSize: 11, color: '#3a3a3a', marginTop: 3 }}>BMW 5 Series due for service in 1,200 km</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '6px 14px', background: '#0f0f0f', border: '1px solid #1c1c1c', fontSize: 11, color: '#444' }}>This Month</div>
                  <div style={{ padding: '6px 14px', background: '#fff', fontSize: 11, color: '#000', fontWeight: 700 }}>+ Book</div>
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Next Service', value: '1,200 km', sub: 'Engine oil + filter', valueColor: '#e8a04a', dot: '#e8a04a', glow: '#e8a04a22' },
                  { label: 'Last Visit', value: '14 Sep', sub: 'Periodic · 18,500 km', valueColor: '#d0d0d0', dot: '#5a9a5a', glow: '#5a9a5a22' },
                  { label: 'Fleet Status', value: '2 / 3', sub: 'Vehicles healthy', valueColor: '#d0d0d0', dot: '#5a9a5a', glow: '#5a9a5a22' },
                ].map((item, i) => (
                  <div key={i} style={{ border: '1px solid #181818', padding: '16px', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${item.glow}, transparent)` }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.dot }} />
                      <div style={{ fontSize: 9, color: '#383838', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{item.label}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.valueColor, letterSpacing: '-0.03em', marginBottom: 4 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: '#2e2e2e' }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Bottom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Health + mini chart */}
                <div style={{ border: '1px solid #141414', padding: '16px', background: '#0a0a0a' }}>
                  <div style={{ fontSize: 9, color: '#383838', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Component Health</div>
                  {[
                    { label: 'Engine Oil', pct: 78, color: '#6db86d' },
                    { label: 'Tyre Wear', pct: 62, color: '#e8a04a' },
                    { label: 'Brake Pads', pct: 45, color: '#d06060' },
                  ].map((item, i) => (
                    <div key={i} style={{ marginBottom: i < 2 ? 13 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
                        <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: '#111', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 2, boxShadow: `0 0 6px ${item.color}55` }} />
                      </div>
                    </div>
                  ))}
                  {/* Mini bar chart */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #111' }}>
                    <div style={{ fontSize: 9, color: '#2e2e2e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Service History (6 mo)</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 36 }}>
                      {[30, 60, 45, 80, 55, 90].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? '#c8c8c8' : '#1c1c1c', borderRadius: 1, boxShadow: i === 5 ? '0 0 6px #c8c8c844' : 'none' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                      {['M','A','M','J','S','O'].map((m, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: i === 5 ? '#666' : '#242424' }}>{m}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Activity feed */}
                <div style={{ border: '1px solid #141414', padding: '16px', background: '#0a0a0a' }}>
                  <div style={{ fontSize: 9, color: '#383838', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Recent Activity</div>
                  {[
                    { label: 'Engine oil changed', time: '2 days ago', tag: 'DONE', color: '#5a9a5a' },
                    { label: 'AC gas refilled', time: '1 week ago', tag: 'DONE', color: '#5a9a5a' },
                    { label: 'Tyre rotation due', time: 'In 3 days', tag: 'SOON', color: '#e8a04a' },
                    { label: 'Brake pad inspect', time: 'Overdue', tag: 'ALERT', color: '#d06060' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 3 ? '1px solid #0f0f0f' : 'none' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 5px ${item.color}77` }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#777', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: '#2e2e2e', marginTop: 1 }}>{item.time}</div>
                      </div>
                      <div style={{ fontSize: 9, color: item.color, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', background: `${item.color}18`, border: `1px solid ${item.color}30` }}>{item.tag}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: ONLINE SCHEDULING ── */}
      <section id="schedule" style={{ padding: '120px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div>
          <p className="section-tag scroll-animate">03 — Online Scheduling</p>
          <h2 className="section-title scroll-animate delay-1">Book In<br />Seconds.</h2>
          <div className="divider-line scroll-animate delay-2" />
          <p className="scroll-animate delay-2" style={{ fontSize: 16, color: '#666', lineHeight: 1.8, marginBottom: 48 }}>
            No phone calls. No waiting. Schedule your service slot from anywhere, get instant confirmation, and receive real-time updates at every step.
          </p>
          {/* Steps */}
          {[
            { num: '01', title: 'Select Your Vehicle', desc: 'Pick from your registered vehicles or add a new one instantly.' },
            { num: '02', title: 'Choose a Service', desc: 'Browse our full service catalogue — from oil changes to full diagnostics.' },
            { num: '03', title: 'Pick Date & Time', desc: 'View real-time availability and choose a slot that suits you.' },
            { num: '04', title: 'Confirm & Track', desc: 'Get instant booking confirmation and live status updates.' },
          ].map((step, i) => (
            <div key={i} className={`schedule-step scroll-animate delay-${i + 1}`}>
              <div className="step-num">{step.num}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 48 }} className="scroll-animate delay-4">
            <Link to="/register" className="cta-btn">Schedule Now</Link>
          </div>
        </div>
        {/* Right: visual booking widget */}
        <div className="scroll-animate-right">
          <div style={{ border: '1px solid #1a1a1a', background: '#080808', padding: 32 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', marginBottom: 24, textTransform: 'uppercase' }}>Book a Service</div>
            {/* Mock calendar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>October 2026</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: 11, color: '#333', padding: '4px 0' }}>{d}</div>)}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <div key={day} style={{ fontSize: 12, padding: '6px 0', color: day === 15 ? '#000' : day < 8 || day === 22 || day === 28 ? '#222' : '#555', background: day === 15 ? '#fff' : 'transparent', cursor: 'pointer' }}>
                    {day}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Available Slots</div>
            {['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'].map((slot, i) => (
              <div key={i} style={{ padding: '12px 16px', border: '1px solid', borderColor: i === 1 ? '#fff' : '#111', marginBottom: 8, fontSize: 13, color: i === 1 ? '#fff' : '#444', background: i === 1 ? '#111' : 'transparent', cursor: 'pointer' }}>{slot}</div>
            ))}
            <Link to="/register" className="cta-btn" style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: 16, boxSizing: 'border-box' }}>Confirm Booking</Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: MY VEHICLES ── */}
      <section id="vehicles" style={{ padding: '120px 48px', background: '#050505', borderTop: '1px solid #111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64 }}>
          <div>
            <p className="section-tag scroll-animate">04 — My Vehicles</p>
            <h2 className="section-title scroll-animate delay-1">All Your Cars,<br />One Place.</h2>
          </div>
          <div className="scroll-animate delay-2">
            <p style={{ fontSize: 15, color: '#555', maxWidth: 360, textAlign: 'right', lineHeight: 1.7 }}>
              Register all your vehicles and manage their service history, upcoming maintenance, and health reports from a single account.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {vehicleCards.map((car, i) => (
            <div key={i} className={`vehicle-card scroll-animate delay-${i + 1}`} style={{ border: '1px solid #111', padding: 0, overflow: 'hidden' }}>
              {/* Real car photo */}
              <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={car.img}
                  alt={`${car.make} ${car.model}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    filter: 'contrast(1.15) brightness(0.82)',
                    display: 'block',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                <span
                  className={`status-badge status-${car.status === 'Serviced' ? 'serviced' : car.status === 'Due Soon' ? 'due' : 'healthy'}`}
                  style={{ position: 'absolute', top: 14, right: 14 }}
                >
                  {car.status}
                </span>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{car.make}</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 4, letterSpacing: '0.03em' }}>{car.model} · {car.year}</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #111', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#444', fontVariantNumeric: 'tabular-nums' }}>{car.km}</span>
                  <a href="#" style={{ fontSize: 12, color: '#666', textDecoration: 'none', borderBottom: '1px solid #1a1a1a' }}>Details →</a>
                </div>
              </div>
            </div>
          ))}
          {/* Add Vehicle card */}
          <div className="vehicle-card scroll-animate delay-4" style={{ border: '1px dashed #1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, cursor: 'pointer' }}>
            <div style={{ width: 48, height: 48, border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 24, color: '#333' }}>+</div>
            <div style={{ fontSize: 13, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add Vehicle</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CTA ── */}
      <section style={{ padding: '120px 48px', textAlign: 'center', borderTop: '1px solid #111' }}>
        <p className="section-tag scroll-animate">Ready?</p>
        <h2 className="section-title scroll-animate delay-1" style={{ marginBottom: 24 }}>Start Your<br />Journey.</h2>
        <div className="divider-line scroll-animate delay-2" style={{ margin: '0 auto 40px' }} />
        <p className="scroll-animate delay-2" style={{ fontSize: 16, color: '#555', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.8 }}>
          Join thousands of car owners who trust AeroFleet for transparent, professional vehicle care.
        </p>
        <div className="scroll-animate delay-3" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link to="/register" className="cta-btn">Create Account</Link>
          <Link to="/login" className="cta-btn-outline">Sign In</Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #0d0d0d', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#333', letterSpacing: '0.1em' }}>© 2026 AEROFLEET. ALL RIGHTS RESERVED.</span>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Privacy', 'Terms', 'Contact'].map(link => (
            <a key={link} href="#" style={{ fontSize: 12, color: '#333', textDecoration: 'none', letterSpacing: '0.05em' }}>{link}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
