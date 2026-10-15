/**
 * Frontend navigation visibility only. The API remains the security boundary.
 * Roles grant ADDITIONAL import access; existing legacy user grants are retained.
 */
export function canAccess(item, account) {
    if (!item) return false;
    const role = String(typeof account === 'object' && account !== null ? account.role ?? '' : '')
        .trim().toLowerCase().replace(/[\s_-]/g, '');
    if (role === 'admin') return true;
    if (!item.allowedUsers && !item.allowedRoles) return true;
    if (Array.isArray(item.allowedRoles) && item.allowedRoles.some(
        (allowed) => String(allowed).trim().toLowerCase().replace(/[\s_-]/g, '') === role
    )) return true;
    const username = String(typeof account === 'string' ? account : account?.username ?? account?.email ?? '')
        .trim().toLowerCase();
    const shortName = username.split('@')[0];
    return Array.isArray(item.allowedUsers) && item.allowedUsers.some((name) => {
        const allowed = String(name).trim().toLowerCase();
        return allowed === username || allowed === shortName;
    });
}
