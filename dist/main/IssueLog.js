"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueLog = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const Utils = require("./utils");
function ping(host, callback) {
    const isWin = process.platform.indexOf('win') === 0;
    const arg = isWin ? '-n' : '-c';
    const pong = (0, child_process_1.spawn)('ping', [arg, '3', host]);
    pong.stdout.on('data', (data) => {
        callback(false, data.toString().split('\n')[0].substr(14));
        pong.kill();
    });
    pong.stderr.on('data', (data) => {
        callback(new Error(data.toString().split('\n')[0].substr(14)), false);
        pong.kill();
    });
}
class IssueLog extends events_1.EventEmitter {
    constructor(args) {
        super();
        this.failOverServers = null;
        this.failuresResetId = null;
        this.args = JSON.stringify(args);
        this.config = Utils.merge({}, args);
        this.messages = [];
        this.failed = false;
        this.locked = false;
        this.isScheduledToReconnect = false;
        this.failOverServers = args.failOverServers || null;
        this.totalFailures = 0;
        this.totalReconnectsAttempted = 0;
        this.totalReconnectsSuccess = 0;
    }
    log(message) {
        this.failed = true;
        this.messages.push(message || 'No message specified');
        if (this.config.failures && this.config.failures === JSON.parse(this.args).failures) {
            this.failuresResetId = setTimeout(() => {
                this.failuresReset();
            }, this.config.failuresTimeout);
        }
        if (this.config.failures && !this.locked) {
            this.locked = true;
            setTimeout(() => {
                this.attemptRetry();
            }, this.config.retry);
            this.emit('issue', this.details);
        }
        else {
            if (this.failuresResetId) {
                clearTimeout(this.failuresResetId);
            }
            if (this.config.remove) {
                this.emit('remove', this.details);
            }
            else if (!this.isScheduledToReconnect) {
                this.isScheduledToReconnect = true;
                setTimeout(() => {
                    this.attemptReconnect();
                }, this.config.reconnect);
            }
        }
    }
    failuresReset() {
        this.config = Utils.merge({}, JSON.parse(this.args));
    }
    get details() {
        if (this.config.failures) {
            return {
                server: this.config.server,
                tokens: this.config.tokens,
                messages: this.messages,
                failures: this.config.failures,
                totalFailures: this.totalFailures,
            };
        }
        else {
            const totalReconnectsFailed = this.totalReconnectsAttempted - this.totalReconnectsSuccess;
            const totalDownTime = (totalReconnectsFailed * this.config.reconnect) + (this.totalFailures * this.config.retry);
            return {
                server: this.config.server,
                tokens: this.config.tokens,
                messages: this.messages,
                totalReconnectsAttempted: this.totalReconnectsAttempted,
                totalReconnectsSuccess: this.totalReconnectsSuccess,
                totalReconnectsFailed,
                totalDownTime,
            };
        }
    }
    attemptRetry() {
        this.totalFailures += 1;
        this.config.failures -= 1;
        this.failed = false;
        this.locked = false;
    }
    attemptReconnect() {
        const self = this;
        this.totalReconnectsAttempted++;
        this.emit('reconnecting', this.details);
        ping(this.config.tokens[1], (err) => {
            if (err) {
                self.messages.push(err.message || 'No message specified');
                return setTimeout(self.attemptReconnect.bind(self), self.config.reconnect);
            }
            self.emit('reconnected', self.details);
            self.totalReconnectsSuccess++;
            self.messages.length = 0;
            self.failed = false;
            self.isScheduledToReconnect = false;
            Utils.merge(self, JSON.parse(JSON.stringify(self.config)));
        });
    }
}
exports.IssueLog = IssueLog;
//# sourceMappingURL=IssueLog.js.map