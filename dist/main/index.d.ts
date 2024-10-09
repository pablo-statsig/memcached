import { DecoderFunction, EncoderFunction, eventNames, ICasResult, IMemcachedConfig, Servers } from './types';
export { Memcached } from './memcached';
export * from './types';
export declare class MemcachedClient {
    private client;
    private defaultTTL;
    constructor(servers: Servers, options?: Partial<IMemcachedConfig>);
    addListener(eventName: eventNames, handler: (...args: Array<any>) => void): void;
    get<T>(key: string, decoder?: DecoderFunction<T>): Promise<T>;
    getWithDefault<T>(key: string, defaultValue: T, decoder?: DecoderFunction<T>): Promise<T>;
    getMulti<T>(keys: Array<string>): Promise<any>;
    gets<T>(key: string, decoder?: DecoderFunction<T>): Promise<ICasResult>;
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    add<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    encodeAndSet<T>(key: string, value: T, encoder: EncoderFunction<T>, ttl?: number): Promise<boolean>;
    cas<T>(key: string, value: T, cas: string, ttl?: number): Promise<any>;
    encodeAndCas<T>(key: string, value: T, cas: string, encoder: EncoderFunction<T>, ttl?: number): Promise<boolean>;
    del<T>(key: string): Promise<boolean>;
    flush<T>(): Promise<boolean>;
    end<T>(): void;
}
