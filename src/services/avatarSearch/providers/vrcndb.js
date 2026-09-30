export const vrcndb = {
    id: 'vrcndb',
    label: 'VRCNDb',
    url: 'https://db.vrcnext.com/api/search.php',
    buildParams(query, { limit, page }) {
        // Public search accepts avatar/author IDs directly; no signing key.
        return { q: query, limit, page };
    }
};
