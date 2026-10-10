/**
 * Frontend visibility policy. The backend must enforce authorization for all
 * sensitive API operations; client-side roles are not a security boundary.
 *
 * `allowedUsers` contains legacy short login IDs, not full email addresses.
 */
export function canAccess(item, account) {
    if (!item?.allowedUsers) return true;

    // Use the actual role provided by the authenticated backend user, never
    // infer admin privileges from an email, a name, or an arbitrary username.
    if (typeof account === 'object' && account !== null &&
        String(account.role ?? '').trim().toLowerCase() === 'admin') {
        return true;
    }

    const username = String(
        typeof account === 'string' ? account : account?.username ?? account?.email ?? '',
    ).trim().toLowerCase();
    const shortName = username.split('@')[0];
    return item.allowedUsers.some((name) => {
        const allowed = String(name).trim().toLowerCase();
        return allowed === username || allowed === shortName;
    });
}
