/** Parse the shape supplied by POST /user/login (Axios response already unwrapped). */
export function isSuccessfulLoginResponse(response) {
    if (response?.success === false) return false;
    if (response?.success === true) return true;
    const status = String(response?.status ?? '').toLowerCase();
    if (['passed', 'success', 'successful'].includes(status)) return true;
    return Boolean(response?.token || response?.accessToken ||
        response?.data?.token || response?.data?.accessToken);
}

export function userFromLoginResponse(response, fallbackEmail) {
    const foundUser = response?.data?.foundUser ?? response?.foundUser ??
        response?.data?.user ?? response?.user ?? {};
    const email = String(foundUser.email ?? fallbackEmail ?? '').trim().toLowerCase();
    return {
        id: String(foundUser._id ?? foundUser.id ?? ''),
        email,
        // Login is email-based, so the identity used for permissions and the
        // "remember me" field is the email the user signed in with.
        username: email || String(foundUser.username ?? '').trim().toLowerCase(),
        fullname: String(foundUser.fullname ?? foundUser.fullName ?? '').trim(),
        role: String(foundUser.role ?? '').trim().toLowerCase(),
    };
}
