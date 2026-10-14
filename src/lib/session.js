const TOKEN_KEY = 'nc.jwt_token';
// The stored identity is the user's login email. The key name is retained so
// sessions created before the email migration keep working.
const USER_KEY = 'nc.username';
const USER_DETAILS_KEY = 'nc.user';
const MENU_KEY = 'nc.menuoptionslist';
const REMEMBER_KEY = 'nc.remember_email';

function readUser() {
    try {
        const value = JSON.parse(localStorage.getItem(USER_DETAILS_KEY) ?? 'null');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

export const session = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getUsername: () => localStorage.getItem(USER_KEY) ?? '',
    getUser: readUser,
    getMenuOptions: () => localStorage.getItem(MENU_KEY) ?? '',
    save(token, username, menuOptions, user = null) {
        // Some backends authenticate with HttpOnly cookies and return no bearer token.
        // Never reuse a bearer token left by a previous account.
        if (token) localStorage.setItem(TOKEN_KEY, String(token));
        else localStorage.removeItem(TOKEN_KEY);

        localStorage.setItem(USER_KEY, String(username ?? ''));
        localStorage.setItem(MENU_KEY, String(menuOptions ?? ''));
        if (user) localStorage.setItem(USER_DETAILS_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_DETAILS_KEY);
    },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(USER_DETAILS_KEY);
        localStorage.removeItem(MENU_KEY);
    },
    getRememberedEmail: () => localStorage.getItem(REMEMBER_KEY) ?? '',
    setRememberedEmail(email) {
        if (email) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
    },
};
