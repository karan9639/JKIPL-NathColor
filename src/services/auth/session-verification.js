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
    return 'Login credentials were accepted, but the browser did not return an authenticated session. The authentication cookie was not returned. Verify Vercel forwards /api/v1/* to Railway and VITE_API_BASE_URL=/api/v1, then sign in again.';
  }
  return null;
}
