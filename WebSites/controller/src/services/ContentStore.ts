// Simple in-memory content/meta cache with de-duplication
// Large/static data should be fetched via HTTP; presence carries only keys/hashes/urls

export type ContentKey = string;
export type MetaKey = string;

export type ContentRecord = {
  hash: string;
  indexUrl: string;
  data: any;
  fetchedAt: number;
};

export type MetaRecord = {
  hash: string;
  url: string;
  data: any;
  fetchedAt: number;
};

class ContentStore {
  private contentByKey = new Map<ContentKey, ContentRecord>();
  private metaByKey = new Map<MetaKey, MetaRecord>();
  private inFlight = new Map<string, Promise<any>>();

  async ensureContent(args: { contentKey?: string; contentHash?: string; contentIndexUrl?: string }): Promise<ContentRecord | null> {
    const key = args.contentKey || args.contentIndexUrl || '';
    if (!key) return null;
    const hash = args.contentHash || '';
    const url = args.contentIndexUrl || key;
    const existing = this.contentByKey.get(key);
    if (existing && existing.hash === hash && existing.data) return existing;
    const flightKey = `content:${key}:${hash}`;
    if (this.inFlight.has(flightKey)) return this.inFlight.get(flightKey)!;
    const p = this.fetchJson(url).then((data) => {
      const rec: ContentRecord = { hash, indexUrl: url, data, fetchedAt: Date.now() };
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

  async ensureUnityMeta(args: { unityMetaKey?: string; unityMetaHash?: string; unityMetaUrl?: string }): Promise<MetaRecord | null> {
    const key = args.unityMetaKey || args.unityMetaUrl || '';
    if (!key) return null;
    const hash = args.unityMetaHash || '';
    const url = args.unityMetaUrl || '';
    const existing = this.metaByKey.get(key);
    if (existing && existing.hash === hash && existing.data) return existing;
    if (!url) return null;
    const flightKey = `meta:${key}:${hash}`;
    if (this.inFlight.has(flightKey)) return this.inFlight.get(flightKey)!;
    const p = this.fetchJson(url).then((data) => {
      const rec: MetaRecord = { hash, url, data, fetchedAt: Date.now() };
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

  getContent(contentKey?: string | null): ContentRecord | null {
    if (!contentKey) return null;
    return this.contentByKey.get(contentKey) || null;
  }

  getMeta(unityMetaKey?: string | null): MetaRecord | null {
    if (!unityMetaKey) return null;
    return this.metaByKey.get(unityMetaKey) || null;
  }

  prefetch(list: Array<{ contentKey: string; contentHash: string; contentIndexUrl: string }>) {
    list.forEach((e) => this.ensureContent(e).catch(() => {}));
  }

  evictLRU(maxEntries = 4) {
    if (this.contentByKey.size <= maxEntries) return;
    const entries = Array.from(this.contentByKey.entries()).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    while (entries.length > maxEntries) {
      const [k] = entries.shift()!;
      this.contentByKey.delete(k);
    }
  }

  private async fetchJson(url: string) {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
    return res.json();
  }
}

export const contentStore = new ContentStore();


