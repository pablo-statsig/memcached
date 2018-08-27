import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `get` related
 * memcached commands
 */
describe('Memcached INCR DECR', () => {
    /**
     * Simple increments.. Just because.. we can :D
     */
    it('simple incr', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, 1, 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            memcached.incr('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks

                assert.notExists(err2)
                assert.equal(ok2, 2)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Simple decrement.. So we know that works as well. Nothing special here
     * move on.
     */
    it('simple decr', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, 0, 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            memcached.incr('test:' + testnr, 10, (err2, answer1) => {
                ++callbacks

                assert.notExists(err2)
                assert.equal(answer1, 10)

                memcached.decr('test:' + testnr, 1, (err3, answer2) => {
                    ++callbacks

                    assert.notExists(err3)
                    assert.equal(answer2, 9)

                    memcached.end() // close connections
                    assert.equal(callbacks, 3)
                    done()
                })
            })
        })
    })

    /**
     * According to the spec, incr should just work fine on keys that
     * have intergers.. So lets test that.
     */
    it('simple increment on a large number', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.numbers(10)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok, true)

            memcached.incr('test:' + testnr, 1, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)
                assert.ok(+answer === (message + 1))

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * decrementing on a unkonwn key should fail.
     */
    it('decrement on a unknown key', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.decr('test:' + testnr, 1, (err, ok) => {
            ++callbacks

            assert.notExists(err)
            assert.equal(ok, false)

            memcached.end() // close connections
            assert.equal(callbacks, 1)
            done()
        })
    })

    /**
     * We can only increment on a integer, not on a string.
     */
    it('incrementing on a non string value throws a client_error', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, 'zing!', 0, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            memcached.incr('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks

                assert.exists(err2)
                assert.equal(ok2, false)

                memcached.end() // close connections;
                assert.equal(callbacks, 2)
                done()
            })
        })
    })
})
