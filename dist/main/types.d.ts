export type ServerList = Array<string>;
export interface IServerPriorityMap {
    [host: string]: number;
}
export type Server = string;
export type Servers = ServerList | IServerPriorityMap | Server;
export type Key = string | Array<string>;
export type ErrorValue = Error | Array<Error> | undefined | null;
export type CallbackFunction<T = any> = (err: ErrorValue, result: T) => void;
export type ParseResult = [
    number,
    any
];
export interface IMemcachedConfig {
    maxKeySize: number;
    maxExpiration: number;
    maxValue: number;
    activeQueries: number;
    maxQueueSize: number;
    algorithm: string;
    compatibility: string;
    poolSize: number;
    retries: number;
    factor: number;
    minTimeout: number;
    maxTimeout: number;
    randomize: boolean;
    reconnect: number;
    timeout: number;
    failures: number;
    failuresTimeout: number;
    retry: number;
    idle: number;
    remove: boolean;
    redundancy: number;
    keyCompression: boolean;
    namespace: string;
    debug: boolean;
    defaultTTL: number;
    failOverServers: Array<string>;
}
export type MemcachedOptions = Partial<IMemcachedConfig>;
export interface ICasResult {
    cas: string;
    value: any;
}
export type DecoderFunction<T> = (input: string) => T;
export type EncoderFunction<T> = (input: T) => string;
export type eventNames = 'issue' | 'failure' | 'reconnecting' | 'reconnect' | 'remove';
