"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULT_PARSERS = exports.TOKEN_TYPES = exports.FLAG_NUMERIC = exports.FLAG_BINARY = exports.FLAG_JSON = exports.CONTINUE = exports.BUFFER = exports.FLUSH = exports.NOREPLY = exports.LINEBREAK = void 0;
exports.LINEBREAK = '\r\n';
exports.NOREPLY = ' noreply';
exports.FLUSH = 1E3;
exports.BUFFER = 1E2;
exports.CONTINUE = 1E1;
exports.FLAG_JSON = 1 << 1;
exports.FLAG_BINARY = 1 << 2;
exports.FLAG_NUMERIC = 1 << 3;
exports.TOKEN_TYPES = [
    'STORED', 'TOUCHED', 'DELETED', 'OK', 'EXISTS',
    'NOT_FOUND', 'NOT_STORED', 'ERROR', 'CLIENT_ERROR',
    'SERVER_ERROR', 'END', 'VALUE', 'INCRDECR', 'STAT',
    'VERSION', 'ITEM', 'CONFIG',
];
exports.RESULT_PARSERS = [
    'stats', 'stats settings', 'stats slabs', 'stats items',
];
//# sourceMappingURL=constants.js.map