const TOKEN_KEY = 'nc.jwt_token';
const USER_KEY = 'nc.username';
const MENU_KEY = 'nc.menuoptionslist';
const REMEMBER_KEY = 'nc.remember_username';
export const session = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getUsername: () => localStorage.getItem(USER_KEY) ?? '',
    getMenuOptions: () => localStorage.getItem(MENU_KEY) ?? '',
    save(token, username, menuOptions) {
        if (token)
            localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
        localStorage.setItem(MENU_KEY, menuOptions);
    },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(MENU_KEY);
    },
    getRememberedUsername: () => localStorage.getItem(REMEMBER_KEY) ?? '',
    setRememberedUsername(username) {
        if (username)
            localStorage.setItem(REMEMBER_KEY, username);
        else
            localStorage.removeItem(REMEMBER_KEY);
    },
};
