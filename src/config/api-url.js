/**
 * API traffic must go to the Express service directly, never to a Vite page URL.
 * A relative value such as "api/v1" resolves under /orders/ and returns index.html.
 */
export function normalizeApiBaseUrl(rawValue, name = 'VITE_API_BASE_URL') {
  const raw = String(rawValue ?? '').trim();
  if (!raw) throw new Error(`${name} is missing. Set an absolute backend URL ending in /api/v1.`);
  let parsed;
  try { parsed = new URL(raw); }
  catch { throw new Error(`${name} must be a full http(s) URL ending in /api/v1, not a relative path.`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error(`${name} must use http(s) and cannot contain embedded credentials.`);
  }
  if (parsed.search || parsed.hash || parsed.pathname.replace(/\/+$/, '') !== '/api/v1') {
    throw new Error(`${name} must end in /api/v1 without a query or fragment.`);
  }
  // Use the same service in all application modules. Browser-relative URLs are forbidden.
  return `${parsed.origin}/api/v1`;
}
