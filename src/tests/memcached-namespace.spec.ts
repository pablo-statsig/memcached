import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `get` related
 * memcached commands
 */
describe('Memcached tests with Namespaces', () => {
    /**
     * Make sure that the string that we send to the server is correctly
     * stored and retrieved. We will be storing random strings to ensure
     * that we are not retrieving old data.
     */
    it("set with one namespace and verify it can't be read in another", (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        // Load an non-namespaced entry to memcached
        memcached.set('test:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            const memcachedOther = new Memcached(common.servers.single, {
                namespace: 'mySegmentedMemcached:',
            })

            // Try to load that memcache key with the namespace prepended - this should fail
            memcachedOther.get('test:' + testnr, (err2, answer1) => {
                ++callbacks

                assert.notExists(err2)
                assert.ok(answer1 === undefined)

                // OK, now let's put it in with the namespace prepended
                memcachedOther.set('test:' + testnr, message, 1000, (err3, ok2) => {
                    ++callbacks

                    assert.notExists(err3)
                    assert.equal(ok2, true)

                    // Now when we request it back, it should be there
                    memcachedOther.get('test:' + testnr, (err4, answer2) => {
                        ++callbacks

                        assert.notExists(err4)

                        assert.ok(typeof answer2 === 'string')
                        assert.equal(answer2, message)

                        memcachedOther.end() // close connections
                        assert.equal(callbacks, 4)
                        done()
                    })
                })
            })
        })
    })

    it('set, set, and multiget with custom namespace', (done) => {
        const memcached = new Memcached(common.servers.single, {
            namespace: 'mySegmentedMemcached:',
        })
        let callbacks = 0

        // Load two namespaced variables into memcached
        memcached.set('test1', 'test1answer', 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            memcached.set('test2', 'test2answer', 1000, (err2, ok2) => {
                ++callbacks

                assert.notExists(err2)
                assert.equal(ok2, true)

                memcached.get(['test1', 'test2'], (err3, answer) => {
                    ++callbacks

                    assert.ok(typeof answer === 'object')
                    assert.equal(answer.test1, 'test1answer')
                    assert.equal(answer.test2, 'test2answer')

                    memcached.end() // close connections

                    assert.equal(callbacks, 3)
                    done()
                })
            })
        })
    })

    /**
     * In this case, these keys will be allocated to servers like below.
     * test1,3,4 => :11211
     * test5     => :11212
     * test2     => :11213
     */
    it('multi get from multi server with custom namespace (inc. cache miss)', (done) => {
        const memcached = new Memcached(common.servers.multi, {
            namespace: 'mySegmentedMemcached:',
        })
        let callbacks = 0

        // Load two namespaced variables into memcached
        memcached.set('test1', 'test1answer', 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.equal(ok1, true)

            memcached.set('test2', 'test2answer', 1000, (err2, ok2) => {
                ++callbacks

                assert.notExists(err2)
                assert.equal(ok2, true)

                memcached.get(['test1', 'test2', 'test3', 'test4', 'test5'], (err3, answer) => {
                    ++callbacks
                    assert.ok(typeof answer === 'object')
                    assert.equal(answer.test1, 'test1answer')
                    assert.equal(answer.test2, 'test2answer')
                    assert.ok(answer.test3 === undefined)
                    assert.ok(answer.test4 === undefined)
                    assert.ok(answer.test5 === undefined)

                    memcached.end() // close connections

                    assert.equal(callbacks, 3)
                    done()
                })
            })
        })
    })

    it('should allow namespacing on delete', (done) => {
        const memcached = new Memcached(common.servers.single, {
            namespace: 'someNamespace:',
        })
        let callbacks = 0

        // put a value
        memcached.set('test1', 'test1answer', 1000, (err1, ok) => {
            callbacks++
            assert.notExists(err1)
            assert.equal(ok, true)

            // get it back
            memcached.get('test1', (err2, answer1) => {
                callbacks++
                assert.ok(typeof answer1 === 'string')
                assert.equal(answer1, 'test1answer')

                // delete it
                memcached.del('test1', (err3) => {
                    callbacks++
                    assert.notExists(err3)

                    // no longer there
                    memcached.get('test1', (err4, answer2) => {
                        callbacks++
                        assert.notExists(err4)
                        assert.ok(!answer2)
                        memcached.end()
                        assert.equal(callbacks, 4)
                        done()
                    })
                })
            })
        })
    })

    it('should allow increment and decrement on namespaced values', (done) => {
        const memcached = new Memcached(common.servers.single, {
            namespace: 'someNamespace:',
        })
        let callbacks = 0

        // put a value
        memcached.set('test1', 1, 1000, (err1, ok) => {
            callbacks++
            assert.notExists(err1)
            assert.equal(ok, true)

            // increment it
            memcached.incr('test1', 1, (err2) => {
                callbacks++
                assert.notExists(err2)

                // get it back
                memcached.get('test1', (err3, answer1) => {
                    callbacks++
                    assert.notExists(err3)
                    assert.ok(typeof answer1 === 'number')
                    assert.equal(answer1, 2)

                    // decrement it
                    memcached.decr('test1', 1, (err4) => {
                        callbacks++
                        assert.notExists(err4)

                        // get it again
                        memcached.get('test1', (err5, answer2) => {
                            callbacks++
                            assert.notExists(err5)
                            assert.ok(typeof answer2 === 'number')
                            assert.equal(answer2, 1)

                            // get rid of it
                            memcached.del('test1', (err6, answer3) => {
                                callbacks++
                                assert.notExists(err6)
                                memcached.end()
                                assert.equal(callbacks, 6)
                                done()
                            })
                        })
                    })
                })
            })
        })
    })
})
