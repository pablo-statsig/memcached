import { assert } from 'chai'
import * as fs from 'fs'
import { Memcached } from '../main'
import * as common from './common'

(global as any).testnumbers = (global as any).testnumbers || +(Math.random() * 1000000).toFixed()

/**
 * Expresso test suite for all `get` related
 * memcached commands
 */
describe('Memcached GET SET', () => {
    /**
     * Make sure that the string that we send to the server is correctly
     * stored and retrieved. We will be storing random strings to ensure
     * that we are not retrieving old data.
     */
    it('should set and get a string value', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set(`test:${testnr}`, message, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    it('set and get an empty string', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, '', 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, '')

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()

            })
        })
    })

    /**
     * Set a stringified JSON object, and make sure we only return a string
     * this should not be flagged as JSON object
     */
    it('set and get a JSON.stringify string', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = JSON.stringify({numbers: common.numbers(256), alphabet: common.alphabet(256), dates: new Date(), arrays: [1, 2, 3, 'foo', 'bar']})
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Setting and getting a unicode value should just work, we need to make sure
     * that we send the correct byteLength because utf8 chars can contain more bytes
     * than "str".length would show, causing the memcached server to complain.
     */
    it('set and get a regular string', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'привет мир, Memcached и nodejs для победы'
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
        ++callbacks

        assert.notExists(err1)
        assert.exists(ok)

        memcached.get('test:' + testnr, (err2, answer) => {
            ++callbacks

            assert.notExists(err2)

            assert.ok(typeof answer === 'string')
            assert.equal(answer, message)

            memcached.end() // close connections
            assert.equal(callbacks, 2)
            done()
        })
        })
    })

    /**
     * A common action when working with memcached servers, getting a key
     * that does not exist anymore.
     */
    it('get a non existing key', (done) => {
        const memcached = new Memcached(common.servers.single)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.get('test:' + testnr, (err1, answer) => {
            ++callbacks

            assert.notExists(err1)
            assert.ok(answer === undefined)

            memcached.end() // close connections
            assert.equal(callbacks, 1)
            done()
        })
    })

    /**
     * Make sure that Numbers are correctly send and stored on the server
     * retrieval of the number based values can be tricky as the client might
     * think that it was a INCR and not a SET operation.. So just to make sure..
     */
    it('set and get a regular number', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.numbers(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'number')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Objects should be converted to a JSON string, send to the server
     * and be automagically JSON.parsed when they are retrieved.
     */
    it('set and get a object', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = {
            numbers: common.numbers(256)
            , alphabet: common.alphabet(256)
            , dates: new Date()
            , arrays: [1, 2, 3, 'foo', 'bar'],
        }
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(!Array.isArray(answer) && typeof answer === 'object')
                assert.equal(JSON.stringify(message), JSON.stringify(answer))
                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Arrays should be converted to a JSON string, send to the server
     * and be automagically JSON.parsed when they are retrieved.
     */
    it('set and get a array', (done) => {
        const memcached = new Memcached(common.servers.single)
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
            }]
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(Array.isArray(answer))
                assert.equal(JSON.stringify(answer), JSON.stringify(message))
                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Buffers are commonly used for binary transports So we need to make sure
     * we support them properly. But please note, that we need to compare the
     * strings on a "binary" level, because that is the encoding the Memcached
     * client will be using, as there is no indication of what encoding the
     * buffer is in.
     */
    it('set and get <buffers> with a binary image', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = fs.readFileSync(process.cwd() + '/fixtures/hotchicks.jpg')
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)
                assert.equal(answer.toString('binary'), message.toString('binary'))
                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Get binary of the lipsum.txt, send it over the connection and see
     * if after we retrieved it, it's still the same when we compare the
     * original with the memcached based version.
     *
     * A use case for this would be storing <buffers> with HTML data in
     * memcached as a single cache pool..
     */
    it('set and get <buffers> with a binary text file', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt')
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)
                assert.ok(answer.toString('utf8') === answer.toString('utf8'))
                assert.ok(answer.toString('ascii') === answer.toString('ascii'))
                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Set maximum amount of data (1MB), should trigger error, not crash.
     */
    it('set maximum data and check for correct error handling', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt').toString()
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, new Array(100).join(message), 1000, (err, ok) => {
            if (err && !Array.isArray(err)) {
                ++callbacks

                assert.equal(err.message, 'The length of the value is greater than 1048576')
                assert.notOk(ok)

                memcached.end() // close connections
                assert.equal(callbacks, 1)
                done()
            }
        })
    })

    /**
     * Not only small strings, but also large strings should be processed
     * without any issues.
     */
    it('set and get large text files', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = fs.readFileSync(process.cwd() + '/fixtures/lipsum.txt', 'utf8')
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)
                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * A multi get on a single server is different than a multi server multi get
     * as a multi server multi get will need to do a multi get over multiple servers
     * yes, that's allot of multi's in one single sentence thanks for noticing
     */
    it('multi get single server', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = common.alphabet(256)
        const message2 = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test1:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok1)

            memcached.set('test2:' + testnr, message2, 1000, (err2, ok2) => {
                ++callbacks

                assert.notExists(err1)
                assert.exists(ok2)

                memcached.get(['test1:' + testnr, 'test2:' + testnr], (err3, answer) => {
                    ++callbacks

                    assert.notExists(err1)

                    assert.ok(typeof answer === 'object')
                    assert.equal(answer['test1:' + testnr], message)
                    assert.equal(answer['test2:' + testnr], message2)

                    memcached.end() // close connections
                    assert.equal(callbacks, 3)
                    done()
                })
            })
        })
    })

    /**
     * A multi get on a single server is different than a multi server multi get
     * as a multi server multi get will need to do a multi get over multiple servers
     * yes, that's allot of multi's in one single sentence thanks for noticing
     */
    it('multi get multi server', (done) => {
        const memcached = new Memcached(common.servers.multi)
        const message = common.alphabet(256)
        const message2 = common.alphabet(256)
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test1:' + testnr, message, 1000, (err1, ok1) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok1)

            memcached.set('test2:' + testnr, message2, 1000, (err2, ok2) => {
                ++callbacks

                assert.notExists(err2)
                assert.exists(ok2)

                memcached.get(['test1:' + testnr, 'test2:' + testnr], (err3, answer) => {
                    ++callbacks

                    assert.notExists(err3)

                    assert.ok(typeof answer === 'object')
                    assert.equal(answer['test1:' + testnr], message)
                    assert.equal(answer['test2:' + testnr], message2)

                    memcached.end() // close connections
                    assert.equal(callbacks, 3)
                    done()
                })
            })
        })
    })

    /**
     * Make sure that a string beginning with OK is not interpreted as
     * a command response.
     */
    it('set and get a string beginning with OK', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'OK123456'
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Make sure that a string beginning with OK is not interpreted as
     * a command response.
     */
    it('set and get a string beginning with VALUE', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'VALUE hello, I\'m not really a value.'
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Make sure that a string containing line breaks are escaped and
     * unescaped correctly.
     */
    it('set and get a string with line breaks', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = '1\n2\r\n3\n\r4\\n5\\r\\n6\\n\\r7'
        const testnr = ++(global as any).testnumbers
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Make sure long keys are hashed
     */
    it('make sure you can get really long strings', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'VALUE hello, I\'m not really a value.'
        const testnr = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + (++(global as any).testnumbers)
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err1, ok) => {
            ++callbacks

            assert.notExists(err1)
            assert.exists(ok)

            memcached.get('test:' + testnr, (err2, answer) => {
                ++callbacks

                assert.notExists(err2)

                assert.ok(typeof answer === 'string')
                assert.equal(answer, message)

                memcached.end() // close connections
                assert.equal(callbacks, 2)
                done()
            })
        })
    })

    /**
     * Make sure keys with spaces return an error
     */
    it('errors on spaces in strings', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'VALUE hello, I\'m not really a value.'
        const testnr = ' ' + (++(global as any).testnumbers)
        let callbacks = 0

        memcached.set('test:' + testnr, message, 1000, (err, ok) => {
            if (err && !Array.isArray(err)) {
                ++callbacks

                assert.exists(err)
                assert.equal(err.message, 'The key should not contain any whitespace or new lines')

                done()
            }
        })
    })

    /*
        Make sure that getMulti calls work for very long keys.
        If the keys aren't hashed because they are too long, memcached will throw exceptions, so we need to make sure that exceptions aren't thrown.
    */
    it('make sure you can getMulti really long keys', (done) => {
        const memcached = new Memcached(common.servers.single)
        const message = 'My value is not relevant'
        const testnr1 = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + (++(global as any).testnumbers)
        const testnr2 = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789' + ((global as any).testnumbers) + 'a'
        let callbacks = 0

        memcached.getMulti([ testnr1, testnr2 ], (err, ok) => {
            ++callbacks

            assert.notExists(err)
            memcached.end()
            assert.equal(callbacks, 1)
            done()
        })
    })
})
