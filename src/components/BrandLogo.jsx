/**
 * BrandLogo.jsx
 *
 * Reusable manufacturer logo component.  Renders the correct logo for any
 * brand string, with a professional fallback when no logo is available.
 *
 * Props:
 *   brand     {string}   — raw brand name from DB / CSV / user input
 *   size      {number}   — width/height in px (default 40)
 *   showName  {boolean}  — show brand name as text below logo (default false)
 *   className {string}   — extra class on wrapper
 *   style     {object}   — extra inline style on wrapper
 *   bg        {boolean}  — show a rounded container background (default true)
 */

import React, { useState } from 'react';
import { getLogoPath } from '../utils/brandLogos';

/* SVG fallback icon — a clean car silhouette */
function CarFallback({ size }) {
  const s = Math.round(size * 0.5);
  return (
    <svg
      width={s} height={s}
      viewBox="0 0 24 24" fill="none"
      style={{ opacity: 0.45 }}
    >
      <path
        d="M5 11l2-5h10l2 5"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <rect x="2" y="11" width="20" height="6" rx="2"
        stroke="currentColor" strokeWidth="1.6"
      />
      <circle cx="7" cy="17" r="2"  fill="currentColor" opacity=".7"/>
      <circle cx="17" cy="17" r="2" fill="currentColor" opacity=".7"/>
      <path d="M2 14h20" stroke="currentColor" strokeWidth="1" opacity=".4"/>
    </svg>
  );
}

export default function BrandLogo({
  brand,
  size    = 40,
  showName = false,
  style   = {},
  bg      = true,
}) {
  const logoPath = getLogoPath(brand);
  const [imgError, setImgError] = useState(false);
  const showLogo = logoPath && !imgError;

  const containerStyle = {
    display:        'inline-flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            showName ? 6 : 0,
    ...(bg ? {
      width:           size,
      height:          size,
      borderRadius:    Math.round(size * 0.22),
      background:      '#fff',
      border:          '1px solid rgba(255,255,255,0.08)',
      padding:         Math.round(size * 0.12),
      boxSizing:       'border-box',
      flexShrink:      0,
    } : {
      width:  size,
      height: size,
      flexShrink: 0,
    }),
    overflow: 'hidden',
    ...style,
  };

  return (
    <div style={containerStyle} title={brand || 'Vehicle'}>
      {showLogo ? (
        <img
          src={logoPath}
          alt={brand || 'brand logo'}
          onError={() => setImgError(true)}
          style={{
            width:      '100%',
            height:     '100%',
            objectFit:  'contain',
            display:    'block',
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <CarFallback size={size} />
        </span>
      )}
      {showName && brand && (
        <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.2, maxWidth: size * 2 }}>
          {brand}
        </span>
      )}
    </div>
  );
}
