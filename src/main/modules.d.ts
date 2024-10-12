/**
 * Declare any js modules that lack type declarations here.
 *
 * Sometimes it's not feasible to obtain type declarations for a js library,
 * for one of the following reasons:
 *
 *  1. Type declarations don't exist anywhere (in which case, they should be created).
 *  2. Type declarations exist, but aren't compatible (in which case, they should be fixed).
 */
declare module 'hashring' {
  interface IWeightMap {
    [name: string]: number
  }
  interface IOptions {
    [name: string]: string | number | null
  }
  type Servers = string | Array<string> | IWeightMap

  type Key = string | Array<string>

  class HashRing {
    constructor(servers: Servers, algorithm?: string, options?: IOptions);
    public get(key: Key): string
    public range(key: Key, size: number, unique: boolean): Array<string>
    public remove(server: string): void
    public swap(toReplace: string, replacement: string): void
  }

  export = HashRing
}
