import { assert } from 'chai'
import { IMemcachedConfig, MemcachedClient, Servers } from '../main'

describe('Memcached', () => {
    beforeEach(async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        await client.flush()
    })

    it('should set/get string values', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        await client.set('test_1', 'test_value_1')
        const actual = await client.get<string>('test_1')

        assert.equal(actual, 'test_value_1')
    })

    it('should set/get binary values', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        const data = Buffer.from('test_value_2')
        await client.set('test_2', data)
        const rawResult = await client.get<Buffer>('test_2')
        const actual = rawResult.toString('utf-8')
        assert.equal(actual, 'test_value_2')
    })

    it('should set/get number values', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        await client.set<number>('test_1', 1)
        const actual = await client.get<number>('test_1')
        assert.equal(actual, 1)
        assert.isNumber(actual)
    })

    it('should set/get array object', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        await client.set<Array<number>>('test_1', [1, 2, 3])
        const actual = await client.get<Array<number>>('test_1')
        assert.isArray(actual)
        assert.equal(actual[0], 1)
        assert.equal(actual[1], 2)
        assert.equal(actual[2], 3)
    })

    it('should set/get flat object', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        await client.set<object>('test_1', {'a': 1, 'b': 2})
        const actual = await client.get<any>('test_1')
        assert.isObject(actual)
        assert.equal(actual.a, 1)
        assert.equal(actual.b, 2)
    })

    it('should set/get nested object', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        const expected: object = {
            'a' : 1,
            'b' : 2,
            'c' : {
                'c1' : 31,
                'c2' : 32,
            },
        }
        await client.set<object>('test_1', expected)
        const actual = await client.get<any>('test_1')
        assert.isObject(actual)
        assert.equal(actual.a, 1)
        assert.equal(actual.b, 2)
        assert.isObject(actual.c)
        assert.equal(actual.c.c1, 31)
        assert.equal(actual.c.c2, 32)
    })

    it('should reject when fetching missing key', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)
        return client.get<string>('missing_key').then((val: any) => {
            throw new Error('Should reject for missing key')
        }, (err: any) => {
            assert.equal(err.message, 'Given key[missing_key] does not have a value in Memcached')
        })
    })

    it('should expire key after ttl', async () => {
        const servers: Servers = ['localhost:11211']
        const options: Partial<IMemcachedConfig> = {
            defaultTTL: 1,
        }
        const client = new MemcachedClient(servers, options)
        return new Promise(async (resolve) => {
            await client.set('test_1', 1)
            const valBeforeTTL = await client.get('test_1')
            assert.isNumber(valBeforeTTL)
            assert.equal(valBeforeTTL, 1)
            setTimeout(async () => {
                await client.get<number>('test_1').then((val: any) => {
                    throw new Error('Should reject for missing key')
                }, (err: any) => {
                    assert.equal(err.message, 'Given key[test_1] does not have a value in Memcached')
                })

                return resolve()
            }, 1000)
        })
    })

    it('should expire key after custom ttl', async () => {
        return new Promise(async (resolve) => {
            const servers: Servers = ['localhost:11211']
            const options: Partial<IMemcachedConfig> = {
                defaultTTL: 2,
            }
            const client = new MemcachedClient(servers, options)
            await client.set('test_1', 1, 1)
            const valBeforeTTL = await client.get<number>('test_1')
            assert.isNumber(valBeforeTTL)
            assert.equal(valBeforeTTL, 1)
            setTimeout(async () => {
                await client.get<number>('test_1').then((val: any) => {
                    throw new Error('Should reject for missing key')
                }, (err: any) => {
                    assert.equal(err.message, 'Given key[test_1] does not have a value in Memcached')
                })

                return resolve()
            }, 1000)
        })
    })

    it('should remove failed hosts', async () => {
        const servers: Servers = ['localhost:10000', 'localhost:11211']
        const options: Partial<IMemcachedConfig> = {
            timeout: 1000,
            retries: 0,
            failures: 0,
            retry: 100,
            remove : true,
        }
        const client = new MemcachedClient(servers, options)
        await client.get('some_key').catch((err: any) => {
            assert.equal(err.message, 'connect ECONNREFUSED 127.0.0.1:10000')
        })
        await client.get('some_key').catch((err: any) => {
            assert.equal(err.message, 'Given key[some_key] does not have a value in Memcached')
        })
    })

    it('should be able to do a cas operation', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        const key = 'foo1'
        const value = 10
        const value2 = 20
        await client.set(key, value)
        let result: any = await client.gets(key)
        const cas = result.cas
        await client.cas(key, value2, cas)
        result = await client.get(key)
        assert.isNumber(result)
        assert.equal(result, 20)
    })

    it('should fail cas operation with invalid cas ID passed', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        const key = 'foo1'
        const value = 10
        const value2 = 20
        const value3 = 30
        await client.set(key, value)
        let result: any = await client.gets(key)
        const cas1 = result.cas
        result = await client.gets(key)
        const cas2 = result.cas
        await client.cas(key, value2, cas1)
        await client.cas(key, value3, cas2).catch((err) => {
            assert.equal(err.message, 'Operation[cas] failed for key[foo1]')
        })
        result = await client.get(key)
        assert.equal(result, 20)
    })

    it('should be able to get multiple keys', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        await client.set('foo1', 'bar1')
        await client.set('foo2', 'bar2')
        await client.set('foo3', 'bar3')
        let result = await client.getMulti(['foo1', 'foo2', 'foo3'])
        assert.isObject(result)
        assert.equal(result.foo1, 'bar1')
        assert.equal(result.foo2, 'bar2')
        assert.equal(result.foo3, 'bar3')

        result = await client.getMulti(['foo1', 'foo2', 'foo4'])
        assert.isObject(result)
        assert.equal(result.foo1, 'bar1')
        assert.equal(result.foo2, 'bar2')
        assert.notExists(result.foo3)
        assert.notExists(result.foo4)
    })

    it('should be able to delete key', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        await client.set('foo', 'bar')
        let result: any = await client.del('foo')
        assert.isBoolean(result)
        assert.isTrue(result)
        result = await client.del('foo2').catch((err) => {
            assert.equal(err.message, 'Operation[del] failed for key[foo2]')
            return false
        })
        assert.isFalse(result)
    })

    it('should be able to store and retrieve class reference', async () => {
        const servers: Servers = ['localhost:11211']
        const client = new MemcachedClient(servers)

        class FooCl {
            public static toJSON(obj: any) {
                return JSON.stringify({
                    name: obj.name,
                })
            }
            public static fromJSON(jsonString: string) {
                try {
                    const json = JSON.parse(jsonString)
                    return new FooCl(json.name)
                } catch (err) {
                    return null
                }
            }
            private name: string = 'dummy'
            constructor(name: string) {
                this.name = name
            }
            public getName() {
                return this.name
            }
            public setName(name: string) {
                this.name = name
            }
        }

        const foo = new FooCl('user1')
        const key = 'foo'

        await client.encodeAndSet(key, foo, FooCl.toJSON)
        let resultFn = await client.get(key, FooCl.fromJSON)
        assert.isDefined(resultFn)
        assert.isNotNull(resultFn)
        if (resultFn !== null) {
            assert.equal(resultFn.getName(), 'user1')
            resultFn.setName('user2')
            assert.equal(resultFn.getName(), 'user2')
        }

        const result = await client.gets(key, FooCl.fromJSON)
        resultFn = result.value
        const cas = result.cas
        if (resultFn !== null) {
            resultFn.setName('user2')
            await client.encodeAndCas(key, resultFn, cas, FooCl.toJSON)
            resultFn = await client.get(key, FooCl.fromJSON)
            if (resultFn !== null) {
                assert.equal(resultFn.getName(), 'user2')
            }
        }
    })
})
