"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs = require("fs");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached GET SET', () => {
    it('should set and get a string value', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set(`test:${testnr}`, message, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get an empty string', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, '', 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, '');
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a JSON.stringify string', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = JSON.stringify({ numbers: common.numbers(256), alphabet: common.alphabet(256), dates: new Date(), arrays: [1, 2, 3, 'foo', 'bar'] });
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a regular string', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'привет мир, Memcached и nodejs для победы';
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('get a non existing key', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.get('test:' + testnr, (err1, answer) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.ok(answer === undefined);
            memcached.end();
            chai_1.assert.equal(callbacks, 1);
            done();
        });
    });
    it('set and get a regular number', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.numbers(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'number');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a object', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = {
            numbers: common.numbers(256),
            alphabet: common.alphabet(256),
            dates: new Date(),
            arrays: [1, 2, 3, 'foo', 'bar'],
        };
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(!Array.isArray(answer) && typeof answer === 'object');
                chai_1.assert.equal(JSON.stringify(message), JSON.stringify(answer));
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a array', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = [{
                numbers: common.numbers(256),
                alphabet: common.alphabet(256),
                dates: new Date(),
                arrays: [1, 2, 3, 'foo', 'bar'],
            }, {
                numbers: common.numbers(256),
                alphabet: common.alphabet(256),
                dates: new Date(),
                arrays: [1, 2, 3, 'foo', 'bar'],
            }];
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(Array.isArray(answer));
                chai_1.assert.equal(JSON.stringify(answer), JSON.stringify(message));
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get <buffers> with a binary image', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = fs.readFileSync(process.cwd() + '/fixtures/hotchicks.jpg');
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(answer.toString('binary'), message.toString('binary'));
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get <buffers> with a binary text file', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt');
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(answer.toString('utf8') === answer.toString('utf8'));
                chai_1.assert.ok(answer.toString('ascii') === answer.toString('ascii'));
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set maximum data and check for correct error handling', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt').toString();
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, new Array(100).join(message), 1000, (err, ok) => {
            if (err && !Array.isArray(err)) {
                ++callbacks;
                chai_1.assert.equal(err.message, 'The length of the value is greater than 1048576');
                chai_1.assert.notOk(ok);
                memcached.end();
                chai_1.assert.equal(callbacks, 1);
                done();
            }
        });
    });
    it('set and get large text files', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt', 'utf8');
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('multi get single server', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const message2 = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test1:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok1);
            memcached.set('test2:' + testnr, message2, 1000, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err1);
                chai_1.assert.exists(ok2);
                memcached.get(['test1:' + testnr, 'test2:' + testnr], (err3, answer) => {
                    ++callbacks;
                    chai_1.assert.notExists(err1);
                    chai_1.assert.ok(typeof answer === 'object');
                    chai_1.assert.equal(answer['test1:' + testnr], message);
                    chai_1.assert.equal(answer['test2:' + testnr], message2);
                    memcached.end();
                    chai_1.assert.equal(callbacks, 3);
                    done();
                });
            });
        });
    });
    it('multi get multi server', (done) => {
        const memcached = new main_1.Memcached(common.servers.multi);
        const message = common.alphabet(256);
        const message2 = common.alphabet(256);
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test1:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok1);
            memcached.set('test2:' + testnr, message2, 1000, (err2, ok2) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.exists(ok2);
                memcached.get(['test1:' + testnr, 'test2:' + testnr], (err3, answer) => {
                    ++callbacks;
                    chai_1.assert.notExists(err3);
                    chai_1.assert.ok(typeof answer === 'object');
                    chai_1.assert.equal(answer['test1:' + testnr], message);
                    chai_1.assert.equal(answer['test2:' + testnr], message2);
                    memcached.end();
                    chai_1.assert.equal(callbacks, 3);
                    done();
                });
            });
        });
    });
    it('set and get a string beginning with OK', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'OK123456';
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a string beginning with VALUE', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'VALUE hello, I\'m not really a value.';
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('set and get a string with line breaks', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = '1\n2\r\n3\n\r4\\n5\\r\\n6\\n\\r7';
        const testnr = ++global.testnumbers;
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('make sure you can get really long strings', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'VALUE hello, I\'m not really a value.';
        const testnr = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + (++global.testnumbers);
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err1);
            chai_1.assert.exists(ok);
            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks;
                chai_1.assert.notExists(err2);
                chai_1.assert.ok(typeof answer === 'string');
                chai_1.assert.equal(answer, message);
                memcached.end();
                chai_1.assert.equal(callbacks, 2);
                done();
            });
        });
    });
    it('errors on spaces in strings', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'VALUE hello, I\'m not really a value.';
        const testnr = ' ' + (++global.testnumbers);
        let callbacks = 0;
        memcached.set('test:' + testnr, message, 1000, (err, ok) => {
            if (err && !Array.isArray(err)) {
                ++callbacks;
                chai_1.assert.exists(err);
                chai_1.assert.equal(err.message, 'The key should not contain any whitespace or new lines');
                done();
            }
        });
    });
    it('make sure you can getMulti really long keys', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = 'My value is not relevant';
        const testnr1 = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + (++global.testnumbers);
        const testnr2 = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + (global.testnumbers) + 'a';
        let callbacks = 0;
        memcached.getMulti([testnr1, testnr2], (err, ok) => {
            ++callbacks;
            chai_1.assert.notExists(err);
            memcached.end();
            chai_1.assert.equal(callbacks, 1);
            done();
        });
    });
});
//# sourceMappingURL=memcached-get-set.spec.js.map