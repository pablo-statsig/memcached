"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    maxKeySize: 250,
    maxExpiration: 2592000,
    maxValue: 1048576,
    activeQueries: 0,
    maxQueueSize: -1,
    algorithm: 'md5',
    compatibility: 'ketama',
    poolSize: 10,
    retries: 5,
    factor: 3,
    minTimeout: 1000,
    maxTimeout: 60000,
    randomize: false,
    reconnect: 18000000,
    timeout: 5000,
    failures: 5,
    failuresTimeout: 300000,
    retry: 30000,
    idle: 5000,
    remove: false,
    redundancy: 0,
    keyCompression: true,
    namespace: '',
    debug: false,
    defaultTTL: 600,
    failOverServers: [],
};
//# sourceMappingURL=defaults.js.map