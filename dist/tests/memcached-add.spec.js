"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached ADD', () => {
    it('fail to add an already existing key', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.add('test:' + testnr, message, 1000, (err2, answer) => {
                ++callbacks;
                chai_1.assert.exists(err2);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
});
//# sourceMappingURL=memcached-add.spec.js.map