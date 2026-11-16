/**
 * AeroFleet – Central API Configuration
 * ─────────────────────────────────────
 * When deployed as a single combined service (Frontend served by Express):
 *   Window origin (relative /) is used automatically!
 * When deployed separately:
 *   VITE_API_URL and VITE_SOCKET_URL can be set if needed.
 */

const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? getOrigin() : 'http://localhost:5001')
).replace(/\/+$/, '');

export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? getOrigin() : API_BASE)
).replace(/\/+$/, '');

export default API_BASE;
