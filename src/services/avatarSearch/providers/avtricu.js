import { version } from '../../../../package.json';

export const avtricu = {
    id: 'avtricu',
    label: 'Avtr.icu',
    url: 'https://avtr.icu/search',
    buildHeaders({ contactEmail }) {
        const contact =
            typeof contactEmail === 'string' &&
            /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())
                ? contactEmail.trim()
                : 'https://github.com/awakenginexe/BetterVRCX/issues';
        // ICU currently rejects contact URLs. Never substitute another project's email.
        return { 'User-Agent': `BetterVRCX/${version} ${contact}` };
    },
    buildParams(query, { limit, offset }) {
        return { search: query, limit, offset };
    }
};
