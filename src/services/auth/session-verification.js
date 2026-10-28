import { userFromLoginResponse } from './identity.js';

/**
 * POST /user/login reports that credentials are accepted. It does NOT prove
 * that a browser accepted/sent the HTTP-only cookie. GET /user/me does.
 */
export function authenticatedUserFromMe(response, fallbackEmail = '') {
  if (response?.success === false) {
    throw new Error('Session verification failed.');
  }
  const user = userFromLoginResponse(response, fallbackEmail);
  if (!user.id || !user.username || !user.role) {
    throw new Error('The session verification response did not contain a valid user.');
  }
  return user;
}

export function sessionCookieHelp(error) {
  if (error?.status === 401) {
    return 'Login credentials were accepted, but the browser did not return an authenticated session. The API cookie may be blocked. Use the same-site Railway API domain (api.jkipl.com), then sign in again.';
  }
  return null;
}
