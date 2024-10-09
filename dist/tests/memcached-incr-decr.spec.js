"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached INCR DECR', () => {
    it('simple incr', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, 1, 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            memcached.incr('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(ok2, 2);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('simple decr', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, 0, 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            memcached.incr('test:' + testnr, 10, (err2, answer1) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(answer1, 10);
                memcached.decr('test:' + testnr, 1, (err3, answer2) => {
                    ++callbacks;
                    chai_1.assert.notExists(err3);
                    chai_1.assert.equal(answer2, 9);
                    memcached.end();
                    chai_1.assert.equal(callbacks, 3);
                    done();
                });
            });
        });
    });
    it('simple increment on a large number', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.numbers(10);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.incr('test:' + testnr, 1, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(+answer === (message + 1));
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('decrement on a unknown key', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.decr('test:' + testnr, 1, (err, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err);
            chai_1.assert.equal(ok, false);
            memcached.end();
            chai_1.assert.equal(callbacks, 1);
            done();
        });
    });
    it('incrementing on a non string value throws a client_error', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, 'zing!', 0, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok1, true);
            memcached.incr('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.exists(err2);
                chai_1.assert.equal(ok2, false);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
});
//# sourceMappingURL=memcached-incr-decr.spec.js.map