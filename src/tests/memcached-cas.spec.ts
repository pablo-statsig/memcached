import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `get` related
 * memcached commands
 */
describe('Memcached CAS', () => {
    /**
     * For a proper CAS update in memcached you will need to know the CAS value
     * of a given key, this is done by the `gets` command. So we will need to make
     * sure that a `cas` key is given.
     */
    it('set and gets for cas result', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, function(err1, ok) {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok, true)

            memcached.gets('test:' + testnr, function(err2, answer) {
                ++callbacks

                assert.notExists(err2)

                assert.isObject(answer)
                assert.exists(answer.cas)
                assert.equal(answer['test:' + testnr], message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Create a successful cas update, so we are sure we send a cas request correctly.
     */
    it('successful cas update', (done) => {
        const memcached = new Memcached(common.servers.single)
        let message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks
            assert.notExists(err1)
            assert.equal(ok, true)

            memcached.gets('test:' + testnr, (err2, answer1) => {
                ++callbacks
                assert.notExists(err2)
                assert.exists(answer1.cas)

                // generate new message for the cas update
                message = common.alphabet(256)
                memcached.cas('test:' + testnr, message, answer1.cas, 1000, (err3, answer2) => {
                    ++callbacks
                    assert.notExists(err3)
                    assert.exists(answer2)

                    memcached.get('test:' + testnr, (err4, answer3) => {
                        ++callbacks

                        assert.notExists(err4)
                        assert.equal(answer3, message)

                        memcached.end() // close connections
                        assert.equal(callbacks, 4)
                        done()
                    })
                })
            })
        })
    })

    /**
     * Create a unsuccessful cas update, which would indicate that the server has changed
     * while we where doing nothing.
     */
    it('unsuccessful cas update', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let message = common.alphabet(256)
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks
            assert.notExists(err1)
            assert.equal(ok, true)

            memcached.gets('test:' + testnr, (err2, answer1) => {
                ++callbacks
                assert.notExists(err2)
                assert.exists(answer1.cas)

                // generate new message
                message = common.alphabet(256)
                memcached.set('test:' + testnr, message, 1000, () => {
                    ++callbacks

                    memcached.cas('test:' + testnr, message, answer1.cas, 1000, (err3, answer2) => {
                        ++callbacks
                        assert.notExists(err3)
                        assert.exists(answer2)

                        memcached.get('test:' + testnr, (err4, answer3) => {
                            ++callbacks

                            assert.notExists(err4)
                            assert.equal(answer3, message)

                            memcached.end() // close connections
                            assert.equal(callbacks, 5)
                            done()
                        })
                    })
                })
            })
        })
    })
})
