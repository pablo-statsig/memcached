"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArg = validateArg;
exports.fuse = fuse;
exports.merge = merge;
exports.escapeValue = escapeValue;
exports.unescapeValue = unescapeValue;
exports.resultSetIsEmpty = resultSetIsEmpty;
const crypto_1 = require("crypto");
const toString = Object.prototype.toString;
function validateArg(args, config) {
    let err;
    args.validate.forEach((tokens) => {
        const key = tokens[0];
        const value = args[key];
        switch (tokens[1]) {
            case Number:
                if (toString.call(value) !== '[object Number]') {
                    err = `Argument "${key}" is not a valid Number.`;
                }
                break;
            case Boolean:
                if (toString.call(value) !== '[object Boolean]') {
                    err = `Argument "${key}" is not a valid Boolean.`;
                }
                break;
            case Array:
                if (toString.call(value) !== '[object Array]') {
                    err = `Argument "${key}" is not a valid Array.`;
                }
                else if (!err && key === 'key') {
                    for (let vKey = 0; vKey < value.length; vKey++) {
                        const vValue = value[vKey];
                        const result = validateKeySize(config, vKey, vValue);
                        if (result.err) {
                            err = result.err;
                        }
                        else {
                            args.command = args.command.replace(vValue, result.value);
                        }
                    }
                }
                break;
            case Object:
                if (toString.call(value) !== '[object Object]') {
                    err = `Argument "${key}" is not a valid Object.`;
                }
                break;
            case Function:
                if (toString.call(value) !== '[object Function]') {
                    err = `Argument "${key}" is not a valid Function.`;
                }
                break;
            case String:
                if (toString.call(value) !== '[object String]') {
                    err = `Argument "${key}" is not a valid String.`;
                }
                else if (!err && key === 'key') {
                    const result = validateKeySize(config, key, value);
                    if (result.err) {
                        err = result.err;
                    }
                    else {
                        args.command = args.command.replace(value, result.value);
                    }
                }
                break;
            default:
                if (toString.call(value) === '[object global]' && !(2 in tokens)) {
                    err = `Argument "${key}" is not defined.`;
                }
        }
    });
    if (err) {
        if (args.callback) {
            args.callback(new Error(err), undefined);
        }
        return false;
    }
    return true;
}
function validateKeySize(config, key, value) {
    if (value.length > config.maxKeySize) {
        if (config.keyCompression) {
            return { err: false, value: (0, crypto_1.createHash)('md5').update(value).digest('hex') };
        }
        else {
            return { err: `Argument "${key}" is longer than the maximum allowed length of ${config.maxKeySize}` };
        }
    }
    else if (/[\s\n\r]/.test(value)) {
        return { err: 'The key should not contain any whitespace or new lines' };
    }
    else {
        return { err: false, value };
    }
}
function fuse(target, handlers) {
    for (const i in handlers) {
        if (handlers.hasOwnProperty(i)) {
            target.on(i, handlers[i]);
        }
    }
}
function merge(...objs) {
    const target = {};
    for (const obj of objs) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                target[key] = obj[key];
            }
        }
    }
    return target;
}
function escapeValue(value) {
    return value.replace(/(\r|\n)/g, '\\$1');
}
function unescapeValue(value) {
    return value.replace(/\\(\r|\n)/g, '$1');
}
function resultSetIsEmpty(resultSet) {
    return !resultSet || (resultSet.length === 1 && !resultSet[0]);
}
//# sourceMappingURL=utils.js.map