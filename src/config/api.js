/**
 * AeroFleet – Central API Configuration
 * ─────────────────────────────────────
 * In development:  falls back to http://localhost:5001
 * In production:   reads VITE_API_URL and VITE_SOCKET_URL; uses the Render
 *                  backend URL if those build-time variables are missing
 *
 * Set these environment variables in your Render Frontend Static Site:
 *   VITE_API_URL    = https://aerofleet-backend.onrender.com
 *   VITE_SOCKET_URL = https://aerofleet-backend.onrender.com
 */

const DEFAULT_API_BASE = import.meta.env.PROD
  ? 'https://aerofleet-backend.onrender.com'
  : 'http://localhost:5001';

export const API_BASE = (
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE
).replace(/\/+$/, '');

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL || API_BASE).replace(/\/+$/, '');

export default API_BASE;
