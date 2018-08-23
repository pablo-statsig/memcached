// import { assert } from 'chai'
// import * as Memcached from '../main'
// import * as common from './common'

// (global as any).testnumbers = (global as any).testnumbers || +(Math.random(10) * 1000000).toFixed()

// /**
//  * Expresso test suite for all `parser` related
//  * memcached commands
//  */
// describe('Memcached parser', function() {
//   it('chunked response', function(done) {
//     let memcached = new Memcached(common.servers.single)
//       , message = common.alphabet(256)
//       , chunks = []
//       , chunk = 'VALUE tests::#{key} 2 {length}'
//       , chunkJSON = JSON.stringify({
//             lines: []
//           , message
//           , id: null,
//         })
//       , testnr = ++(global as any).testnumbers
//       , callbacks = 0

//       // Build up our tests
//     let S = {
//           responseBuffer: ''
//         , bufferArray: []
//         , metaData: []
//         , streamID: 0,
//       }

//       // Build up our chunk data
//     chunks.push(chunk.replace('{key}', 1).replace('{length}', chunkJSON.length))
//     chunks.push(chunkJSON)
//     chunks.push(chunk.replace('{key}', 2).replace('{length}', chunkJSON.length))

//       // Insert first chunk
//     memcached.buffer(S, chunks.join('\r\n') + '\r\n')

//       // We check for bufferArray length otherwise it will crash on 'SyntaxError: Unexpected token V'
//     assert.equal(S.bufferArray.length, 3)

//       // Now add the value of the last response key in previous chunk
//     chunks.unshift(chunkJSON)

//       // Add it for the second chunk also
//     chunks.push(chunkJSON)

//       // Insert second chunk
//     memcached.buffer(S, chunks.join('\r\n') + '\r\nEND\r\n')

//       // Check if everything is cleared up nicely.
//     assert.equal(S.responseBuffer.length, 0)
//     assert.equal(S.bufferArray.length, 0)
//     assert.equal(S.metaData.length, 0)

//     memcached.end()
//     done()
//   })
// })
