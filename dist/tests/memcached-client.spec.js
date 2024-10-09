"use strict";
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
const chai_1 = require("chai");
const main_1 = require("../main");
describe('Memcached', () => {
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.flush();
    }));
    it('should set/get string values', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('test_1', 'test_value_1');
        const actual = yield client.get('test_1');
        chai_1.assert.equal(actual, 'test_value_1');
    }));
    it('should set/get binary values', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        const data = Buffer.from('test_value_2');
        yield client.set('test_2', data);
        const rawResult = yield client.get('test_2');
        const actual = rawResult.toString('utf-8');
        chai_1.assert.equal(actual, 'test_value_2');
    }));
    it('should set/get number values', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('test_1', 1);
        const actual = yield client.get('test_1');
        chai_1.assert.equal(actual, 1);
        chai_1.assert.isNumber(actual);
    }));
    it('should set/get array object', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('test_1', [1, 2, 3]);
        const actual = yield client.get('test_1');
        chai_1.assert.isArray(actual);
        chai_1.assert.equal(actual[0], 1);
        chai_1.assert.equal(actual[1], 2);
        chai_1.assert.equal(actual[2], 3);
    }));
    it('should set/get flat object', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('test_1', { 'a': 1, 'b': 2 });
        const actual = yield client.get('test_1');
        chai_1.assert.isObject(actual);
        chai_1.assert.equal(actual.a, 1);
        chai_1.assert.equal(actual.b, 2);
    }));
    it('should set/get nested object', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        const expected = {
            'a': 1,
            'b': 2,
            'c': {
                'c1': 31,
                'c2': 32,
            },
        };
        yield client.set('test_1', expected);
        const actual = yield client.get('test_1');
        chai_1.assert.isObject(actual);
        chai_1.assert.equal(actual.a, 1);
        chai_1.assert.equal(actual.b, 2);
        chai_1.assert.isObject(actual.c);
        chai_1.assert.equal(actual.c.c1, 31);
        chai_1.assert.equal(actual.c.c2, 32);
    }));
    it('should reject when fetching missing key', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        return client.get('missing_key').then((val) => {
            throw new Error('Should reject for missing key');
        }, (err) => {
            chai_1.assert.equal(err.message, 'Given key[missing_key] does not have a value in Memcached');
        });
    }));
    it('should expire key after ttl', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const options = {
            defaultTTL: 1,
        };
        const client = new main_1.MemcachedClient(servers, options);
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            yield client.set('test_1', 1);
            const valBeforeTTL = yield client.get('test_1');
            chai_1.assert.isNumber(valBeforeTTL);
            chai_1.assert.equal(valBeforeTTL, 1);
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield client.get('test_1').then((val) => {
                    throw new Error('Should reject for missing key');
                }, (err) => {
                    chai_1.assert.equal(err.message, 'Given key[test_1] does not have a value in Memcached');
                });
                return resolve();
            }), 1000);
        }));
    }));
    it('should expire key after custom ttl', () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            const servers = ['localhost:11211'];
            const options = {
                defaultTTL: 2,
            };
            const client = new main_1.MemcachedClient(servers, options);
            yield client.set('test_1', 1, 1);
            const valBeforeTTL = yield client.get('test_1');
            chai_1.assert.isNumber(valBeforeTTL);
            chai_1.assert.equal(valBeforeTTL, 1);
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield client.get('test_1').then((val) => {
                    throw new Error('Should reject for missing key');
                }, (err) => {
                    chai_1.assert.equal(err.message, 'Given key[test_1] does not have a value in Memcached');
                });
                return resolve();
            }), 1000);
        }));
    }));
    it('should remove failed hosts', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:10000', 'localhost:11211'];
        const options = {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove: true,
        };
        const client = new main_1.MemcachedClient(servers, options);
        yield client.get('some_key').catch((err) => {
            chai_1.assert.equal(err.message, 'Operation[get] failed for key[some_key]. connect ECONNREFUSED 127.0.0.1:10000');
        });
        yield client.get('some_key').catch((err) => {
            chai_1.assert.equal(err.message, 'Given key[some_key] does not have a value in Memcached');
        });
    }));
    it('should be able to do a cas operation', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        const key = 'foo1';
        const value = 10;
        const value2 = 20;
        yield client.set(key, value);
        let result = yield client.gets(key);
        const cas = result.cas;
        yield client.cas(key, value2, cas);
        result = yield client.get(key);
        chai_1.assert.isNumber(result);
        chai_1.assert.equal(result, 20);
    }));
    it('should fail cas operation with invalid cas ID passed', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        const key = 'foo1';
        const value = 10;
        const value2 = 20;
        const value3 = 30;
        yield client.set(key, value);
        let result = yield client.gets(key);
        const cas1 = result.cas;
        result = yield client.gets(key);
        const cas2 = result.cas;
        yield client.cas(key, value2, cas1);
        yield client.cas(key, value3, cas2).catch((err) => {
            chai_1.assert.equal(err.message, 'Operation[cas] failed for key[foo1]');
        });
        result = yield client.get(key);
        chai_1.assert.equal(result, 20);
    }));
    it('should be able to get multiple keys', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('foo1', 'bar1');
        yield client.set('foo2', 'bar2');
        yield client.set('foo3', 'bar3');
        let result = yield client.getMulti(['foo1', 'foo2', 'foo3']);
        chai_1.assert.isObject(result);
        chai_1.assert.equal(result.foo1, 'bar1');
        chai_1.assert.equal(result.foo2, 'bar2');
        chai_1.assert.equal(result.foo3, 'bar3');
        result = yield client.getMulti(['foo1', 'foo2', 'foo4']);
        chai_1.assert.isObject(result);
        chai_1.assert.equal(result.foo1, 'bar1');
        chai_1.assert.equal(result.foo2, 'bar2');
        chai_1.assert.notExists(result.foo3);
        chai_1.assert.notExists(result.foo4);
    }));
    it('should be able to delete key', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        yield client.set('foo', 'bar');
        let result = yield client.del('foo');
        chai_1.assert.isBoolean(result);
        chai_1.assert.isTrue(result);
        result = yield client.del('foo2').catch((err) => {
            chai_1.assert.equal(err.message, 'Operation[del] failed for key[foo2]');
            return false;
        });
        chai_1.assert.isFalse(result);
    }));
    it('should be able to store and retrieve class reference', () => __awaiter(void 0, void 0, void 0, function* () {
        const servers = ['localhost:11211'];
        const client = new main_1.MemcachedClient(servers);
        class FooCl {
            static toJSON(obj) {
                return JSON.stringify({
                    name: obj.name,
                });
            }
            static fromJSON(jsonString) {
                try {
                    const json = JSON.parse(jsonString);
                    return new FooCl(json.name);
                }
                catch (err) {
                    return null;
                }
            }
            constructor(name) {
                this.name = 'dummy';
                this.name = name;
            }
            getName() {
                return this.name;
            }
            setName(name) {
                this.name = name;
            }
        }
        const foo = new FooCl('user1');
        const key = 'foo';
        yield client.encodeAndSet(key, foo, FooCl.toJSON);
        let resultFn = yield client.get(key, FooCl.fromJSON);
        chai_1.assert.isDefined(resultFn);
        chai_1.assert.isNotNull(resultFn);
        if (resultFn !== null) {
            chai_1.assert.equal(resultFn.getName(), 'user1');
            resultFn.setName('user2');
            chai_1.assert.equal(resultFn.getName(), 'user2');
        }
        const result = yield client.gets(key, FooCl.fromJSON);
        resultFn = result.value;
        const cas = result.cas;
        if (resultFn !== null) {
            resultFn.setName('user2');
            yield client.encodeAndCas(key, resultFn, cas, FooCl.toJSON);
            resultFn = yield client.get(key, FooCl.fromJSON);
            if (resultFn !== null) {
                chai_1.assert.equal(resultFn.getName(), 'user2');
            }
        }
    }));
});
//# sourceMappingURL=memcached-client.spec.js.map