/**
 * A leading slash is essential: "/api/v1" is anchored at the site origin.
 * A relative "api/v1" would be relative to a route such as /orders/.
 * Production must use the same-origin /api/v1 Vercel rewrite.
 */
export function normalizeApiBaseUrl(rawValue, name = 'VITE_API_BASE_URL') {
  const raw = String(rawValue ?? '').trim();
  if (raw === '/api/v1' || raw === '/api/v1/') return '/api/v1';
  if (!raw) throw new Error(`${name} is missing. Use /api/v1.`);

  // Absolute URLs are allowed for explicit development configurations only.
  // vite.config.js rejects them during a production build.
  let parsed;
  try { parsed = new URL(raw); }
  catch { throw new Error(`${name} must be /api/v1 or an absolute http(s) URL ending in /api/v1.`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      parsed.pathname.replace(/\/+$/, '') !== '/api/v1') {
    throw new Error(`${name} must be /api/v1 or an absolute http(s) URL ending in /api/v1.`);
  }
  return `${parsed.origin}/api/v1`;
}
