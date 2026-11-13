/**
 * VehicleSelect.jsx
 * Reusable cascading dropdown: Brand → Model → Variant
 * Pulls data from /api/catalogue/* — no hardcoded lists.
 * Displays manufacturer logo automatically when brand is selected.
 *
 * Props:
 *   value:    { make, model, variant }
 *   onChange: fn({ make, model, variant })
 *   disabled: bool
 *   required: bool   (adds * to labels)
 *   compact:  bool   (renders all 3 in a single row)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import BrandLogo from './BrandLogo';

import { API_BASE as API } from '../config/api.js';

/* ── tiny searchable dropdown ─────────────────────────────────────── */
function SearchSelect({ id, label, placeholder, options, value, onChange, disabled, required, renderOption }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref               = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (opt) => { onChange(opt); setQuery(''); setOpen(false); };
  const handleClear  = (e)   => { e.stopPropagation(); onChange(''); setQuery(''); };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {/* Trigger */}
      <div
        id={id}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        style={{
          ...inputStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none',
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); setOpen(v => !v); } }}
      >
        <span style={{ color: value ? '#f0f0f0' : '#6b7280', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {value && !disabled && (
            <span onClick={handleClear} style={{ color: '#6b7280', fontSize: 14, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }} title="Clear">×</span>
          )}
          <ChevronIcon open={open} />
        </div>
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div style={dropdownStyle}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #1c1c1c' }}>
            <input
              autoFocus value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${label || ''}...`}
              style={{
                width: '100%', background: '#1c1c1c', border: '1px solid #2a2b30',
                borderRadius: 6, padding: '7px 10px', color: '#f0f0f0',
                fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif',
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0]);
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>No results found</div>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                  color: opt === value ? '#3b82f6' : '#d1d5db',
                  background: opt === value ? 'rgba(59,130,246,0.08)' : 'transparent',
                  borderBottom: '1px solid #111',
                  transition: 'background 0.1s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseOver={e => { if (opt !== value) e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseOut={e  => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {renderOption ? renderOption(opt) : null}
                <span style={{ flex: 1 }}>{opt}</span>
                {opt === value && <span style={{ color: '#3b82f6', fontSize: 11 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────── */
export default function VehicleSelect({ value = {}, onChange, disabled = false, required = false, compact = false }) {
  const [brands,   setBrands]   = useState([]);
  const [models,   setModels]   = useState([]);
  const [variants, setVariants] = useState([]);
  const [loadingM, setLoadingM] = useState(false);
  const [loadingV, setLoadingV] = useState(false);

  const { make = '', model = '', variant = '' } = value;

  /* load brands once */
  useEffect(() => {
    fetch(`${API}/api/catalogue/brands`)
      .then(r => r.json())
      .then(d => setBrands(Array.isArray(d) ? d : []))
      .catch(() => setBrands([]));
  }, []);

  /* load models when brand changes */
  useEffect(() => {
    if (!make) { setModels([]); setVariants([]); return; }
    setLoadingM(true);
    fetch(`${API}/api/catalogue/models?brand=${encodeURIComponent(make)}`)
      .then(r => r.json())
      .then(d => { setModels((Array.isArray(d) ? d : []).map(m => m.model).sort()); setLoadingM(false); })
      .catch(() => { setModels([]); setLoadingM(false); });
  }, [make]);

  /* load variants when model changes */
  useEffect(() => {
    if (!make || !model) { setVariants([]); return; }
    setLoadingV(true);
    fetch(`${API}/api/catalogue/variants?brand=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)
      .then(r => r.json())
      .then(d => { setVariants(Array.isArray(d) ? d : []); setLoadingV(false); })
      .catch(() => { setVariants([]); setLoadingV(false); });
  }, [make, model]);

  const handleBrand   = useCallback((b)  => onChange({ make: b, model: '', variant: '' }),           [onChange]);
  const handleModel   = useCallback((m)  => onChange({ make, model: m, variant: '' }),                [onChange, make]);
  const handleVariant = useCallback((v)  => onChange({ make, model, variant: v }),                    [onChange, make, model]);

  const containerStyle = compact
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }
    : { display: 'flex', flexDirection: 'column', gap: 14 };

  /* brand dropdown renders a tiny logo next to each option */
  const renderBrandOption = (opt) => (
    <BrandLogo brand={opt} size={22} bg={true} style={{ borderRadius: 4, padding: 2 }} />
  );

  return (
    <div>
      {/* Live logo preview */}
      {make && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 10,
          padding: '12px 16px', marginBottom: 14,
          transition: 'all 0.2s',
        }}>
          <BrandLogo brand={make} size={52} bg={true} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.01em' }}>
              {make}
            </div>
            {model && <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>{model}</div>}
            {variant && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{variant}</div>}
          </div>
        </div>
      )}

      <div style={containerStyle}>
        <SearchSelect
          id="vs-brand"
          label="Brand / Manufacturer"
          placeholder="Select brand..."
          options={brands}
          value={make}
          onChange={handleBrand}
          disabled={disabled}
          required={required}
          renderOption={renderBrandOption}
        />
        <SearchSelect
          id="vs-model"
          label={loadingM ? 'Model (loading...)' : 'Model'}
          placeholder={make ? 'Select model...' : 'Select brand first'}
          options={models}
          value={model}
          onChange={handleModel}
          disabled={disabled || !make || loadingM}
          required={required}
        />
        <SearchSelect
          id="vs-variant"
          label={loadingV ? 'Variant (loading...)' : 'Variant'}
          placeholder={model ? 'Select variant...' : 'Select model first'}
          options={variants}
          value={variant}
          onChange={handleVariant}
          disabled={disabled || !model || loadingV}
          required={false}
        />
      </div>
    </div>
  );
}

/* ── styles ───────────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', background: '#141414', border: '1px solid #1c1c1c',
  color: '#f0f0f0', fontSize: 13, padding: '10px 12px', outline: 'none',
  borderRadius: 8, transition: 'border-color 0.15s', fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 500,
  marginBottom: 6, letterSpacing: '0.03em',
};
const dropdownStyle = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
  background: '#0f0f0f', border: '1px solid #2a2b30', borderRadius: 8,
  zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
};
const ChevronIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none', color: '#6b7280' }}>
    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
