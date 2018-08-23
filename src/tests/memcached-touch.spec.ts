import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `touch` related
 * memcached commands
 */
describe('Memcached TOUCH', function() {
    /**
     * Make sure that touching a key with 1 sec lifetime and getting it 1.1 sec after invoke deletion
     */
    it('changes lifetime', function(done) {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok1)

            memcached.touch('test:' + testnr, 1, (err2, ok2) => {
                ++callbacks

                assert.notExists(err2)
                assert.exists(ok2)

                setTimeout(() => {
                    memcached.get('test:' + testnr, (err3, answer) => {
                    ++callbacks

                    assert.notExists(err3)
                    assert.ok(answer === undefined)

                    memcached.end() // close connections
                    assert.equal(callbacks, 3)
                    done()
                })}, 1100) // 1.1 sec after
            })
        })
    })
})
