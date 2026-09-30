import webApiService from '../webapi';
import { BUILTIN_PROVIDERS } from './providers';
import {
    mergeAvatarResults,
    normalizeAvatarResult
} from './normalizeAvatarResult';
import { avatarExternalMetadata, MetadataCache } from './metadataCache';

/** Shared native transport keeps third-party requests out of browser CORS/auth flows. */
async function requestProvider(provider, query, options, execute) {
    const url = new URL(provider.url);
    for (const [key, value] of Object.entries(
        provider.buildParams(query, options)
    ))
        url.searchParams.set(key, String(value));
    const headers = provider.buildHeaders
        ? provider.buildHeaders(options)
        : provider.id === 'avtrdb' || provider.id === 'custom'
          ? { Referer: 'https://vrcx.app', 'VRCX-ID': options.vrcxId || '' }
          : {};
    let timer;
    try {
        // WebApi has no per-request abort API. Limit waiting and ignore late responses.
        const response = await Promise.race([
            execute({ url: url.href, method: 'GET', headers }),
            new Promise((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error('Request timed out')),
                    options.timeoutMs
                );
            })
        ]);
        if (response.status < 200 || response.status >= 300)
            throw new Error(`HTTP ${response.status}`);
        const json = JSON.parse(response.data);
        const rows = Array.isArray(json)
            ? json
            : provider.id === 'vrcndb'
              ? json?.results
              : null;
        if (!Array.isArray(rows)) throw new Error('Unexpected response schema');
        const avatars = rows
            .map((row) => normalizeAvatarResult(row, provider.id))
            .filter(Boolean);
        const pagination =
            provider.id === 'vrcndb'
                ? Object.fromEntries(
                      ['page', 'limit', 'total', 'has_more', 'capped']
                          .filter((key) =>
                              ['number', 'boolean'].includes(typeof json[key])
                          )
                          .map((key) => [key, json[key]])
                  )
                : { limit: options.limit, offset: options.offset };
        return { avatars, pagination };
    } finally {
        clearTimeout(timer);
    }
}

export function createAvatarSearchService({
    execute = (options) => webApiService.execute(options),
    log = (...args) => console.debug(...args),
    metadata = new MetadataCache()
} = {}) {
    const cache = new Map();
    const pending = new Map();
    let generation = 0;

    async function run(query, options, listeners) {
        const state = {
            mode: options.mode,
            activeProvider: null,
            attemptedProviders: [],
            failedProviders: [],
            resultSources: [],
            pagination: {}
        };
        const notify = () =>
            listeners.forEach((listener) =>
                listener({
                    ...state,
                    attemptedProviders: [...state.attemptedProviders],
                    failedProviders: [...state.failedProviders]
                })
            );
        const selected =
            options.mode === 'custom'
                ? [
                      {
                          id: 'custom',
                          label: 'Custom provider',
                          url: options.customUrl,
                          buildParams: (q, o) => ({
                              [q.startsWith('usr_') ? 'authorId' : 'search']: q,
                              n: o.limit
                          })
                      }
                  ]
                : BUILTIN_PROVIDERS.filter((p) =>
                      options.sources.includes(p.id)
                  );
        async function attempt(provider) {
            const started = Date.now();
            state.attemptedProviders.push(provider.id);
            state.activeProvider = options.mode === 'deep' ? null : provider.id;
            notify();
            try {
                const result = await requestProvider(
                    provider,
                    query,
                    options,
                    execute
                );
                state.pagination[provider.id] = result.pagination;
                log(
                    `[AvatarSearch] ${provider.label} ${JSON.stringify(query)}: ${result.avatars.length} results in ${Date.now() - started}ms`
                );
                return result.avatars;
            } catch (error) {
                state.failedProviders.push(provider.id);
                log(
                    `[AvatarSearch] ${provider.label} ${JSON.stringify(query)}: unavailable (${error instanceof Error ? error.message : 'network error'}) in ${Date.now() - started}ms`
                );
                return [];
            }
        }
        let rows = [];
        if (options.mode === 'deep') {
            const results = await Promise.allSettled(selected.map(attempt));
            rows = results.flatMap((result) =>
                result.status === 'fulfilled' ? result.value : []
            );
        } else {
            for (const provider of selected) {
                rows = await attempt(provider);
                if (rows.length) break;
            }
        }
        const avatars = mergeAvatarResults(rows);
        state.resultSources = [
            ...new Set(
                [...avatars.values()].flatMap(
                    (avatar) => avatar.$searchMetadata.sources
                )
            )
        ];
        state.activeProvider = null;
        notify();
        if (options.mode === 'deep')
            log(
                `[AvatarSearch] Deep search ${JSON.stringify(query)}: merged ${avatars.size} unique avatars`
            );
        return { avatars, state };
    }

    /**
     * @param {string} query
     * @param {{mode?: string, sources?: string[], limit?: number, offset?: number, page?: number, timeoutMs?: number, customUrl?: string, vrcxId?: string, contactEmail?: string, onState?: (state: any) => void, isCurrent?: () => boolean}} supplied
     */
    function search(query, supplied = {}) {
        const options = {
            mode: 'fallback',
            sources: BUILTIN_PROVIDERS.map((p) => p.id),
            limit: 100,
            offset: 0,
            page: 1,
            timeoutMs: 8000,
            ...supplied
        };
        query = query.trim();
        const { onState, isCurrent, ...requestOptions } = options;
        const epoch = generation;
        const deliver = (result) => {
            if (epoch === generation && (!isCurrent || isCurrent())) {
                for (const avatar of result.avatars.values())
                    metadata.set(avatar.id, avatar.$searchMetadata);
            }
            return result;
        };
        const key = JSON.stringify([query, requestOptions]);
        const cached = cache.get(key);
        if (cached && cached.expires > Date.now()) {
            onState?.(cached.result.state);
            return Promise.resolve(deliver(cached.result));
        }
        const active = pending.get(key);
        if (active) {
            if (onState) active.listeners.add(onState);
            return active.promise.then(deliver);
        }
        const listeners = new Set(onState ? [onState] : []);
        const promise = run(query, options, listeners)
            .then((result) => {
                if (
                    epoch === generation &&
                    result.state.failedProviders.length === 0
                ) {
                    cache.delete(key);
                    cache.set(key, { result, expires: Date.now() + 60_000 });
                    while (cache.size > 30)
                        cache.delete(cache.keys().next().value);
                }
                return result;
            })
            .finally(() => {
                if (pending.get(key)?.promise === promise) pending.delete(key);
            });
        pending.set(key, { promise, listeners });
        return promise.then(deliver);
    }
    function clear() {
        generation++;
        cache.clear();
        pending.clear();
        metadata.clear();
    }
    return { search, metadata, clear };
}

export const avatarSearchService = createAvatarSearchService({
    metadata: avatarExternalMetadata
});
