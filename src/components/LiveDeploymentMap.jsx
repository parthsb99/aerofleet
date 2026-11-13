/**
 * LiveDeploymentMap.jsx
 *
 * Fully-featured OpenStreetMap map for AeroFleet dashboard.
 * - Real-world OSM tiles (CARTO dark variant)
 * - Leaflet zoom / pan / scroll
 * - Fullscreen toggle (pure CSS, no extra plugin needed)
 * - Location search via Nominatim (free, no API key)
 * - Current-location detection (Geolocation API)
 * - Vehicles from DB shown as coloured markers
 *   Green=active  Blue=idle  Orange=maintenance  Red=alert
 * - Vehicles without coords shown in a "no-location" sidebar list
 * - Drift simulation for demo vehicles that have no real GPS
 * - Rich popup: plate · make/model · status · address · last updated
 * - Filter bar: All / Active / Idle / Maintenance / Alert
 * - Auto-resize via ResizeObserver + leaflet's invalidateSize
 * - Zero external CSS imports beyond leaflet (already in index.css)
 */

import React, {
  useState, useEffect, useRef, useCallback, useContext,
} from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle,
  ZoomControl, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import BrandLogo from './BrandLogo';
import { AuthContext } from '../context/AuthContext';

import { API_BASE as API } from '../config/api.js';

/* ─────────────────────────── Status config ─────────────────────── */
const STATUS_CFG = {
  active:      { color: '#22c55e', label: 'Active',      pulse: false },
  idle:        { color: '#3b82f6', label: 'Idle',        pulse: false },
  maintenance: { color: '#f97316', label: 'Maintenance', pulse: false },
  alert:       { color: '#ef4444', label: 'Alert',       pulse: true  },
};
const DEFAULT_STATUS = 'idle';

/* ─────────────────────────── Marker factory ─────────────────────── */
function makeIcon(status) {
  const cfg   = STATUS_CFG[status] || STATUS_CFG[DEFAULT_STATUS];
  const color = cfg.color;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:20px;height:20px;">
        ${cfg.pulse ? `<div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:${color}30;animation:mapPulse 1.8s ease-out infinite;
        "></div>` : ''}
        <div style="
          width:20px;height:20px;border-radius:50%;
          background:${color};border:3px solid #fff;
          box-shadow:0 2px 10px rgba(0,0,0,0.5);
          position:relative;z-index:1;
        "></div>
      </div>`,
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
    popupAnchor:[0, -12],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#60a5fa;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(96,165,250,0.25);
    "></div>`,
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  });
}

/* ─────────────────────────── Auto-resize hook ───────────────────── */
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer().parentElement;
    if (!el || !window.ResizeObserver) { map.invalidateSize(); return; }
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/* ─────────────────────────── Fly-to helper ─────────────────────── */
function FlyToControl({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { animate: true, duration: 1 });
  }, [target, map]);
  return null;
}

/* ─────────────────────────── Mumbai demo seeds ──────────────────── */
const DEMO_SEEDS = [
  { _id: 'demo-1', make: 'Tata',          model: 'Nexon',    licensePlate: 'MH01AB1234', year: 2022, mapStatus: 'active',      location: { lat: 19.0760, lng: 72.8777, address: 'Bandra West, Mumbai', updatedAt: new Date() } },
  { _id: 'demo-2', make: 'Mahindra',      model: 'Scorpio',  licensePlate: 'MH02CD5678', year: 2021, mapStatus: 'alert',       location: { lat: 19.0144, lng: 72.8479, address: 'Dharavi, Mumbai',    updatedAt: new Date() } },
  { _id: 'demo-3', make: 'Hyundai',       model: 'Creta',    licensePlate: 'MH03EF9012', year: 2023, mapStatus: 'idle',        location: { lat: 19.0990, lng: 72.9101, address: 'Powai, Mumbai',      updatedAt: new Date() } },
  { _id: 'demo-4', make: 'Toyota',        model: 'Innova',   licensePlate: 'MH04GH3456', year: 2020, mapStatus: 'maintenance', location: { lat: 18.9980, lng: 72.8600, address: 'Nariman Point, Mumbai', updatedAt: new Date() } },
  { _id: 'demo-5', make: 'Maruti Suzuki', model: 'Swift',    licensePlate: 'MH05IJ7890', year: 2022, mapStatus: 'idle',        location: { lat: 19.0570, lng: 72.8350, address: 'Worli, Mumbai',      updatedAt: new Date() } },
  { _id: 'demo-6', make: 'Kia',           model: 'Seltos',   licensePlate: 'MH06KL2345', year: 2023, mapStatus: 'active',      location: { lat: 19.1330, lng: 72.9200, address: 'Thane, Mumbai',      updatedAt: new Date() } },
  { _id: 'demo-7', make: 'BMW',           model: '3 Series', licensePlate: 'MH07MN6789', year: 2023, mapStatus: 'active',      location: { lat: 19.0210, lng: 72.9010, address: 'Chembur, Mumbai',    updatedAt: new Date() } },
];

/* ─────────────────────────── Main component ────────────────────── */
export default function LiveDeploymentMap({ height = 380 }) {
  const { user } = useContext(AuthContext);
  const headers  = { Authorization: `Bearer ${user?.token}` };

  const [vehicles,     setVehicles]     = useState([]);
  const [mapFilter,    setMapFilter]    = useState('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchResult, setSearchResult] = useState(null);  // { lat, lng, label }
  const [searching,    setSearching]    = useState(false);
  const [searchError,  setSearchError]  = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locating,     setLocating]     = useState(false);
  const [flyTarget,    setFlyTarget]    = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [driftMap,     setDriftMap]     = useState({});   // id → {lat,lng} overrides
  const mapWrapRef = useRef(null);

  /* ── fetch real vehicles, seed with demo if none have location ── */
  useEffect(() => {
    if (!user?.token) { setVehicles(DEMO_SEEDS); return; }
    fetch(`${API}/api/vehicles`, { headers })
      .then(r => r.json())
      .then(data => {
        const real = Array.isArray(data) ? data : [];
        const withLoc = real.filter(v => v.location?.lat && v.location?.lng);
        // show real vehicles + fill in DEMO seeds to make map useful
        setVehicles(withLoc.length > 0 ? real : [...real, ...DEMO_SEEDS]);
      })
      .catch(() => setVehicles(DEMO_SEEDS));
  }, [user]);

  /* ── gentle drift for demo vehicles every 6 s ── */
  useEffect(() => {
    const timer = setInterval(() => {
      setDriftMap(prev => {
        const next = { ...prev };
        vehicles.forEach(v => {
          if (!v._id.startsWith('demo-')) return;
          const base = prev[v._id] || { lat: v.location.lat, lng: v.location.lng };
          next[v._id] = {
            lat: base.lat + (Math.random() - 0.5) * 0.0015,
            lng: base.lng + (Math.random() - 0.5) * 0.0015,
          };
        });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [vehicles]);

  /* ── build displayed list ── */
  const withCoords = vehicles.filter(v => {
    const lat = driftMap[v._id]?.lat ?? v.location?.lat;
    const lng = driftMap[v._id]?.lng ?? v.location?.lng;
    return lat && lng;
  });
  const withoutCoords = vehicles.filter(v => {
    const lat = driftMap[v._id]?.lat ?? v.location?.lat;
    const lng = driftMap[v._id]?.lng ?? v.location?.lng;
    return !lat || !lng;
  });
  const displayed = mapFilter === 'all'
    ? withCoords
    : withCoords.filter(v => (v.mapStatus || DEFAULT_STATUS) === mapFilter);

  /* ── Nominatim geocoding search ── */
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=in`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data.length === 0) { setSearchError('Location not found. Try a city or landmark.'); setSearching(false); return; }
      const { lat, lon, display_name } = data[0];
      const result = { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name };
      setSearchResult(result);
      setFlyTarget(result);
    } catch {
      setSearchError('Search failed. Check your connection.');
    }
    setSearching(false);
  }, [searchQuery]);

  /* ── current location ── */
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget(loc);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  /* ── fullscreen toggle ── */
  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

  /* ── map center ── */
  const mapCenter = displayed.length > 0
    ? [displayed[0].location?.lat || 19.076, displayed[0].location?.lng || 72.877]
    : [19.076, 72.877];

  const counts = Object.keys(STATUS_CFG).reduce((acc, s) => {
    acc[s] = withCoords.filter(v => (v.mapStatus || DEFAULT_STATUS) === s).length;
    return acc;
  }, {});

  /* ─────────── render ─────────── */
  return (
    <div
      ref={mapWrapRef}
      style={{
        display: 'flex', flexDirection: 'column',
        ...(isFullscreen ? {
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0a0a0a', borderRadius: 0,
        } : {
          height: 'auto', borderRadius: 12,
          overflow: 'hidden', border: '1px solid #1c1c1c',
        }),
      }}
    >
      {/* ── Map toolbar ── */}
      <div style={{ background: '#0f0f0f', borderBottom: '1px solid #1c1c1c', padding: '0 16px', flexShrink: 0 }}>

        {/* Row 1: title + controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'mapPulse 2s infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Live Deployment</span>
            <span style={{ fontSize: 10, color: '#4b5563', background: '#1a1a1a', border: '1px solid #2a2b30', borderRadius: 4, padding: '2px 6px' }}>
              OpenStreetMap
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Locate me */}
            <button onClick={handleLocate} disabled={locating} title="Go to my location"
              style={toolBtnStyle(locating)}>
              {locating ? '…' : '◎'}
            </button>
            {/* Fullscreen */}
            <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={toolBtnStyle()}>
              {isFullscreen ? '⤡' : '⤢'}
            </button>
            {/* OSM link */}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none', fontWeight: 500, marginLeft: 4 }}>
              View Full Map →
            </a>
          </div>
        </div>

        {/* Row 2: search + filter pills */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 10 }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 4, flex: 1, maxWidth: 320 }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchError(''); }}
              placeholder="Search city, landmark…"
              style={{
                flex: 1, background: '#141414', border: '1px solid #2a2b30', borderRadius: 6,
                color: '#f0f0f0', fontSize: 11, padding: '5px 10px', outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button type="submit" disabled={searching}
              style={{ ...toolBtnStyle(searching), padding: '5px 10px', fontSize: 11 }}>
              {searching ? '…' : '🔍'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#2a2b30' }} />

          {/* Filter pills */}
          {[{ key: 'all', label: 'All', count: withCoords.length },
            ...Object.entries(STATUS_CFG).map(([k, v]) => ({ key: k, label: v.label, count: counts[k] }))
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setMapFilter(key)}
              style={{
                padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: mapFilter === key ? STATUS_CFG[key]?.color || '#2563eb' : '#1a1a1a',
                color: mapFilter === key ? '#fff' : '#6b7280',
                fontSize: 10, fontWeight: 600, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              {label}
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '0 4px', fontSize: 9 }}>{count}</span>
            </button>
          ))}
        </div>

        {searchError && (
          <div style={{ fontSize: 10, color: '#ef4444', paddingBottom: 6 }}>{searchError}</div>
        )}
      </div>

      {/* ── Map container ── */}
      <div style={{ flex: 1, position: 'relative', height: isFullscreen ? 'calc(100vh - 110px)' : height }}>
        <MapContainer
          center={mapCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          {/* ── Dark OSM tiles (CARTO) ── */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />

          {/* ── Zoom control bottom-right ── */}
          <ZoomControl position="bottomright" />

          {/* ── Auto-resize + fly helpers ── */}
          <MapAutoResize />
          {flyTarget && <FlyToControl target={flyTarget} />}

          {/* ── User location ── */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()}>
              <Popup>
                <div style={popupStyle}>
                  <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>📍 Your Location</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                    {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ── Search result pin ── */}
          {searchResult && (
            <Marker position={[searchResult.lat, searchResult.lng]}>
              <Popup>
                <div style={popupStyle}>
                  <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 12 }}>🔍 Search Result</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, lineHeight: 1.4 }}>
                    {searchResult.label.split(',').slice(0, 3).join(', ')}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ── Vehicle markers ── */}
          {displayed.map(v => {
            const lat    = driftMap[v._id]?.lat ?? v.location?.lat;
            const lng    = driftMap[v._id]?.lng ?? v.location?.lng;
            const status = v.mapStatus || DEFAULT_STATUS;
            const cfg    = STATUS_CFG[status] || STATUS_CFG[DEFAULT_STATUS];
            const isDemo = String(v._id).startsWith('demo-');
            const updAt  = v.location?.updatedAt ? new Date(v.location.updatedAt) : null;

            return (
              <React.Fragment key={v._id}>
                {/* Alert pulse circle */}
                {status === 'alert' && (
                  <Circle center={[lat, lng]} radius={350}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.07, weight: 1 }}
                  />
                )}
                <Marker position={[lat, lng]} icon={makeIcon(status)}>
                  <Popup minWidth={220}>
                    <div style={popupStyle}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <BrandLogo brand={v.make} size={36} bg={true} style={{ borderRadius: 7, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#f0f0f0' }}>
                            {v.make} {v.model}
                          </div>
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                            {v.licensePlate} · {v.year}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, borderRadius: 20, padding: '3px 10px', marginBottom: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                      </div>

                      {/* Location info */}
                      {v.location?.address && (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, lineHeight: 1.4 }}>
                          📍 {v.location.address}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#4b5563' }}>
                        {updAt ? `Updated ${timeAgo(updAt)}` : 'No location update'}
                      </div>
                      {isDemo && (
                        <div style={{ fontSize: 9, color: '#374151', marginTop: 6, fontStyle: 'italic' }}>
                          Demo vehicle · Live GPS not enabled
                        </div>
                      )}
                      {!isDemo && !v.liveTracking && (
                        <div style={{ fontSize: 9, color: '#374151', marginTop: 6, fontStyle: 'italic' }}>
                          Last known location · Live GPS not enabled
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* ── Legend overlay ── */}
        <div style={{
          position: 'absolute', bottom: 44, left: 12, zIndex: 1000,
          background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid #2a2b30', borderRadius: 8, padding: '7px 12px',
          display: 'flex', gap: 10, flexWrap: 'wrap',
        }}>
          {Object.entries(STATUS_CFG).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* ── Vehicle count badge ── */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid #2a2b30', borderRadius: 6, padding: '4px 10px',
          fontSize: 10, color: '#9ca3af',
        }}>
          {displayed.length} unit{displayed.length !== 1 ? 's' : ''} visible
          {withoutCoords.length > 0 && ` · ${withoutCoords.length} off-map`}
        </div>

        {/* ── Attribution badge ── */}
        <div style={{
          position: 'absolute', bottom: 8, left: 12, zIndex: 1000,
          fontSize: 9, color: '#374151',
        }}>
          © OpenStreetMap contributors · © CARTO
        </div>
      </div>

      {/* ── Off-map vehicles (no coords) ── */}
      {withoutCoords.length > 0 && !isFullscreen && (
        <div style={{ borderTop: '1px solid #1c1c1c', background: '#0a0a0a', padding: '8px 16px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 6, fontWeight: 600, letterSpacing: '0.08em' }}>
            VEHICLES WITHOUT LOCATION ({withoutCoords.length})
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {withoutCoords.map(v => (
              <div key={v._id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#111', border: '1px solid #1c1c1c',
                borderRadius: 6, padding: '4px 10px', fontSize: 11,
              }}>
                <BrandLogo brand={v.make} size={18} bg={true} style={{ borderRadius: 3 }} />
                <span style={{ color: '#9ca3af' }}>{v.make} {v.model}</span>
                <span style={{ color: '#374151', fontSize: 10 }}>{v.licensePlate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── small helpers ─── */
const popupStyle = {
  background: '#111', color: '#f0f0f0',
  padding: '12px 14px', minWidth: 200,
  fontFamily: 'Inter, sans-serif',
};

function toolBtnStyle(disabled) {
  return {
    padding: '5px 8px', background: '#1a1a1a', border: '1px solid #2a2b30',
    borderRadius: 6, color: disabled ? '#4b5563' : '#9ca3af',
    fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', lineHeight: 1,
  };
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
