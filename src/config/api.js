/**
 * AeroFleet – Central API Configuration
 * ─────────────────────────────────────
 * In development:  falls back to http://localhost:5001
 * In production:   reads VITE_API_URL and VITE_SOCKET_URL set in Render dashboard
 *
 * Set these environment variables in your Render Frontend Static Site:
 *   VITE_API_URL    = https://aerofleet-backend.onrender.com
 *   VITE_SOCKET_URL = https://aerofleet-backend.onrender.com
 */

export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE;

export default API_BASE;
