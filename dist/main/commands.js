"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMMAND = void 0;
exports.makeCommand = makeCommand;
const Utils = require("./utils");
exports.DEFAULT_COMMAND = {
    key: '',
    value: null,
    callback: (err, data) => { },
    lifetime: 0,
    validate: [],
    type: 'touch',
    command: '',
    redundancyEnabled: false,
    multi: false,
    cas: '',
    start: 0,
    execution: 0,
};
function makeCommand(options) {
    return Utils.merge(exports.DEFAULT_COMMAND, options);
}
//# sourceMappingURL=commands.js.map