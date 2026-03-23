import { assert } from 'chai'
import { IMemcachedConfig, Memcached, Servers } from '../main'

function getDistributionSpread(options?: Partial<IMemcachedConfig>): number {
    const servers: Servers = [
        '203.0.113.117:12011',
        '203.0.113.114:12011',
        '203.0.113.121:12011',
        '203.0.113.116:12011',
        '203.0.113.120:12011',
        '203.0.113.119:12011',
        '203.0.113.115:12011',
        '203.0.113.122:12011',
        '203.0.113.118:12011',
        '203.0.113.113:12011',
    ]
    const memcached = new Memcached(servers, options)
    const hashRing = (memcached as any)._hashRing as {
        get: (key: string) => string,
    }
    const counts = Object.fromEntries(servers.map((server) => [server, 0]))
    const sampleSize = 200000

    for (let i = 0; i < sampleSize; i++) {
        const server = hashRing.get(`key_${i}`)
        counts[server] += 1
    }

    const percentages = Object.values(counts).map((count) => count / sampleSize)
    return Math.max(...percentages) - Math.min(...percentages)
}

describe('Memcached hashring configuration', () => {
    it('uses a denser default hashring to reduce shard skew', () => {
        const sparseSpread = getDistributionSpread({ hashRingVnodeCount: 40 })
        const defaultSpread = getDistributionSpread()

        assert.isBelow(defaultSpread, sparseSpread)
        assert.isBelow(defaultSpread, 0.015)
    })

    it('allows overriding the hashring vnode count', () => {
        const servers: Servers = ['localhost:11211', 'localhost:11212']
        const memcached = new Memcached(servers, { hashRingVnodeCount: 400 })
        const hashRing = (memcached as any)._hashRing as { vnode: number }

        assert.equal(hashRing.vnode, 400)
    })
})
