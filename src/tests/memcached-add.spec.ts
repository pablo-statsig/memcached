import { assert } from 'chai'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || + (Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `add` related
 * memcached commands
 */
describe('Memcached ADD', () => {
    /**
     * Make sure that adding a key which already exists returns an error.
     */
    it('fail to add an already existing key', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1: any, ok: any) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.add('test:' + testnr, message, 1000, (err2: any, answer: any) => {
                ++callbacks

                assert.exists(err2)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })
})
