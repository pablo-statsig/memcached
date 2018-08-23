// import { assert } from 'chai'
// import * as Memcached from '../main'
// import * as common from './common'

// (global as any).testnumbers = (global as any).testnumbers || +(Math.random(10) * 1000000).toFixed()

// /**
//  * Expresso test suite for all `get` related
//  * memcached commands
//  */
// describe('Memcached tests with Namespaces', function() {
//   /**
//    * Make sure that the string that we send to the server is correctly
//    * stored and retrieved. We will be storing random strings to ensure
//    * that we are not retrieving old data.
//    */
//   it("set with one namespace and verify it can't be read in another", function(done) {
//     let memcached = new Memcached(common.servers.single)
//         , message = common.alphabet(256)
//         , testnr = ++(global as any).testnumbers
//         , callbacks = 0

//     // Load an non-namespaced entry to memcached
//     memcached.set('test:' + testnr, message, 1000, function(error, ok) {
//       ++callbacks

//       assert.ok(!error)
//       ok.should.be.true

//       let memcachedOther = new Memcached(common.servers.single, {
//         namespace: 'mySegmentedMemcached:',
//       })

//       // Try to load that memcache key with the namespace prepended - this should fail
//       memcachedOther.get('test:' + testnr, function(error, answer) {
//         ++callbacks

//         assert.ok(!error)
//         ok.should.be.true
//         assert.ok(answer === undefined)

//         // OK, now let's put it in with the namespace prepended
//         memcachedOther.set('test:' + testnr, message, 1000, function(error, ok) {
//           ++callbacks

//           assert.ok(!error)
//           ok.should.be.true

//           // Now when we request it back, it should be there
//           memcachedOther.get('test:' + testnr, function(error, answer) {
//             ++callbacks

//             assert.ok(!error)

//             assert.ok(typeof answer === 'string')
//             answer.should.eql(message)

//             memcachedOther.end() // close connections
//             assert.equal(callbacks, 4)
//             done()
//           })
//         })
//       })
//     })
//   })

//   it('set, set, and multiget with custom namespace', function(done) {
//     let memcached = new Memcached(common.servers.single, {
//           namespace: 'mySegmentedMemcached:',
//         })
//       , callbacks = 0

//     // Load two namespaced variables into memcached
//     memcached.set('test1', 'test1answer', 1000, function(error, ok) {
//       ++callbacks

//       assert.ok(!error)
//       ok.should.be.true

//       memcached.set('test2', 'test2answer', 1000, function(error, ok) {
//         ++callbacks

//         assert.ok(!error)
//         ok.should.be.true

//         memcached.get(['test1', 'test2'], function(error, answer) {
//           ++callbacks

//           assert.ok(typeof answer === 'object')
//           answer.test1.should.eql('test1answer')
//           answer.test2.should.eql('test2answer')

//           memcached.end() // close connections

//           assert.equal(callbacks, 3)
//           done()
//         })
//       })
//     })
//   })

//   /**
//    * In this case, these keys will be allocated to servers like below.
//    * test1,3,4 => :11211
//    * test5     => :11212
//    * test2     => :11213
//    */
//   it('multi get from multi server with custom namespace (inc. cache miss)', function(done) {
//     let memcached = new Memcached(common.servers.multi, {
//           namespace: 'mySegmentedMemcached:',
//         })
//       , callbacks = 0

//     // Load two namespaced variables into memcached
//     memcached.set('test1', 'test1answer', 1000, function(error, ok) {
//       ++callbacks

//       assert.ok(!error)
//       ok.should.be.true

//       memcached.set('test2', 'test2answer', 1000, function(error, ok) {
//         ++callbacks

//         assert.ok(!error)
//         ok.should.be.true

//         memcached.get(['test1', 'test2', 'test3', 'test4', 'test5'], function(error, answer) {
//           ++callbacks
//           assert.ok(typeof answer === 'object')
//           answer.test1.should.eql('test1answer')
//           answer.test2.should.eql('test2answer')
//           answer.should.not.have.key('test3')
//           answer.should.not.have.key('test4')
//           answer.should.not.have.key('test5')

//           memcached.end() // close connections

//           assert.equal(callbacks, 3)
//           done()
//         })
//       })
//     })
//   })

//   it('should allow namespacing on delete', function(done) {
//     let memcached = new Memcached(common.servers.single, {
//         namespace: 'someNamespace:',
//     }), callbacks = 0

//     // put a value
//     memcached.set('test1', 'test1answer', 1000, function(error, ok) {
//         callbacks++
//         assert.ok(!error)
//         ok.should.be.true

//         // get it back
//         memcached.get('test1', function(error, answer) {
//             callbacks++
//             assert.ok(typeof answer === 'string')
//             answer.should.eql('test1answer')

//             // delete it
//             memcached.del('test1', function(error) {
//                 callbacks++
//                 assert.ok(!error)

//                 // no longer there
//                 memcached.get('test1', function(error, answer) {
//                     callbacks++
//                     assert.ok(!error)
//                     assert.ok(!answer)
//                     memcached.end()
//                     assert.equal(callbacks, 4)
//                     done()
//                 })
//             })
//         })
//     })
//   })

//   it('should allow increment and decrement on namespaced values', function(done) {
//     let memcached = new Memcached(common.servers.single, {
//         namespace: 'someNamespace:',
//     }), callbacks = 0

//     // put a value
//     memcached.set('test1', 1, 1000, function(error, ok) {
//         callbacks++
//         assert.ok(!error)
//         ok.should.be.true

//         // increment it
//         memcached.incr('test1', 1, function(error) {
//             callbacks++
//             assert.ok(!error)

//             // get it back
//             memcached.get('test1', function(error, answer) {
//                 callbacks++
//                 assert.ok(!error)
//                 assert.ok(typeof answer === 'number')
//                 answer.should.be.eql(2)

//                 // decrement it
//                 memcached.decr('test1', 1, function(err) {
//                     callbacks++
//                     assert.ok(!error)

//                     // get it again
//                     memcached.get('test1', function(error, answer) {
//                         callbacks++
//                         assert.ok(!error)
//                         assert.ok(typeof answer === 'number')
//                         answer.should.be.eql(1)

//                         // get rid of it
//                         memcached.del('test1', function(error, answer) {
//                             callbacks++
//                             assert.ok(!error)
//                             memcached.end()
//                             assert.equal(callbacks, 6)
//                             done()
//                         })
//                     })
//                 })
//             })
//         })
//     })
//   })
// })
