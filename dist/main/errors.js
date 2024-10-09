"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemcachedOpFailed = exports.MemcachedExpiredValue = exports.MemcachedMissingKey = void 0;
class MemcachedMissingKey extends Error {
    constructor(key) {
        super(`Given key[${key}] does not have a value in Memcached`);
    }
}
exports.MemcachedMissingKey = MemcachedMissingKey;
class MemcachedExpiredValue extends Error {
    constructor(key) {
        super(`Value for given key[${key}] is expired`);
    }
}
exports.MemcachedExpiredValue = MemcachedExpiredValue;
class MemcachedOpFailed extends Error {
    constructor(operation, key, error) {
        if (error === undefined) {
            super(`Operation[${operation}] failed for key[${key}]`);
        }
        else {
            super(`Operation[${operation}] failed for key[${key}]. ${error}`);
        }
    }
}
exports.MemcachedOpFailed = MemcachedOpFailed;
//# sourceMappingURL=errors.js.map