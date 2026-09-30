import { mergeMetadata } from './normalizeAvatarResult';

/** In-memory only: no collection submission or persistence of third-party facts. */
export class MetadataCache {
    constructor({ ttl = 30 * 60_000, maxSize = 1000, now = Date.now } = {}) {
        this.entries = new Map();
        this.ttl = ttl;
        this.maxSize = maxSize;
        this.now = now;
    }
    get size() {
        return this.entries.size;
    }
    get(id) {
        const entry = this.entries.get(id);
        if (!entry) return null;
        if (entry.expires <= this.now()) {
            this.entries.delete(id);
            return null;
        }
        return entry.value;
    }
    set(id, metadata) {
        const previous = this.get(id);
        const value = mergeMetadata(previous, metadata);
        this.entries.delete(id);
        this.entries.set(id, { value, expires: this.now() + this.ttl });
        while (this.entries.size > this.maxSize)
            this.entries.delete(this.entries.keys().next().value);
        return value;
    }
    clear() {
        this.entries.clear();
    }
}

export const avatarExternalMetadata = new MetadataCache();
