import { MemcachedMissingKey, MemcachedOpFailed } from './errors'
import { Memcached } from './memcached'
import { ICasResult, IMemcachedConfig, Servers } from './types'

export { Memcached } from './memcached'
export * from './types'
export class MemcachedClient {
    private client: Memcached
    private defaultTTL: number = 600  // 10 min

    constructor(servers: Servers, options: Partial<IMemcachedConfig> = {}) {
        if (options.defaultTTL !== undefined) {
            this.defaultTTL = options.defaultTTL
        }
        this.client = new Memcached(servers, options)
    }

    public async get<T>(key: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.client.get(key, (err: any, data: any) => {
                if (err !== undefined) {
                    reject(err)
                } else if (data === undefined) {
                    reject(new MemcachedMissingKey(key))
                } else {
                    resolve(data)
                }
            })
        })
    }

    public async getWithDefault<T>(key: string, defaultValue: T): Promise<T> {
        return this.get<T>(key).catch((err: any) => {
            return defaultValue
        })
    }

    public async getMulti<T>(keys: Array<string>): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.client.getMulti(keys, (err: any, data: any) => {
                if (err !== undefined) {
                    reject(err)
                } else {
                    resolve(data)
                }
            })
        })
    }

    public async gets<T>(key: string): Promise<ICasResult> {
        return new Promise<ICasResult>((resolve, reject) => {
            this.client.gets(key, (err: any, data: ICasResult) => {
                if (err !== undefined) {
                    reject(err)
                } else if (data === undefined) {
                    reject(new MemcachedMissingKey(key))
                } else {
                    resolve(data)
                }
            })
        })
    }

    public async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.client.set(key, value, ttl, (err: any, result: boolean) => {
                if (err !== undefined) {
                    reject(err)
                } else {
                    if (result) {
                        resolve(result)
                    } else {
                        reject(new MemcachedOpFailed('set', key))
                    }
                }
            })
        })
    }

    public async cas<T>(key: string, value: T, cas: string, ttl: number = this.defaultTTL): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            this.client.cas(key, value, cas, ttl, (err: any, result: boolean) => {
                if (err !== undefined) {
                    reject(err)
                } else {
                    if (result) {
                        resolve(result)
                    } else {
                        reject(new MemcachedOpFailed('cas', key))
                    }
                }
            })
        })
    }

    public async del<T>(key: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.client.del(key, (err: any, result: boolean) => {
                if (err !== undefined) {
                    reject(err)
                } else {
                    if (result) {
                        resolve(result)
                    } else {
                        reject(new MemcachedOpFailed('del', key))
                    }
                }
            })
        })
    }

    public async flush<T>(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.client.flush((err: any, result: Array<boolean>) => {
                if (err !== undefined) {
                    reject(err)
                } else {
                    resolve(true)
                }
            })
        })
    }
}
