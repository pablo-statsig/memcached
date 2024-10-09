"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached CAS', () => {
    it('set and gets for cas result', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, function (err1, ok) {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.gets('test:' + testnr, function (err2, answer) {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.isObject(answer);
                chai_1.assert.exists(answer.cas);
                chai_1.assert.equal(answer['test:' + testnr], message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('successful cas update', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        let message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.gets('test:' + testnr, (err2, answer1) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.exists(answer1.cas);
                message = common.alphabet(256);
                memcached.cas('test:' + testnr, message, answer1.cas, 1000, (err3, answer2) => {
                    ++callbacks;
                    chai_1.assert.notExists(err3);
                    chai_1.assert.exists(answer2);
                    memcached.get('test:' + testnr, (err4, answer3) => {
                        ++callbacks;
                        chai_1.assert.notExists(err4);
                        chai_1.assert.equal(answer3, message);
                        memcached.end();
                        chai_1.assert.equal(callbacks, 4);
                        done();
                    });
                });
            });
        });
    });
    it('unsuccessful cas update', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let message = common.alphabet(256);
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.equal(ok, true);
            memcached.gets('test:' + testnr, (err2, answer1) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.exists(answer1.cas);
                message = common.alphabet(256);
                memcached.set('test:' + testnr, message, 1000, () => {
                    ++callbacks;
                    memcached.cas('test:' + testnr, message, answer1.cas, 1000, (err3, answer2) => {
                        ++callbacks;
                        chai_1.assert.notExists(err3);
                        chai_1.assert.exists(answer2);
                        memcached.get('test:' + testnr, (err4, answer3) => {
                            ++callbacks;
                            chai_1.assert.notExists(err4);
                            chai_1.assert.equal(answer3, message);
                            memcached.end();
                            chai_1.assert.equal(callbacks, 5);
                            done();
                        });
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=memcached-cas.spec.js.map