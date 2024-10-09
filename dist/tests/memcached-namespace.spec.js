"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached tests with Namespaces', () => {
    it("set with one namespace and verify it can't be read in another", (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            const memcachedOther = new main_1.Memcached(common.servers.single, {
                namespace: 'mySegmentedMemcached:',
            });
            memcachedOther.get('test:' + testnr, (err2, answer1) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(answer1 === undefined);
                memcachedOther.set('test:' + testnr, message, 1000, (err3, ok2) => {
                    ++callbacks;
                    chai_1.assert.notExists(err3);
                    chai_1.assert.equal(ok2, true);
                    memcachedOther.get('test:' + testnr, (err4, answer2) => {
                        ++callbacks;
                        chai_1.assert.notExists(err4);
                        chai_1.assert.ok(typeof answer2 === 'string');
                        chai_1.assert.equal(answer2, message);
                        memcachedOther.end();
                        chai_1.assert.equal(callbacks, 4);
                        done();
                    });
                });
            });
        });
    });
    it('set, set, and multiget with custom namespace', (done) => {
        const memcached = new main_1.Memcached(common.servers.single, {
            namespace: 'mySegmentedMemcached:',
        });
        let callbacks = 0;
        memcached.set('test1', 'test1answer', 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            memcached.set('test2', 'test2answer', 1000, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(ok2, true);
                memcached.get(['test1', 'test2'], (err3, answer) => {
                    ++callbacks;
                    chai_1.assert.ok(typeof answer === 'object');
                    chai_1.assert.equal(answer.test1, 'test1answer');
                    chai_1.assert.equal(answer.test2, 'test2answer');
                    memcached.end();
                    chai_1.assert.equal(callbacks, 3);
                    done();
                });
            });
        });
    });
    it('multi get from multi server with custom namespace (inc. cache miss)', (done) => {
        const memcached = new main_1.Memcached(common.servers.multi, {
            namespace: 'mySegmentedMemcached:',
        });
        let callbacks = 0;
        memcached.set('test1', 'test1answer', 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            memcached.set('test2', 'test2answer', 1000, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(ok2, true);
                memcached.get(['test1', 'test2', 'test3', 'test4', 'test5'], (err3, answer) => {
                    ++callbacks;
                    chai_1.assert.ok(typeof answer === 'object');
                    chai_1.assert.equal(answer.test1, 'test1answer');
                    chai_1.assert.equal(answer.test2, 'test2answer');
                    chai_1.assert.ok(answer.test3 === undefined);
                    chai_1.assert.ok(answer.test4 === undefined);
                    chai_1.assert.ok(answer.test5 === undefined);
                    memcached.end();
                    chai_1.assert.equal(callbacks, 3);
                    done();
                });
            });
        });
    });
    it('should allow namespacing on delete', (done) => {
        const memcached = new main_1.Memcached(common.servers.single, {
            namespace: 'someNamespace:',
        });
        let callbacks = 0;
        memcached.set('test1', 'test1answer', 1000, (err1, ok) => {
            callbacks++;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.get('test1', (err2, answer1) => {
                callbacks++;
                chai_1.assert.ok(typeof answer1 === 'string');
                chai_1.assert.equal(answer1, 'test1answer');
                memcached.del('test1', (err3) => {
                    callbacks++;
                    chai_1.assert.notExists(err3);
                    memcached.get('test1', (err4, answer2) => {
                        callbacks++;
                        chai_1.assert.notExists(err4);
                        chai_1.assert.ok(!answer2);
                        memcached.end();
                        chai_1.assert.equal(callbacks, 4);
                        done();
                    });
                });
            });
        });
    });
    it('should allow increment and decrement on namespaced values', (done) => {
        const memcached = new main_1.Memcached(common.servers.single, {
            namespace: 'someNamespace:',
        });
        let callbacks = 0;
        memcached.set('test1', 1, 1000, (err1, ok) => {
            callbacks++;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.incr('test1', 1, (err2) => {
                callbacks++;
                chai_1.assert.notExists(err2);
                memcached.get('test1', (err3, answer1) => {
                    callbacks++;
                    chai_1.assert.notExists(err3);
                    chai_1.assert.ok(typeof answer1 === 'number');
                    chai_1.assert.equal(answer1, 2);
                    memcached.decr('test1', 1, (err4) => {
                        callbacks++;
                        chai_1.assert.notExists(err4);
                        memcached.get('test1', (err5, answer2) => {
                            callbacks++;
                            chai_1.assert.notExists(err5);
                            chai_1.assert.ok(typeof answer2 === 'number');
                            chai_1.assert.equal(answer2, 1);
                            memcached.del('test1', (err6, answer3) => {
                                callbacks++;
                                chai_1.assert.notExists(err6);
                                memcached.end();
                                chai_1.assert.equal(callbacks, 6);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=memcached-namespace.spec.js.map