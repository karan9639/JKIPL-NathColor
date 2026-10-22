/** Distinguish a rejected login from an expired authenticated session. */
export function isSignInRequest(url) {
  return /\/user\/login(?:[/?#]|$)/.test(String(url ?? ''));
}
export function isAuthRequest(url) {
  return /\/user\/(?:login|logout|me)(?:[/?#]|$)/.test(String(url ?? ''));
}
export function httpFailureMessage({ status, url, serverMessage, code, fallback }) {
  if (code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (status == null) return 'Cannot reach the server. Check the API URL and network connection.';
  if (status === 401 && isSignInRequest(url)) return 'Invalid email or password.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404 && !serverMessage) return `API endpoint not found: ${url || 'unknown'}. Check the configured backend.`;
  return String(serverMessage || fallback || 'Request failed.');
}
