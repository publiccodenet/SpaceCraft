// Simple in-memory content/meta cache with de-duplication
// Large/static data should be fetched via HTTP; presence carries only keys/hashes/urls
class ContentStore {
    contentByKey = new Map();
    metaByKey = new Map();
    inFlight = new Map();
    async ensureContent(args) {
        const key = args.contentKey || args.contentIndexUrl || '';
        if (!key)
            return null;
        const hash = args.contentHash || '';
        const url = args.contentIndexUrl || key;
        const existing = this.contentByKey.get(key);
        if (existing && existing.hash === hash && existing.data)
            return existing;
        const flightKey = `content:${key}:${hash}`;
        if (this.inFlight.has(flightKey))
            return this.inFlight.get(flightKey);
        const p = this.fetchJson(url).then((data) => {
            const rec = { hash, indexUrl: url, data, fetchedAt: Date.now() };
            this.contentByKey.set(key, rec);
            this.inFlight.delete(flightKey);
            return rec;
        }).catch((e) => {
            this.inFlight.delete(flightKey);
            throw e;
        });
        this.inFlight.set(flightKey, p);
        return p;
    }
    async ensureUnityMeta(args) {
        const key = args.unityMetaKey || args.unityMetaUrl || '';
        if (!key)
            return null;
        const hash = args.unityMetaHash || '';
        const url = args.unityMetaUrl || '';
        const existing = this.metaByKey.get(key);
        if (existing && existing.hash === hash && existing.data)
            return existing;
        if (!url)
            return null;
        const flightKey = `meta:${key}:${hash}`;
        if (this.inFlight.has(flightKey))
            return this.inFlight.get(flightKey);
        const p = this.fetchJson(url).then((data) => {
            const rec = { hash, url, data, fetchedAt: Date.now() };
            this.metaByKey.set(key, rec);
            this.inFlight.delete(flightKey);
            return rec;
        }).catch((e) => {
            this.inFlight.delete(flightKey);
            throw e;
        });
        this.inFlight.set(flightKey, p);
        return p;
    }
    getContent(contentKey) {
        if (!contentKey)
            return null;
        return this.contentByKey.get(contentKey) || null;
    }
    getMeta(unityMetaKey) {
        if (!unityMetaKey)
            return null;
        return this.metaByKey.get(unityMetaKey) || null;
    }
    prefetch(list) {
        list.forEach((e) => this.ensureContent(e).catch(() => { }));
    }
    evictLRU(maxEntries = 4) {
        if (this.contentByKey.size <= maxEntries)
            return;
        const entries = Array.from(this.contentByKey.entries()).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
        while (entries.length > maxEntries) {
            const [k] = entries.shift();
            this.contentByKey.delete(k);
        }
    }
    async fetchJson(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok)
            throw new Error(`Fetch failed ${res.status} ${url}`);
        return res.json();
    }
}
export const contentStore = new ContentStore();
//# sourceMappingURL=ContentStore.js.map