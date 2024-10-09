"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached TOUCH', () => {
    it('changes lifetime', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok1);
            memcached.touch('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.exists(ok2);
                setTimeout(() => {
                    memcached.get('test:' + testnr, (err3, answer) => {
                        ++callbacks;
                        chai_1.assert.notExists(err3);
                        chai_1.assert.ok(answer === undefined);
                        memcached.end();
                        chai_1.assert.equal(callbacks, 3);
                        done();
                    });
                }, 1100);
            });
        });
    });
});
//# sourceMappingURL=memcached-touch.spec.js.map