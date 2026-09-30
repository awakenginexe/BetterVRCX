export const avtrdb = {
    id: 'avtrdb',
    label: 'AvtrDB',
    url: 'https://api.avtrdb.com/v3/avatar/search/vrcx',
    buildParams(query, { limit }) {
        const key = query.startsWith('usr_') ? 'authorId' : 'search';
        return { [key]: query, n: limit };
    }
};
