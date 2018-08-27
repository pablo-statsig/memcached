import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Test connection issues
 */
describe('Memcached connections', () => {
    it('should call the callback only once if theres an error', (done) => {
        const memcached = new Memcached('127.0.1:1234', { retries: 3 })
        let calls = 0

        memcached.get('idontcare', (err) => {
            calls++

            // it should only be called once
            assert.equal(calls, 1)

            memcached.end()
            done()
        })
    }).timeout(60000)

    it('should remove a failed server', (done) => {
        const memcached = new Memcached('127.0.1:1234', {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove: true,
        })

        memcached.get('idontcare', (err1) => {
            function noserver() {
                memcached.get('idontcare', (err2) => {
                    throw err2
                })
            }

            assert.throws(noserver, new RegExp('Server at 127.0.1.1234 not available'))
            memcached.end()

            done()
        })
    }).timeout(60000)

    it('should rebalance to remaining healthy server', (done) => {
        const memcached = new Memcached(['fake:1234', common.servers.single], {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove: true,
            redundancy: 1,
        })

        // 'a' goes to fake server. first request will cause server to be removed
        memcached.get('a', (err1) => {
            assert.exists(err1)
            // second request should be rebalanced to healthy server
            memcached.get('a', (err2) => {
                assert.notExists(err2)
                memcached.end()
                done()
            })
        })
    }).timeout(60000)

    it('should properly schedule failed server retries', (done) => {
        const server = '127.0.0.1:1234'
        const memcached = new Memcached(server, {
            retries: 0,
            failures: 5,
            retry: 100,
        })

        // First request will schedule a retry attempt, and lock scheduling
        memcached.get('idontcare', (err1) => {
            assert.throws(() => { throw err1 }, /connect ECONNREFUSED/)
            assert.equal((memcached as any)._issues[server].config.failures, 5)
            assert.equal((memcached as any)._issues[server].locked, true)
            assert.equal((memcached as any)._issues[server].failed, true)

            // Immediate request should not decrement failures
            memcached.get('idontcare', (err2) => {
                assert.throws(() => { throw err2 }, /not available/)
                assert.equal((memcached as any)._issues[server].config.failures, 5)
                assert.equal((memcached as any)._issues[server].locked, true)
                assert.equal((memcached as any)._issues[server].failed, true)
                // Once `retry` time has passed, failures should decrement by one
                setTimeout(() => {
                    // Server should be back in action
                    assert.equal((memcached as any)._issues[server].locked, false)
                    assert.equal((memcached as any)._issues[server].failed, false)
                    memcached.get('idontcare', (err3) => {
                        // Server should be marked healthy again, though we'll get this error
                        assert.throws(() => { throw err3 }, /connect ECONNREFUSED/)
                        assert.equal((memcached as any)._issues[server].config.failures, 4)
                        memcached.end()
                        done()
                    })
                }, 500) // `retry` is 100 so wait 100
            })
        })
    })

    it('should properly schedule server reconnection attempts', (done) => {
        const server = '127.0.0.1:1234'
        const memcached = new Memcached(server, {
            retries: 3,
            minTimeout: 0,
            maxTimeout: 100,
            failures: 0,
            reconnect: 100,
        })
        let reconnectAttempts = 0

        memcached.on('reconnecting', () => {
            reconnectAttempts++
        })

        // First request will mark server dead and schedule reconnect
        memcached.get('idontcare', (err1) => {
            assert.throws(() => { throw err1 }, /connect ECONNREFUSED/)
            // Second request should not schedule another reconnect
            memcached.get('idontcare', (err2) => {
                assert.throws(() => { throw err2 }, /not available/)
                // Allow enough time to pass for a connection retries to occur
                setTimeout(() => {
                    assert.deepEqual(reconnectAttempts, 1)
                    memcached.end()
                    done()
                }, 400)
            })
        })
    })

    it('should reset failures after reconnecting to failed server', (done) => {
        const server = '127.0.0.1:1234'
        const memcached = new Memcached(server, {
            retries: 0,
            minTimeout: 0,
            maxTimeout: 100,
            failures: 1,
            retry: 1,
            reconnect: 100,
        })

        // First request will mark server failed
        memcached.get('idontcare', (err1) => {
            assert.throws(() => { throw err1 }, /connect ECONNREFUSED/)

            // Wait 10ms, server should be back online
            setTimeout(() => {
                // Second request will mark server dead
                memcached.get('idontcare', (err2) => {
                    assert.throws(() => { throw err2 }, /connect ECONNREFUSED/)

                    // Third request should find no servers
                    memcached.get('idontcare', (err3) => {
                        assert.throws(() => { throw err3 }, /not available/)

                        // Give enough time for server to reconnect
                        setTimeout(() => {

                            // Server should be reconnected, but expect ECONNREFUSED
                            memcached.get('idontcare', (err4) => {
                                assert.throws(() => { throw err4 }, /connect ECONNREFUSED/)
                                memcached.end()
                                done()
                            })
                        }, 500)
                    })
                })
            }, 10)
        })
    }).timeout(60000)

    it('should default to port 11211', (done) => {
        // Use an IP without port
        const server = '127.0.0.1'
        const memcached = new Memcached(server)

        memcached.get('idontcare', (err) => {
            assert.notExists(err)
            assert.equal(Object.keys((memcached as any)._connections)[0], '127.0.0.1:11211')
            memcached.end()
            done()
        })
    })

    it('should not create multiple connections with no port', (done) => {
        // Use an IP without port
        const server = '127.0.0.1'
        const memcached = new Memcached(server)
        let conn: any

        memcached.get('idontcare', (err1) => {
            assert.notExists(err1)
            conn = (memcached as any)._connections['127.0.0.1:11211']

            memcached.get('idontcare', (err2) => {
                assert.notExists(err2)
                assert.equal((memcached as any)._connections['127.0.0.1:11211'], conn)
                memcached.end()
                done()
            })
        })
    })

    it('should return error on connection timeout', (done) => {
        // Use a non routable IP
        const server = '10.255.255.255:1234'
        const memcached = new Memcached(server, {
            retries: 0,
            timeout: 100,
            idle: 1000,
            failures: 0,
        })

        memcached.get('idontcare', (err) => {
            assert.exists(err)
            memcached.end()
            done()
        })
    })

    it('should remove connection when idle', (done) => {
        const memcached = new Memcached(common.servers.single, {
            retries: 0,
            timeout: 100,
            idle: 100,
            failures: 0,
        })

        memcached.get('idontcare', (err) => {
            assert.equal((memcached as any)._connections[common.servers.single].pool.length, 1)

            setTimeout(() => {
                assert.equal((memcached as any)._connections[common.servers.single].pool.length, 0)
                memcached.end()
                done()
            }, 110)
        })
    })

    it('should remove server if error occurs after connection established', (done) => {
        const memcached = new Memcached(common.servers.single, {
            poolSize: 1,
            retries: 0,
            timeout: 1000,
            idle: 5000,
            failures: 0,
        })

        // Should work fine
        memcached.get('idontcare', (err1) => {
            assert.notExists(err1)
            // Fake an error on the connected socket which should mark server failed
            const socket = (memcached as any)._connections[common.servers.single].pool.pop()
            socket.emit('error', new Error('Dummy error'))

            memcached.get('idontcare', (err2) => {
                assert.throws(() => { throw err2 }, /not available/)
                done()
            })
        })
    })

    it('should reset failures if all failures do not occur within failuresTimeout ms', (done) => {
        const server = '10.255.255.255:1234'
        const memcached = new Memcached(server, {
            retries: 0,
            timeout: 10,
            idle: 1000,
            retry: 10,
            failures: 2,
            failuresTimeout: 100,
        })

        memcached.get('idontcare', (err) => {
            assert.exists(err)

            // Allow `retry` ms to pass, which will decrement failures
            setTimeout(() => {
                assert.deepEqual((memcached as any)._issues[server].config.failures, 1)
                // Allow failuresTimeout ms to pass, which should reset failures
                setTimeout(() => {
                    assert.deepEqual(
                        JSON.parse((memcached as any)._issues[server].args).failures,
                        (memcached as any)._issues[server].config.failures,
                    )
                    memcached.end()
                    done()
                }, 150)
            }, 15)
        })
    })
})
