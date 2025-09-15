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
declare class ContentStore {
    private contentByKey;
    private metaByKey;
    private inFlight;
    ensureContent(args: {
        contentKey?: string;
        contentHash?: string;
        contentIndexUrl?: string;
    }): Promise<ContentRecord | null>;
    ensureUnityMeta(args: {
        unityMetaKey?: string;
        unityMetaHash?: string;
        unityMetaUrl?: string;
    }): Promise<MetaRecord | null>;
    getContent(contentKey?: string | null): ContentRecord | null;
    getMeta(unityMetaKey?: string | null): MetaRecord | null;
    prefetch(list: Array<{
        contentKey: string;
        contentHash: string;
        contentIndexUrl: string;
    }>): void;
    evictLRU(maxEntries?: number): void;
    private fetchJson;
}
export declare const contentStore: ContentStore;
export {};
//# sourceMappingURL=ContentStore.d.ts.map