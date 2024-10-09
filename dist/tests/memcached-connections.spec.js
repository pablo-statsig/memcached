"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached connections', () => {
    it('should call the callback only once if theres an error', (done) => {
        const memcached = new main_1.Memcached('127.0.1:1234', { retries: 3 });
        let calls = 0;
        memcached.get('idontcare', (err) => {
            calls++;
            chai_1.assert.equal(calls, 1);
            memcached.end();
            done();
        });
    }).timeout(60000);
    it('should remove a failed server', (done) => {
        const memcached = new main_1.Memcached('127.0.1:1234', {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove: true,
        });
        memcached.get('idontcare', (err1) => {
            function noserver() {
                memcached.get('idontcare', (err2) => {
                    throw err2;
                });
            }
            chai_1.assert.throws(noserver, new RegExp('Server at 127.0.1.1234 not available'));
            memcached.end();
            done();
        });
    }).timeout(60000);
    it('should rebalance to remaining healthy server', (done) => {
        const memcached = new main_1.Memcached(['fake:1234', common.servers.single], {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove: true,
            redundancy: 1,
        });
        memcached.get('a', (err1) => {
            chai_1.assert.exists(err1);
            memcached.get('a', (err2) => {
                chai_1.assert.notExists(err2);
                memcached.end();
                done();
            });
        });
    }).timeout(60000);
    it('should properly schedule failed server retries', (done) => {
        const server = '127.0.0.1:1234';
        const memcached = new main_1.Memcached(server, {
            retries: 0,
            failures: 5,
            retry: 100,
        });
        memcached.get('idontcare', (err1) => {
            chai_1.assert.throws(() => { throw err1; }, /connect ECONNREFUSED/);
            chai_1.assert.equal(memcached._issues[server].config.failures, 5);
            chai_1.assert.equal(memcached._issues[server].locked, true);
            chai_1.assert.equal(memcached._issues[server].failed, true);
            memcached.get('idontcare', (err2) => {
                chai_1.assert.throws(() => { throw err2; }, /not available/);
                chai_1.assert.equal(memcached._issues[server].config.failures, 5);
                chai_1.assert.equal(memcached._issues[server].locked, true);
                chai_1.assert.equal(memcached._issues[server].failed, true);
                setTimeout(() => {
                    chai_1.assert.equal(memcached._issues[server].locked, false);
                    chai_1.assert.equal(memcached._issues[server].failed, false);
                    memcached.get('idontcare', (err3) => {
                        chai_1.assert.throws(() => { throw err3; }, /connect ECONNREFUSED/);
                        chai_1.assert.equal(memcached._issues[server].config.failures, 4);
                        memcached.end();
                        done();
                    });
                }, 500);
            });
        });
    });
    it('should properly schedule server reconnection attempts', (done) => {
        const server = '127.0.0.1:1234';
        const memcached = new main_1.Memcached(server, {
            retries: 3,
            minTimeout: 0,
            maxTimeout: 100,
            failures: 0,
            reconnect: 100,
        });
        let reconnectAttempts = 0;
        memcached.on('reconnecting', () => {
            reconnectAttempts++;
        });
        memcached.get('idontcare', (err1) => {
            chai_1.assert.throws(() => { throw err1; }, /connect ECONNREFUSED/);
            memcached.get('idontcare', (err2) => {
                chai_1.assert.throws(() => { throw err2; }, /not available/);
                setTimeout(() => {
                    chai_1.assert.deepEqual(reconnectAttempts, 1);
                    memcached.end();
                    done();
                }, 400);
            });
        });
    });
    it('should reset failures after reconnecting to failed server', (done) => {
        const server = '127.0.0.1:1234';
        const memcached = new main_1.Memcached(server, {
            retries: 0,
            minTimeout: 0,
            maxTimeout: 100,
            failures: 1,
            retry: 1,
            reconnect: 100,
        });
        memcached.get('idontcare', (err1) => {
            chai_1.assert.throws(() => { throw err1; }, /connect ECONNREFUSED/);
            setTimeout(() => {
                memcached.get('idontcare', (err2) => {
                    chai_1.assert.throws(() => { throw err2; }, /connect ECONNREFUSED/);
                    memcached.get('idontcare', (err3) => {
                        chai_1.assert.throws(() => { throw err3; }, /not available/);
                        setTimeout(() => {
                            memcached.get('idontcare', (err4) => {
                                chai_1.assert.throws(() => { throw err4; }, /connect ECONNREFUSED/);
                                memcached.end();
                                done();
                            });
                        }, 500);
                    });
                });
            }, 10);
        });
    }).timeout(60000);
    it('should default to port 11211', (done) => {
        const server = '127.0.0.1';
        const memcached = new main_1.Memcached(server);
        memcached.get('idontcare', (err) => {
            chai_1.assert.notExists(err);
            chai_1.assert.equal(Object.keys(memcached._connections)[0], '127.0.0.1:11211');
            memcached.end();
            done();
        });
    });
    it('should not create multiple connections with no port', (done) => {
        const server = '127.0.0.1';
        const memcached = new main_1.Memcached(server);
        let conn;
        memcached.get('idontcare', (err1) => {
            chai_1.assert.notExists(err1);
            conn = memcached._connections['127.0.0.1:11211'];
            memcached.get('idontcare', (err2) => {
                chai_1.assert.notExists(err2);
                chai_1.assert.equal(memcached._connections['127.0.0.1:11211'], conn);
                memcached.end();
                done();
            });
        });
    });
    it('should return error on connection timeout', (done) => {
        const server = '10.255.255.255:1234';
        const memcached = new main_1.Memcached(server, {
            retries: 0,
            timeout: 100,
            idle: 1000,
            failures: 0,
        });
        memcached.get('idontcare', (err) => {
            chai_1.assert.exists(err);
            memcached.end();
            done();
        });
    });
    it('should remove connection when idle', (done) => {
        const memcached = new main_1.Memcached(common.servers.single, {
            retries: 0,
            timeout: 100,
            idle: 100,
            failures: 0,
        });
        memcached.get('idontcare', (err) => {
            chai_1.assert.equal(memcached._connections[common.servers.single].pool.length, 1);
            setTimeout(() => {
                chai_1.assert.equal(memcached._connections[common.servers.single].pool.length, 0);
                memcached.end();
                done();
            }, 110);
        });
    });
    it('should remove server if error occurs after connection established', (done) => {
        const memcached = new main_1.Memcached(common.servers.single, {
            poolSize: 1,
            retries: 0,
            timeout: 1000,
            idle: 5000,
            failures: 0,
        });
        memcached.get('idontcare', (err1) => {
            chai_1.assert.notExists(err1);
            const socket = memcached._connections[common.servers.single].pool.pop();
            socket.emit('error', new Error('Dummy error'));
            memcached.get('idontcare', (err2) => {
                chai_1.assert.throws(() => { throw err2; }, /not available/);
                done();
            });
        });
    });
    it('should reset failures if all failures do not occur within failuresTimeout ms', (done) => {
        const server = '10.255.255.255:1234';
        const memcached = new main_1.Memcached(server, {
            retries: 0,
            timeout: 10,
            idle: 1000,
            retry: 10,
            failures: 2,
            failuresTimeout: 100,
        });
        memcached.get('idontcare', (err) => {
            chai_1.assert.exists(err);
            setTimeout(() => {
                chai_1.assert.deepEqual(memcached._issues[server].config.failures, 1);
                setTimeout(() => {
                    chai_1.assert.deepEqual(JSON.parse(memcached._issues[server].args).failures, memcached._issues[server].config.failures);
                    memcached.end();
                    done();
                }, 150);
            }, 15);
        });
    });
});
//# sourceMappingURL=memcached-connections.spec.js.map