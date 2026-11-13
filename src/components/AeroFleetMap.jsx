/**
 * AeroFleetMap.jsx
 *
 * Interactive OpenStreetMap for AeroFleet.
 *
 *   ✅ Real-world OSM tiles
 *   ✅ Zoom / pan / touch / fullscreen
 *   ✅ 5 blue AeroFleet garage markers (Mumbai, Pune, Nashik, Goa, Vadodara)
 *   ✅ Garage info popup on marker click
 *   ✅ fitBounds — all 5 markers visible on load
 *   ✅ Auto-resizes with layout
 *   ✅ Dark / light theme aware
 *   ❌ No vehicle tracking
 *   ❌ No user GPS / location detection
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import GARAGE_LOCATIONS from '../data/garageLocations';

/* ─── Custom blue SVG pin icon ────────────────────────────────── */
function makeGarageIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 28 36">
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000055"/>
      </filter>
      <path
        d="M14 2C8.477 2 4 6.477 4 12c0 7.5 10 22 10 22s10-14.5 10-22C24 6.477 19.523 2 14 2z"
        fill="#3B82F6"
        stroke="#1D4ED8"
        stroke-width="1.2"
        filter="url(#shadow)"
      />
      <circle cx="14" cy="12" r="4.5" fill="#ffffff" opacity="0.95"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:    [22, 28],
    iconAnchor:  [11, 28],
    popupAnchor: [0, -30],
  });
}

const GARAGE_ICON = makeGarageIcon();

/* ─── FitBounds helper — runs once after map mounts ──────────── */
function FitGarages() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      GARAGE_LOCATIONS.map(g => [g.lat, g.lng])
    );
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [map]);
  return null;
}

/* ─── Auto-resize: invalidates map size when container resizes ── */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    if (!window.ResizeObserver) return;
    const container = map.getContainer().parentElement;
    const ro = new ResizeObserver(() => map.invalidateSize());
    if (container) ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/* ─── Garage info popup content ──────────────────────────────── */
function GaragePopup({ garage }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 210, overflow: 'hidden', borderRadius: 10 }}>

      {/* Coloured header band */}
      <div style={{
        background:    'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        padding:       '12px 14px 10px',
        marginBottom:  0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
          AeroFleet Garage
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
          {garage.city}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 14px 12px', background: '#0f172a' }}>

        {/* Address */}
        <div style={{ fontSize: 11, color: '#ffffff', lineHeight: 1.65, marginBottom: 10 }}>
          {garage.address}
        </div>

        {/* Directions button */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(garage.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:        'block',
            padding:        '7px 12px',
            background:     'rgba(59,130,246,0.18)',
            border:         '1px solid rgba(59,130,246,0.4)',
            color:          '#93c5fd',
            borderRadius:   7,
            textAlign:      'center',
            fontSize:       11,
            fontWeight:     600,
            textDecoration: 'none',
            letterSpacing:  '0.03em',
            transition:     'background 0.15s',
          }}
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
export default function AeroFleetMap({ height = 380 }) {
  const numericHeight = typeof height === 'number' ? height : 340;
  const { dark } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef(null);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  /* Escape key exits fullscreen */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  return (
    <div
      ref={wrapperRef}
      style={{
        display:       'flex',
        flexDirection: 'column',
        borderRadius:  isFullscreen ? 0 : 12,
        overflow:      'hidden',
        border:        isFullscreen ? 'none' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
        height:        isFullscreen ? '100vh' : '100%',
        minHeight:     isFullscreen ? undefined : numericHeight + 44,
        flex:          isFullscreen ? undefined : 1,
        ...(isFullscreen ? {
          position:   'fixed',
          inset:      0,
          zIndex:     9999,
          background: dark ? '#0a0a0a' : '#ffffff',
        } : {}),
      }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '0 16px',
        height:         44,
        background:     dark ? '#0f0f0f' : '#f8fafc',
        borderBottom:   `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
        flexShrink:     0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke={dark ? '#6b7280' : '#94a3b8'} strokeWidth="1.4"/>
            <path d="M7 1.5C7 1.5 4 5 4 7.5a3 3 0 006 0C10 5 7 1.5 7 1.5z" stroke={dark ? '#6b7280' : '#94a3b8'} strokeWidth="1.2"/>
            <path d="M1.5 7h11M7 1.5v11" stroke={dark ? '#6b7280' : '#94a3b8'} strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#d1d5db' : '#0f172a' }}>Live Map</span>
          <span style={{
            fontSize:    9,
            color:       dark ? '#4b5563' : '#64748b',
            background:  dark ? '#1a1a1a' : '#e2e8f0',
            border:      `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
            borderRadius: 4,
            padding:     '2px 6px',
            fontWeight:  500,
            letterSpacing: '0.04em',
          }}>
            OpenStreetMap
          </span>
          {/* Garage count badge */}
          <span style={{
            fontSize:    9,
            color:       '#3b82f6',
            background:  'rgba(59,130,246,0.1)',
            border:      '1px solid rgba(59,130,246,0.25)',
            borderRadius: 4,
            padding:     '2px 6px',
            fontWeight:  600,
            letterSpacing: '0.04em',
          }}>
            {GARAGE_LOCATIONS.length} Garages
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            style={{
              background:   dark ? '#1a1a1a' : '#ffffff',
              border:       `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
              borderRadius: 6,
              color:        dark ? '#9ca3af' : '#475569',
              cursor:       'pointer',
              fontSize:     14,
              lineHeight:   1,
              padding:      '5px 8px',
              transition:   'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = dark ? '#222' : '#f1f5f9'; e.currentTarget.style.color = dark ? '#f0f0f0' : '#0f172a'; }}
            onMouseOut={e  => { e.currentTarget.style.background = dark ? '#1a1a1a' : '#ffffff'; e.currentTarget.style.color = dark ? '#9ca3af' : '#475569'; }}
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ position: 'relative', height: isFullscreen ? 'calc(100vh - 44px)' : 'calc(100% - 44px)', minHeight: numericHeight, flex: 1 }}>
        <MapContainer
          center={[19.5, 73.5]}   /* initial center — overridden by FitGarages */
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
          doubleClickZoom={true}
          touchZoom={true}
          dragging={true}
        >
          {/*
           * OpenStreetMap standard tiles.
           * Attribution required by ODbL licence — do not remove.
           * Usage policy: https://operations.osmfoundation.org/policies/tiles/
           */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            maxZoom={19}
            subdomains={['a', 'b', 'c']}
          />

          {/* Zoom control — bottom right */}
          <ZoomControl position="bottomright" />

          {/* Fit all garage markers into view */}
          <FitGarages />

          {/* Auto-resize helper */}
          <MapResizer />

          {/* ── Garage markers ── */}
          {GARAGE_LOCATIONS.map(garage => (
            <Marker
              key={garage.id}
              position={[garage.lat, garage.lng]}
              icon={GARAGE_ICON}
            >
              <Popup
                minWidth={220}
                maxWidth={280}
              >
                <GaragePopup garage={garage} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Attribution overlay */}
        <div style={{
          position:     'absolute',
          bottom:       8,
          left:         8,
          zIndex:       1000,
          fontSize:     9,
          color:        '#6b7280',
          pointerEvents:'none',
          userSelect:   'none',
        }}>
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}
