"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const main_1 = require("../main");
const common = require("./common");
global.testnumbers = global.testnumbers || +(Math.random() * 1000000).toFixed();
describe('Memcached parser', () => {
    it('chunked response', (done) => {
        const memcached = new main_1.Memcached(common.servers.single);
        const message = common.alphabet(256);
        const chunks = [];
        const chunk = (key, length) => `VALUE tests::#${key} 2 ${length}`;
        const chunkJSON = JSON.stringify({
            lines: [],
            message,
            id: null,
        });
        const testnr = ++global.testnumbers;
        const callbacks = 0;
        const socket = {
            responseBuffer: '',
            bufferArray: [],
            metaData: [],
            streamID: 0,
        };
        chunks.push(chunk(1, chunkJSON.length));
        chunks.push(chunkJSON);
        chunks.push(chunk(2, chunkJSON.length));
        memcached._buffer(socket, chunks.join('\r\n') + '\r\n');
        chai_1.assert.equal(socket.bufferArray.length, 3);
        chunks.unshift(chunkJSON);
        chunks.push(chunkJSON);
        memcached._buffer(socket, chunks.join('\r\n') + '\r\nEND\r\n');
        chai_1.assert.equal(socket.responseBuffer.length, 0);
        chai_1.assert.equal(socket.bufferArray.length, 0);
        chai_1.assert.equal(socket.metaData.length, 0);
        memcached.end();
        done();
    });
});
//# sourceMappingURL=memcached-parser.spec.js.map