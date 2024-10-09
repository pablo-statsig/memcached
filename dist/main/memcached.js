"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memcached = void 0;
const Utils = require("./utils");
const commands_1 = require("./commands");
const constants_1 = require("./constants");
const IssueLog_1 = require("./IssueLog");
const events_1 = require("events");
const net_1 = require("net");
const defaults_1 = require("./defaults");
const Deque = require("double-ended-queue");
const HashRing = require("hashring");
const Jackpot = require("jackpot");
const ALL_COMMANDS = new RegExp('^(?:' + constants_1.TOKEN_TYPES.join('|') + '|\\d' + ')');
const BUFFERED_COMMANDS = new RegExp('^(?:' + constants_1.TOKEN_TYPES.join('|') + ')');
class MemcachedSocket extends net_1.Socket {
    constructor(id, server, memcached) {
        super();
        this.streamID = id;
        this.metaData = new Deque();
        this.responseBuffer = '';
        this.bufferArray = [];
        this.tokens = [];
        this.serverAddress = server;
        this.memcached = memcached;
    }
}
class Memcached extends events_1.EventEmitter {
    constructor(servers, options = {}) {
        super();
        this._config = Utils.merge(Memcached.config, options);
        this._hashRing = new HashRing(servers);
        this._activeQueries = 0;
        this._servers = [];
        this._issues = {};
        this._connections = {};
        if (Array.isArray(servers)) {
            this._servers = servers;
        }
        else if (typeof servers === 'object') {
            this._servers = Object.keys(servers);
        }
        else if (typeof servers === 'string') {
            this._servers.push(servers);
        }
    }
    end() {
        Object.keys(this._connections).forEach((key) => {
            this._connections[key].end();
        });
    }
    touch(key, ttl, callback) {
        const fullkey = `${this._config.namespace}${key}`;
        this._executeCommand(() => ({
            key: fullkey,
            callback,
            lifetime: ttl,
            validate: [
                ['key', String],
                ['lifetime', Number],
                ['callback', Function],
            ],
            type: 'touch',
            command: `touch ${fullkey} ${ttl}`,
        }));
    }
    set(...args) {
        const key = args[0];
        const value = args[1];
        let ttl = this._config.defaultTTL;
        let callback = args[2];
        if (typeof args[2] === 'number') {
            ttl = args[2];
            callback = args[3];
        }
        this._setters('set', key, value, ttl, callback);
    }
    add(...args) {
        const key = args[0];
        const value = args[1];
        let ttl = this._config.defaultTTL;
        let callback = args[2];
        if (typeof args[2] === 'number') {
            ttl = args[2];
            callback = args[3];
        }
        this._setters('add', key, value, ttl, callback);
    }
    cas(...args) {
        const key = args[0];
        const value = args[1];
        const cas = args[2];
        let ttl = this._config.defaultTTL;
        let callback = args[3];
        if (typeof args[3] === 'number') {
            ttl = args[3];
            callback = args[4];
        }
        this._setters('cas', key, value, ttl, callback, cas);
    }
    del(key, callback) {
        const fullkey = `${this._config.namespace}${key}`;
        this._executeCommand((noreply) => ({
            key: fullkey,
            callback,
            validate: [
                ['key', String],
                ['callback', Function],
            ],
            type: 'delete',
            redundancyEnabled: true,
            command: 'delete ' + fullkey + (noreply ? constants_1.NOREPLY : ''),
        }));
    }
    delete(key, callback) {
        this.del(key, callback);
    }
    get(key, callback) {
        if (Array.isArray(key)) {
            this.getMulti(key, callback);
        }
        else {
            const fullkey = `${this._config.namespace}${key}`;
            this._executeCommand((noreply) => ({
                key: fullkey,
                callback,
                validate: [
                    ['key', String],
                    ['callback', Function],
                ],
                type: 'get',
                command: `get ${fullkey}`,
            }));
        }
    }
    gets(key, callback) {
        const fullkey = `${this._config.namespace}${key}`;
        this._executeCommand((noreply) => ({
            key: fullkey,
            callback,
            validate: [
                ['key', String],
                ['callback', Function],
            ],
            type: 'gets',
            command: `gets ${fullkey}`,
        }));
    }
    getMulti(keys, callback) {
        const errors = [];
        let calls = 0;
        let responses = {};
        keys = keys.map((key) => {
            return `${this._config.namespace}${key}`;
        });
        const handle = (err, results) => {
            if (err) {
                errors.push(err);
            }
            (Array.isArray(results) ? results : [results]).forEach((value) => {
                if (value && this._config.namespace.length) {
                    const nsKey = Object.keys(value)[0];
                    const newvalue = {};
                    newvalue[nsKey.replace(this._config.namespace, '')] = value[nsKey];
                    responses = Utils.merge(responses, newvalue);
                }
                else {
                    responses = Utils.merge(responses, value);
                }
            });
            if (--calls <= 0) {
                callback(errors.length ? errors : undefined, responses);
            }
        };
        this._multi(keys, (server, key, index, totals) => {
            if (calls === 0) {
                calls = totals;
            }
            this._executeCommand((noreply) => ({
                callback: handle,
                multi: true,
                type: 'get',
                command: `get ${key.join(' ')}`,
                key: keys,
                validate: [
                    ['key', Array],
                    ['callback', Function],
                ],
            }), server);
        });
    }
    incr(key, value, callback) {
        this._incrdecr('incr', key, value, callback);
    }
    increment(key, value, callback) {
        this.incr(key, value, callback);
    }
    decr(key, value, callback) {
        this._incrdecr('decr', key, value, callback);
    }
    decrement(key, value, callback) {
        this.decr(key, value, callback);
    }
    cachedump(server, slabid, num, callback) {
        this._executeCommand((noreply) => ({
            callback,
            number: num,
            slabid,
            validate: [
                ['number', Number],
                ['slabid', Number],
                ['callback', Function],
            ],
            type: 'stats cachedump',
            command: `stats cachedump ${slabid} ${num}`,
        }), server);
    }
    version(callback) {
        this._singles('version', callback);
    }
    flush(callback) {
        this._singles('flush_all', callback);
    }
    flushAll(callback) {
        this.flush(callback);
    }
    stats(callback) {
        this._singles('stats', callback);
    }
    settings(callback) {
        this._singles('stats settings', callback);
    }
    statsSettings(callback) {
        this.settings(callback);
    }
    slabs(callback) {
        this._singles('stats slabs', callback);
    }
    statsSlabs(callback) {
        this.slabs(callback);
    }
    items(callback) {
        this._singles('stats items', callback);
    }
    statsItems(callback) {
        this.items(callback);
    }
    _singles(type, callback) {
        let responses = [];
        let errors;
        let calls = 0;
        const handle = (err, results) => {
            if (err) {
                errors = errors || [];
                errors = errors.concat(err);
            }
            if (results) {
                responses = responses.concat(results);
            }
            if (!--calls) {
                callback(errors && errors.length ? errors.pop() : undefined, responses);
            }
        };
        this._multi([], (server, keys, index, totals) => {
            if (!calls) {
                calls = totals;
            }
            this._executeCommand((noreply) => ({
                callback: handle,
                type,
                command: type,
            }), server);
        });
    }
    _incrdecr(type, key, value, callback) {
        const fullkey = `${this._config.namespace}${key}`;
        this._executeCommand((noreply) => ({
            key: fullkey,
            callback,
            value,
            validate: [
                ['key', String],
                ['value', Number],
                ['callback', Function],
            ],
            type,
            redundancyEnabled: true,
            command: [type, fullkey, value].join(' ') + (noreply ? constants_1.NOREPLY : ''),
        }));
    }
    _setters(type, key, value, lifetime, callback, cas = '') {
        const fullKey = `${this._config.namespace}${key}`;
        let flag = 0;
        const valuetype = typeof value;
        if (Buffer.isBuffer(value)) {
            flag = constants_1.FLAG_BINARY;
            value = value.toString('binary');
        }
        else if (valuetype === 'number') {
            flag = constants_1.FLAG_NUMERIC;
            value = value.toString();
        }
        else if (valuetype !== 'string') {
            flag = constants_1.FLAG_JSON;
            value = JSON.stringify(value);
        }
        value = Utils.escapeValue(value);
        const length = Buffer.byteLength(value);
        if (length > this._config.maxValue) {
            this._errorResponse(new Error(`The length of the value is greater than ${this._config.maxValue}`), callback);
        }
        else {
            this._executeCommand((noreply) => ({
                key: fullKey,
                callback,
                lifetime,
                value,
                cas,
                validate: [
                    ['key', String],
                    ['value', String],
                    ['lifetime', Number],
                    ['callback', Function],
                ],
                type,
                redundancyEnabled: false,
                command: [type, fullKey, flag, lifetime, length].join(' ') +
                    (cas ? ` ${cas}` : '') +
                    (noreply ? constants_1.NOREPLY : '') +
                    constants_1.LINEBREAK +
                    value,
            }));
        }
    }
    _errorResponse(error, callback) {
        if (typeof callback === 'function') {
            this._makeCallback(callback, error, false);
        }
        return false;
    }
    _makeCallback(callback, err, value) {
        this._activeQueries--;
        callback(err, value);
    }
    _multi(keys, callback) {
        const map = {};
        let servers;
        let i;
        if (keys && keys.length > 0) {
            keys.forEach((key) => {
                const server = this._servers.length === 1
                    ? this._servers[0]
                    : this._hashRing.get(key);
                if (map[server]) {
                    map[server].push(key);
                }
                else {
                    map[server] = [key];
                }
            });
            servers = Object.keys(map);
        }
        else {
            servers = this._servers;
        }
        i = servers.length;
        while (i--) {
            callback(servers[i], map[servers[i]], i, servers.length);
        }
    }
    _failedServers() {
        const result = [];
        for (const server in this._issues) {
            if (this._issues[server].failed) {
                result.push(server);
            }
        }
        return result;
    }
    _executeCommand(compiler, server) {
        this._activeQueries += 1;
        const command = (0, commands_1.makeCommand)(compiler());
        if (this._activeQueries > this._config.maxQueueSize &&
            this._config.maxQueueSize > 0) {
            this._makeCallback(command.callback, new Error('over queue limit'), null);
        }
        else if (command.validate && !Utils.validateArg(command, this._config)) {
            this._activeQueries -= 1;
        }
        else {
            const redundancy = this._config.redundancy < this._servers.length;
            const queryRedundancy = command.redundancyEnabled;
            let redundants = [];
            if (redundancy && queryRedundancy) {
                redundants = this._hashRing.range(command.key, this._config.redundancy + 1, true);
            }
            if (server === undefined) {
                if (this._servers.length === 1) {
                    server = this._servers[0];
                }
                else {
                    if (redundancy && queryRedundancy) {
                        server = redundants.shift();
                    }
                    else {
                        server = this._hashRing.get(command.key);
                    }
                }
            }
            if (server === undefined ||
                (server in this._issues && this._issues[server].failed)) {
                if (command.callback) {
                    const failedServers = this._failedServers().join();
                    this._makeCallback(command.callback, new Error(`Server at ${failedServers} not available`));
                }
            }
            else if (server !== undefined) {
                this._connect(server, (error, socket) => {
                    if (this._config.debug) {
                        command.command.split(constants_1.LINEBREAK).forEach((line) => {
                            console.log(socket.streamID + ' << ' + line);
                        });
                    }
                    if (!socket) {
                        const connectionLike = {
                            serverAddress: server,
                            tokens: server.split(':').reverse(),
                        };
                        const message = `Unable to connect to socket[${server}]`;
                        error = error || new Error(message);
                        this._connectionIssue(error.toString(), connectionLike);
                        if (command.callback) {
                            this._makeCallback(command.callback, error);
                        }
                    }
                    else {
                        if (error) {
                            this._connectionIssue(error.toString(), socket);
                            if (command.callback) {
                                this._makeCallback(command.callback, error);
                            }
                        }
                        else if (!socket.writable) {
                            error = new Error(`Unable to write to socket[${socket.serverAddress}]`);
                            this._connectionIssue(error.toString(), socket);
                            if (command.callback) {
                                this._makeCallback(command.callback, error);
                            }
                        }
                        else {
                            command.start = Date.now();
                            socket.metaData.push(command);
                            const commandString = `${command.command}${constants_1.LINEBREAK}`;
                            socket.write(commandString);
                        }
                    }
                });
            }
        }
    }
    _connectionIssue(error, socket) {
        if (socket && socket.end) {
            socket.end();
        }
        let issues;
        const server = socket.serverAddress;
        const memcached = this;
        if (server in this._issues) {
            issues = this._issues[server];
        }
        else {
            issues = this._issues[server] = new IssueLog_1.IssueLog({
                server,
                tokens: socket.tokens,
                reconnect: this._config.reconnect,
                failures: this._config.failures,
                failuresTimeout: this._config.failuresTimeout,
                retry: this._config.retry,
                remove: this._config.remove,
                failOverServers: this._config.failOverServers,
            });
            Utils.fuse(issues, {
                issue: function issue(details) {
                    memcached.emit('issue', details);
                },
                failure: function failure(details) {
                    memcached.emit('failure', details);
                },
                reconnecting: function reconnect(details) {
                    memcached.emit('reconnecting', details);
                },
                reconnected: function reconnected(details) {
                    memcached.emit('reconnect', details);
                },
                remove: function remove(details) {
                    memcached.emit('remove', details);
                    memcached._connections[server].end();
                    if (memcached._config.failOverServers.length > 0) {
                        memcached._hashRing.swap(server, memcached._config.failOverServers.shift());
                    }
                    else {
                        memcached._hashRing.remove(server);
                        memcached.emit('failure', details);
                    }
                },
            });
            issues.setMaxListeners(0);
        }
        issues.log(error);
    }
    _connect(server, callback) {
        if (!server.match(/(.+):(\d+)$/)) {
            server = `${server}:11211`;
        }
        if (server in this._issues && this._issues[server].failed) {
            return callback();
        }
        else {
            if (server in this._connections) {
                this._connections[server].pull(callback);
            }
            else {
                const serverTokens = Array.isArray(server) && server[0] === '/'
                    ? server
                    : /(.*):(\d+){1,}$/.exec(server).reverse();
                if (Array.isArray(serverTokens)) {
                    serverTokens.pop();
                }
                let sid = 0;
                const manager = new Jackpot(this._config.poolSize);
                manager.retries = this._config.retries;
                manager.factor = this._config.factor;
                manager.minTimeout = this._config.minTimeout;
                manager.maxTimeout = this._config.maxTimeout;
                manager.randomize = this._config.randomize;
                manager.setMaxListeners(0);
                manager.factory(() => {
                    const streamID = sid++;
                    const socket = new MemcachedSocket(streamID, server, this);
                    const idleTimeout = () => {
                        manager.remove(socket);
                    };
                    const streamError = (e) => {
                        this._connectionIssue(e.toString(), socket);
                        manager.remove(socket);
                    };
                    socket.setTimeout(this._config.timeout);
                    socket.setNoDelay(true);
                    socket.setEncoding('utf8');
                    socket.tokens = [...serverTokens];
                    Utils.fuse(socket, {
                        close: () => {
                            manager.remove(socket);
                        },
                        data: (data) => {
                            this._buffer(socket, data);
                        },
                        connect: () => {
                            socket.setTimeout(socket.memcached._config.idle, idleTimeout);
                            socket.on('error', streamError);
                        },
                        end: socket.end,
                    });
                    socket.connect.apply(socket, socket.tokens);
                    return socket;
                });
                manager.on('error', (err) => {
                    if (this._config.debug) {
                        console.log('Connection error', err);
                    }
                });
                this._connections[server] = manager;
                this._connections[server].pull(callback);
            }
        }
    }
    _buffer(socket, buffer) {
        socket.responseBuffer += buffer;
        if (socket.responseBuffer.substr(socket.responseBuffer.length - 2) ===
            constants_1.LINEBREAK) {
            socket.responseBuffer = `${socket.responseBuffer}`;
            const chunks = socket.responseBuffer.split(constants_1.LINEBREAK);
            if (this._config.debug) {
                chunks.forEach((line) => {
                    console.log(socket.streamID + ' >> ' + line);
                });
            }
            const chunkLength = chunks.length - 1;
            if (chunks[chunkLength].length === 0) {
                chunks.splice(chunkLength, 1);
            }
            socket.responseBuffer = '';
            socket.bufferArray = socket.bufferArray.concat(chunks);
            this._rawDataReceived(socket);
        }
    }
    _rawDataReceived(socket) {
        const queue = [];
        const err = [];
        while (socket.bufferArray.length &&
            ALL_COMMANDS.test(socket.bufferArray[0])) {
            const token = socket.bufferArray.shift();
            const tokenSet = token.split(' ');
            let dataSet = '';
            let resultSet;
            if (/^\d+$/.test(tokenSet[0])) {
                if (/(([-.a-zA-Z0-9]+)\|(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)\|(\d+))/.test(socket.bufferArray[0])) {
                    tokenSet.unshift('CONFIG');
                }
                else {
                    tokenSet.unshift('INCRDECR');
                }
            }
            const tokenType = tokenSet[0];
            if (tokenType === 'VALUE' && socket.bufferArray.indexOf('END') === -1) {
                socket.bufferArray.unshift(token);
                return;
            }
            else {
                if (constants_1.TOKEN_TYPES.indexOf(tokenType) > -1) {
                    if (tokenType === 'VALUE') {
                        dataSet = Utils.unescapeValue(socket.bufferArray.shift() || '');
                    }
                    resultSet = this._parse(tokenType, socket, tokenSet, dataSet, token, err, queue);
                    switch (resultSet.shift()) {
                        case constants_1.BUFFER:
                            break;
                        case constants_1.FLUSH: {
                            const metaData = socket.metaData.shift();
                            resultSet = queue;
                            if (metaData && metaData.callback) {
                                const parsedResult = constants_1.RESULT_PARSERS.indexOf(metaData.type) > -1
                                    ? this._parseResults(metaData.type, resultSet, err, socket)
                                    : !Array.isArray(queue) || queue.length > 1
                                        ? queue
                                        : queue[0];
                                metaData.execution = Date.now() - metaData.start;
                                this._delegateCallback(metaData, err[0], parsedResult, metaData.callback);
                            }
                            queue.length = err.length = 0;
                            break;
                        }
                        default: {
                            const metaData = socket.metaData.shift();
                            if (metaData && metaData.callback) {
                                metaData.execution = Date.now() - metaData.start;
                                this._delegateCallback(metaData, err[0], resultSet[0], metaData.callback);
                            }
                            err.length = 0;
                            break;
                        }
                    }
                }
                else {
                    const metaData = socket.metaData.shift();
                    if (metaData && metaData.callback) {
                        metaData.execution = Date.now() - metaData.start;
                        this._delegateCallback(metaData, new Error(`Unknown response from the memcached server: ${token}`), false, metaData.callback);
                    }
                }
                if (socket.bufferArray[0] === '') {
                    socket.bufferArray.shift();
                }
            }
        }
    }
    _parse(tokenType, socket, tokenSet, dataSet, token, err, queue) {
        switch (tokenType) {
            case 'NOT_STORED': {
                const errObj = new Error('Item is not stored');
                err.push(errObj);
                return [constants_1.CONTINUE, false];
            }
            case 'ERROR': {
                err.push(new Error('Received an ERROR response'));
                return [constants_1.FLUSH, false];
            }
            case 'CLIENT_ERROR': {
                err.push(new Error(tokenSet.splice(1).join(' ')));
                return [constants_1.CONTINUE, false];
            }
            case 'SERVER_ERROR': {
                this._connectionIssue(tokenSet.splice(1).join(' '), socket);
                return [constants_1.CONTINUE, false];
            }
            case 'END': {
                if (!queue.length) {
                    queue.push(undefined);
                }
                return [constants_1.FLUSH, true];
            }
            case 'VALUE': {
                const key = tokenSet[1];
                const flag = +tokenSet[2];
                const dataLen = tokenSet[3];
                const cas = tokenSet[4];
                const front = socket.metaData.peekFront();
                const multi = (front && front.multi) || cas ? {} : false;
                if (dataLen === '0') {
                    dataSet = '';
                }
                switch (flag) {
                    case constants_1.FLAG_JSON:
                        dataSet = JSON.parse(dataSet);
                        break;
                    case constants_1.FLAG_NUMERIC:
                        dataSet = +dataSet;
                        break;
                    case constants_1.FLAG_BINARY:
                        dataSet = Buffer.from(dataSet, 'binary');
                        break;
                }
                if (!multi) {
                    queue.push(dataSet);
                }
                else {
                    multi[key] = dataSet;
                    if (cas) {
                        multi.cas = cas;
                    }
                    queue.push(multi);
                }
                return [constants_1.BUFFER, false];
            }
            case 'INCRDECR': {
                return [constants_1.CONTINUE, +tokenSet[1]];
            }
            case 'STAT': {
                queue.push([
                    tokenSet[1],
                    /^\d+$/.test(tokenSet[2]) ? +tokenSet[2] : tokenSet[2],
                ]);
                return [constants_1.BUFFER, true];
            }
            case 'VERSION': {
                const versionTokens = /(\d+)(?:\.)(\d+)(?:\.)(\d+)$/.exec(tokenSet[1]);
                return [
                    constants_1.CONTINUE,
                    {
                        server: socket.serverAddress,
                        version: versionTokens[0] || 0,
                        major: versionTokens[1] || 0,
                        minor: versionTokens[2] || 0,
                        bugfix: versionTokens[3] || 0,
                    },
                ];
            }
            case 'ITEM': {
                queue.push({
                    key: tokenSet[1],
                    b: +tokenSet[2].substr(1),
                    s: +tokenSet[4],
                });
                return [constants_1.BUFFER, false];
            }
            case 'CONFIG': {
                return [constants_1.CONTINUE, socket.bufferArray[0]];
            }
            case 'STORED':
            case 'TOUCHED':
            case 'DELETED':
            case 'OK': {
                return [constants_1.CONTINUE, true];
            }
            case 'EXISTS':
            case 'NOT_FOUND':
            default: {
                return [constants_1.CONTINUE, false];
            }
        }
    }
    _parseResults(type, resultSet, err, socket) {
        switch (type) {
            case 'stats': {
                const response = {};
                if (Utils.resultSetIsEmpty(resultSet)) {
                    return response;
                }
                else {
                    response.server = socket.serverAddress;
                    resultSet.forEach((statSet) => {
                        if (statSet) {
                            response[statSet[0]] = statSet[1];
                        }
                    });
                    return response;
                }
            }
            case 'stats settings': {
                return this._parseResults('stats', resultSet, err, socket);
            }
            case 'stats slabs': {
                const response = {};
                if (Utils.resultSetIsEmpty(resultSet)) {
                    return response;
                }
                else {
                    response.server = socket.serverAddress;
                    resultSet.forEach(function each(statSet) {
                        if (statSet) {
                            const identifier = statSet[0].split(':');
                            if (!response[identifier[0]]) {
                                response[identifier[0]] = {};
                            }
                            response[identifier[0]][identifier[1]] = statSet[1];
                        }
                    });
                    return response;
                }
            }
            case 'stats items': {
                const response = {};
                if (Utils.resultSetIsEmpty(resultSet)) {
                    return response;
                }
                else {
                    response.server = socket.serverAddress;
                    resultSet.forEach(function each(statSet) {
                        if (statSet && statSet.length > 1) {
                            const identifier = statSet[0].split(':');
                            if (!response[identifier[1]]) {
                                response[identifier[1]] = {};
                            }
                            response[identifier[1]][identifier[2]] = statSet[1];
                        }
                    });
                    return response;
                }
            }
        }
    }
    _delegateCallback(command, err, result, callback) {
        this._activeQueries -= 1;
        callback(err, result);
    }
}
exports.Memcached = Memcached;
Memcached.config = defaults_1.DEFAULT_CONFIG;
//# sourceMappingURL=memcached.js.map