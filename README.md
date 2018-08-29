## Notice

This is forked from [3rd-eden/memcached](https://github.com/3rd-Eden/memcached).
This fork has been rewritten in TypeScript.

# Memcached

`memcached` is a fully featured Memcached client for Node.js. `memcached` is
built with scaling, high availability and exceptional performance in mind. We
use consistent hashing to store the data across different nodes. Consistent
hashing is a scheme that provides a hash table functionality in a way that
adding or removing a server node does not significantly change the mapping of
the keys to server nodes. The algorithm that is used for consistent hashing is
the same as `libketama`.

There are different ways to handle errors for example, when a server becomes
unavailable you can configure the client to see all requests to that server as
cache misses until it goes up again. It's also possible to automatically remove
the affected server from the consistent hashing algorithm or provide `memcached`
with a failover server that can take the place of the unresponsive server.

When these issues occur the `memcached` client will emit different events where
you can subscribe to containing detailed information about the issues.

The client is configurable on different levels. There's a global configuration
that you update so all your Memcached clusters will use the same failure
configuration for example, but it's also possible to overwrite these changes per
`memcached` instance.

### protocol

As in other databases and message queues, this module uses the ASCII protocol
to communicate with the server, which means that you can see what is send over
the wire. For debugging this is easier for both the users and the developers
however this also means that SASL auth is not supported because it demands the
binary protocol.

## Installation

```
npm install @creditkarma/memcached
```

## Setting up the client

We can setup the client in two ways,
1. callback styled client
2. promise styled client.

For using a callback styled client, please refer to [doc](https://github.com/3rd-Eden/memcached#setting-up-the-client)

The constructor of the promise style `memcached` client take 2 different
arguments `server locations` (**mandatory**) and `options` (**optional**). Syntax:

```typescript
import { IMemcachedConfig, MemcachedClient, Servers } from '@creditkarma/memcached'
const servers: Servers = ['192.168.0.102:11211'];
const options: IMemcachedConfig = {};
const memcached: MemcachedClient = new MemcachedClient(servers, options);
```

### Server locations

The server locations is designed to work with different formats. These formats
are all internally parsed to the correct format so our consistent hashing scheme
can work with it. You can either use:

1. **String**, this only works if you are running a single server instance
   of Memcached.  It's as easy a suppling a string in the following format:
   `hostname:port`. For example `192.168.0.102:11211` This would tell the client
   to connect to host `192.168.0.102` on port number `11211`.

2. **Array**, if you are running a single server you would only have to supply
   one item in the array.  The array format is particularly useful if you are
   running a cluster of Memcached servers. This will allow you to spread the keys
   and load between the different servers. Giving you higher availability
   when one of your Memcached servers goes down.

3. **Object**, when running a cluster of Memcached servers, some servers may
   allocate different amounts of memory, e.g. 128, 512, and 128mb. While by
   default all servers are equally important and dispatch consistently the keys
   between the servers (33/33/33%), it is possible to send more keys in servers
   having more memory. To do so, define an object whose `key` represents the
   server location and whose value represents a server weight, the default weight
   for a server being 1; so, for instance `{ '192.168.0.102:11211': 1,`
   `'192.168.0.103:11211': 2, '192.168.0.104:11211': 1 }` distributes 50% of the
   keys on server 103, but only 25% on 104 and 25% on 102.

To implement one of the above formats, your constructor would look like one of
this:

```typescript
const servers: Servers = { '192.168.0.102:11211': 1, '192.168.0.103:11211': 2, '192.168.0.104:11211': 1 };
const memcached: MemcachedClient = new MemcachedClient(servers);

const servers: Servers = [ '192.168.0.102:11211', '192.168.0.103:11211', '192.168.0.104:11211' ];
const memcached: MemcachedClient = new MemcachedClient(servers);

const servers: Servers = '192.168.0.102:11211';
const memcached: MemcachedClient = new MemcachedClient(servers);
```

### Options

Memcached accepts two option schemes. The first one inherits of all Memcached server instances
while the second one is client specific and overwrites the globals. To define these options,
Memcached server uses the same properties:

* `defaultTTL`: *600*, the default ttl (in secondes) for new cache entries
* `maxKeySize`: *250*, the maximum key size allowed.
* `maxExpiration`: *2592000*, the maximum expiration time of keys (in seconds).
* `maxValue`: *1048576*, the maximum size of a value.
* `poolSize`: *10*, the maximum size of the connection pool.
* `algorithm`: *md5*, the hashing algorithm used to generate the `hashRing` values.
* `reconnect`: *18000000*, the time between reconnection attempts (in milliseconds).
* `timeout`: *5000*, the time after which Memcached sends a connection timeout (in milliseconds).
* `retries`: *5*, the number of socket allocation retries per request.
* `failures`: *5*, the number of failed-attempts to a server before it is regarded as 'dead'.
* `retry`: *30000*, the time between a server failure and an attempt to set it up back in service.
* `remove`: *false*, if *true*, authorizes the automatic removal of dead servers from the pool.
* `failOverServers`: *undefined*, an array of `server_locations` to replace servers that fail and
 that are removed from the consistent hashing scheme.
* `keyCompression`: *true*, whether to use `md5` as hashing scheme when keys exceed `maxKeySize`.
* `idle`: *5000*, the idle timeout for the connections.

Example usage:

```typescript
const servers: Servers = 'localhost:11211';
const options: IMemcachedConfig = {
  retries : 10,
  retry : 10000,
  remove : true,
  failOverServers : [ '192.168.0.103:11211' ]
};

const memcached: MemcachedClient = new MemcachedClient(servers, options);
```

## API

### Public methods

**memcached.get** Get the value for the given key.

* `key`: **String**, the key
* `decode`: **function**, (optional) function to decode the string reference
            to a class object

```typescript
const readValue = await memcached.get(key).catch((err) => {return err});
// OR
const readValue = await memcached.get(key, decode).catch((err) => {return err});
```

**memcached.gets** Get the value and the CAS id.

* `key`: **String**, the key

```typescript
const result = await memcached.gets('foo');
```

**memcached.getMulti** Retrieves a bunch of values from multiple keys.

* `keys`: **Array**, all the keys that needs to be fetched
* `callback`: **Function**, the callback.

```typescript
let result = await memcached.getMulti(['foo1', 'foo2', 'foo3']);
```

**memcached.getWithDefault** Gets the value for the given key or a configured
default if the key does not exist in the cache.

* `key`: **String**, the key

```typescript
const readValue = await memcached.getWithDefault(key, 10)
```

**memcached.set** Stores a new value in Memcached.

* `key`: **String** the name of the key
* `value`: **Mixed** Either a buffer, JSON, number or string that you want to store.
* `lifetime`: **Number**, (optional) how long the data needs to be stored
              measured in `seconds`

```typescript
const key = 'key'
const value = 1
const customTTL = 60 // In seconds
await memcached.set(key, value)
// OR
await memcached.set(key, value, customTTL)
```

**memcached.encodeAndSet** Stores reference to class object in Memcached.

* `key`: **String** the name of the key
* `value`: **Mixed** Either a buffer, JSON, number or string that you want to store.
* `encoder`: **Function** that encodes the properties of class into a string.
* `lifetime`: **Number**, (optional) how long the data needs to be stored
              measured in `seconds`

```typescript
const key = 'key'
const value = 1
const customTTL = 60 // In seconds
await memcached.encodeAndSet(key, value, encoder)
// OR
await memcached.encodeAndSet(key, value, encoder, customTTL)
```

**memcached.cas** Add the value, only if it matches the given CAS value.

* `key`: **String** the name of the key
* `value`: **Mixed** Either a buffer, JSON, number or string that you want to store.
* `cas`: **String** the CAS value
* `lifetime`: **Number**, (optional) how long the data needs to be replaced
              measured in `seconds`

```typescript
const result = await memcached.gets(key)
const cas = result.cas
const newValue = 20
const customTTL = 60
await memcached.cas(key, newValue, cas)
// OR
await memcached.cas(key, newValue, cas, customTTL)
```

**memcached.encodeAndCas** Add the reference to class object, only if it matches
the given CAS value.

* `key`: **String** the name of the key
* `value`: **Mixed** Either a buffer, JSON, number or string that you want to store.
* `cas`: **String** the CAS value
* `encoder`: **Function** that encodes the properties of class into a string.
* `lifetime`: **Number**, (optional) how long the data needs to be replaced
              measured in `seconds`

```typescript
const result = await memcached.gets(key)
const cas = result.cas
const newValue = 20
const customTTL = 60
await memcached.encodeAndCas(key, newValue, cas, encoder)
// OR
await memcached.encodeAndCas(key, newValue, cas, encoder, customTTL)
```

**memcached.del** Remove the key from memcached.

* `key`: **String** the name of the key

```typescript
await memcached.del(key).catch((err) => { console.error(err); return })
```

**memcached.flush** Flushes the memcached server.

```typescript
await memcached.flush().catch((err) => { console.error(err); return })
```

**memcached.end** Closes all active memcached connections. This is
a synchronous call

```typescript
memcached.end()
```

# Compatibility
For compatibility with other [libmemcached](http://libmemcached.org/Clients.html) clients they need to have the behavior
`ketama_weighted` set to true and the `hash` set to the same as `node-memcached`'s
`algorithm`.

Due to client dependent type flags it is unlikely that any types other than `string`
will work.

# Contributors

This project wouldn't be possible without the hard work of our amazing
contributors. See the contributors tab in Github for an up to date list of
[contributors](https://github.com/creditkarma/memcached/graphs/contributors).

Thanks for all your hard work on this project!

# License

The driver is released under the MIT license. See the
[LICENSE](https://github.com/creditkarma/memcached/blob/master/LICENSE) for more information.
