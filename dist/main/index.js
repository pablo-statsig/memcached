"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemcachedClient = exports.Memcached = void 0;
const errors_1 = require("./errors");
const memcached_1 = require("./memcached");
var memcached_2 = require("./memcached");
Object.defineProperty(exports, "Memcached", { enumerable: true, get: function () { return memcached_2.Memcached; } });
__exportStar(require("./types"), exports);
class MemcachedClient {
    constructor(servers, options = {}) {
        this.defaultTTL = 600;
        if (options.defaultTTL !== undefined) {
            this.defaultTTL = options.defaultTTL;
        }
        this.client = new memcached_1.Memcached(servers, options);
    }
    addListener(eventName, handler) {
        this.client.addListener(eventName, handler);
    }
    get(key, decoder) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.get(key, (err, data) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('get', key, err.message));
                    }
                    else if (data === undefined) {
                        reject(new errors_1.MemcachedMissingKey(key));
                    }
                    else if (decoder !== undefined) {
                        resolve(decoder(data));
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    getWithDefault(key, defaultValue, decoder) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get(key, decoder).catch((err) => {
                return defaultValue;
            });
        });
    }
    getMulti(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.getMulti(keys, (err, data) => {
                    if (err !== undefined) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    gets(key, decoder) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.gets(key, (err, data) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('gets', key, err.message));
                    }
                    else if (data === undefined) {
                        reject(new errors_1.MemcachedMissingKey(key));
                    }
                    else if (decoder !== undefined) {
                        const decodedValue = decoder(data.value);
                        resolve({
                            cas: data.cas,
                            value: decodedValue,
                        });
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    set(key_1, value_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, ttl = this.defaultTTL) {
            return new Promise((resolve, reject) => {
                if (ttl === undefined) {
                    ttl = this.defaultTTL;
                }
                this.client.set(key, value, ttl, (err, result) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('set', key, err.message));
                    }
                    else {
                        if (result) {
                            resolve(result);
                        }
                        else {
                            reject(new errors_1.MemcachedOpFailed('set', key));
                        }
                    }
                });
            });
        });
    }
    add(key_1, value_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, ttl = this.defaultTTL) {
            return new Promise((resolve, reject) => {
                if (ttl === undefined) {
                    ttl = this.defaultTTL;
                }
                this.client.add(key, value, ttl, (err, result) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('add', key, err.message));
                    }
                    else {
                        if (result) {
                            resolve(result);
                        }
                        else {
                            reject(new errors_1.MemcachedOpFailed('add', key));
                        }
                    }
                });
            });
        });
    }
    encodeAndSet(key_1, value_1, encoder_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, encoder, ttl = this.defaultTTL) {
            const encodedValue = encoder(value);
            return this.set(key, encodedValue, ttl);
        });
    }
    cas(key_1, value_1, cas_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, cas, ttl = this.defaultTTL) {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                this.client.cas(key, value, cas, ttl, (err, result) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('cas', key, err.message));
                    }
                    else {
                        if (result) {
                            resolve(result);
                        }
                        else {
                            reject(new errors_1.MemcachedOpFailed('cas', key));
                        }
                    }
                });
            }));
        });
    }
    encodeAndCas(key_1, value_1, cas_1, encoder_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, cas, encoder, ttl = this.defaultTTL) {
            const encodedValue = encoder(value);
            return this.cas(key, encodedValue, cas, ttl);
        });
    }
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.del(key, (err, result) => {
                    if (err !== undefined) {
                        reject(new errors_1.MemcachedOpFailed('del', key, err.message));
                    }
                    else {
                        if (result) {
                            resolve(result);
                        }
                        else {
                            reject(new errors_1.MemcachedOpFailed('del', key));
                        }
                    }
                });
            });
        });
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.client.flush((err, result) => {
                    if (err !== undefined) {
                        reject(err);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        });
    }
    end() {
        this.client.end();
        return;
    }
}
exports.MemcachedClient = MemcachedClient;
//# sourceMappingURL=index.js.map