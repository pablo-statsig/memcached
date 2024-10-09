"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servers = void 0;
exports.alphabet = alphabet;
exports.numbers = numbers;
const testMemcachedHost = process.env.MEMCACHED__HOST || 'localhost';
exports.servers = {
    single: testMemcachedHost + ':11211',
    multi: [
        testMemcachedHost + ':11211',
        testMemcachedHost + ':11212',
        testMemcachedHost + ':11213',
    ],
};
function alphabet(n) {
    let result = '';
    for (let i = 0; i < n; i++) {
        result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    return result;
}
function numbers(n) {
    let result = 0;
    for (let i = 0; i < n; i++) {
        result += Math.floor(Math.random() * 26);
    }
    return result;
}
//# sourceMappingURL=common.js.map