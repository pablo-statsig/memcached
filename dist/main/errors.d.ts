export declare class MemcachedMissingKey extends Error {
    constructor(key: string);
}
export declare class MemcachedExpiredValue extends Error {
    constructor(key: string);
}
export declare class MemcachedOpFailed extends Error {
    constructor(operation: string, key: string, error?: string);
}
