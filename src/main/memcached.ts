import * as Utils from "./utils";

import {
  BUFFER,
  CONTINUE,
  FLAG_BINARY,
  FLAG_JSON,
  FLAG_NUMERIC,
  FLUSH,
  LINEBREAK,
  NOREPLY,
  RESULT_PARSERS,
  TOKEN_TYPES,
} from "./constants";
import {
  CallbackFunction,
  ErrorValue,
  IMemcachedConfig,
  MemcachedOptions,
  ParseResult,
  Servers,
} from "./types";
import {
  CommandCompiler,
  CommandOptions,
  CommandType,
  IMemcachedCommand,
  ValidationItems,
  makeCommand,
} from "./commands";
import { IIssueLogDetails, IssueLog } from "./IssueLog";

import { DEFAULT_CONFIG } from "./defaults";
import { EventEmitter } from "events";
import { Socket } from "net";

import Deque = require("double-ended-queue");
import HashRing = require("hashring");
import Jackpot = require("jackpot");

const ALL_COMMANDS = new RegExp("^(?:" + TOKEN_TYPES.join("|") + "|\\d" + ")");
const BUFFERED_COMMANDS = new RegExp("^(?:" + TOKEN_TYPES.join("|") + ")");

interface IConnectionMap {
  [name: string]: Jackpot<MemcachedSocket>;
}

class MemcachedSocket extends Socket {
  public streamID: number;
  public metaData: Deque<IMemcachedCommand>;
  public responseBuffer: string;
  public bufferArray: Array<string>;
  public serverAddress: string;
  public tokens: Array<any>;
  public memcached: Memcached;

  constructor(id: number, server: string, memcached: Memcached) {
    super();
    this.streamID = id;
    this.metaData = new Deque<IMemcachedCommand>();
    this.responseBuffer = "";
    this.bufferArray = [];
    this.tokens = [];
    this.serverAddress = server;
    this.memcached = memcached;
  }
}

interface IConnectionLike {
  serverAddress: string;
  tokens: Array<string>;
  end?: () => void;
}

interface IIssueMap {
  [name: string]: IssueLog;
}

type ConnectionCallback = (
  error?: ErrorValue,
  socket?: MemcachedSocket
) => void;

export class Memcached extends EventEmitter {
  public static config: IMemcachedConfig = DEFAULT_CONFIG;

  private _config: IMemcachedConfig;
  private _hashRing: HashRing;
  private _activeQueries: number;
  private _servers: Array<string>;
  private _issues: IIssueMap;
  private _connections: IConnectionMap;

  constructor(servers: Servers, options: Partial<IMemcachedConfig> = {}) {
    super();
    this._config = Utils.merge(Memcached.config, options);
    this._hashRing = new HashRing(servers);
    this._activeQueries = 0;
    this._servers = [];
    this._issues = {};
    this._connections = {};

    if (Array.isArray(servers)) {
      this._servers = servers;
    } else if (typeof servers === "object") {
      this._servers = Object.keys(servers);
    } else if (typeof servers === "string") {
      this._servers.push(servers);
    }
  }

  public end(): void {
    Object.keys(this._connections).forEach((key: string) => {
      this._connections[key].end();
    });
  }

  public touch(key: string, ttl: number, callback: CallbackFunction): void {
    const fullkey = `${this._config.namespace}${key}`;
    this._executeCommand(
      (): CommandOptions => ({
        key: fullkey,
        callback,
        lifetime: ttl,
        validate: [
          ["key", String],
          ["lifetime", Number],
          ["callback", Function],
        ],
        type: "touch",
        command: `touch ${fullkey} ${ttl}`,
      })
    );
  }

  public set(key: string, value: any, callback: CallbackFunction): void;
  public set(
    key: string,
    value: any,
    ttl: number,
    callback: CallbackFunction
  ): void;
  public set(...args: Array<any>): void {
    const key: string = args[0];
    const value: any = args[1];
    let ttl: number = this._config.defaultTTL;
    let callback: CallbackFunction = args[2];

    if (typeof args[2] === "number") {
      ttl = args[2];
      callback = args[3];
    }

    this._setters("set", key, value, ttl, callback);
  }

  public add(key: string, value: any, callback: CallbackFunction): void;
  public add(
    key: string,
    value: any,
    ttl: number,
    callback: CallbackFunction
  ): void;
  public add(...args: Array<any>): void {
    const key: string = args[0];
    const value: any = args[1];
    let ttl: number = this._config.defaultTTL;
    let callback: CallbackFunction = args[2];

    if (typeof args[2] === "number") {
      ttl = args[2];
      callback = args[3];
    }

    this._setters("add", key, value, ttl, callback);
  }

  // check and set
  public cas(
    key: string,
    value: any,
    cas: string,
    callback: CallbackFunction
  ): void;
  public cas(
    key: string,
    value: any,
    cas: string,
    ttl: number,
    callback: CallbackFunction
  ): void;
  public cas(...args: Array<any>): void {
    const key: string = args[0];
    const value: any = args[1];
    const cas: string = args[2];
    let ttl: number = this._config.defaultTTL;
    let callback: CallbackFunction = args[3];

    if (typeof args[3] === "number") {
      ttl = args[3];
      callback = args[4];
    }

    this._setters("cas", key, value, ttl, callback, cas);
  }

  public del(key: string, callback: CallbackFunction): void {
    const fullkey = `${this._config.namespace}${key}`;
    this._executeCommand((noreply) => ({
      key: fullkey,
      callback,
      validate: [
        ["key", String],
        ["callback", Function],
      ],
      type: "delete",
      redundancyEnabled: true,
      command: "delete " + fullkey + (noreply ? NOREPLY : ""),
    }));
  }

  public delete(key: string, callback: CallbackFunction): void {
    this.del(key, callback);
  }

  public get<T = any>(
    key: string | Array<string>,
    callback: CallbackFunction<T>
  ): void {
    if (Array.isArray(key)) {
      this.getMulti(key, callback);
    } else {
      const fullkey = `${this._config.namespace}${key}`;
      this._executeCommand(
        (noreply: boolean): CommandOptions => ({
          key: fullkey,
          callback,
          validate: [
            ["key", String],
            ["callback", Function],
          ],
          type: "get",
          command: `get ${fullkey}`,
        })
      );
    }
  }

  // the difference between get and gets is that gets, also returns a cas value
  // and gets doesn't support multi-gets at this moment.
  public gets(key: string, callback: CallbackFunction): void {
    const fullkey = `${this._config.namespace}${key}`;
    this._executeCommand(
      (noreply: boolean): CommandOptions => ({
        key: fullkey,
        callback,
        validate: [
          ["key", String],
          ["callback", Function],
        ],
        type: "gets",
        command: `gets ${fullkey}`,
      })
    );
  }

  // Handles get's with multiple keys
  public getMulti(keys: Array<string>, callback: CallbackFunction): void {
    const errors: Array<Error> = [];
    let calls: number = 0;
    let responses: any = {};

    keys = keys.map((key: string): string => {
      return `${this._config.namespace}${key}`;
    });

    // handle multiple responses and cache them untill we receive all.
    const handle: CallbackFunction = (err: Error, results: any) => {
      if (err) {
        errors.push(err);
      }

      // add all responses to the array
      (Array.isArray(results) ? results : [results]).forEach((value: any) => {
        if (value && this._config.namespace.length) {
          const nsKey: string = Object.keys(value)[0];
          const newvalue: { [key: string]: any } = {};

          newvalue[nsKey.replace(this._config.namespace, "")] = value[nsKey];
          responses = Utils.merge(responses, newvalue);
        } else {
          responses = Utils.merge(responses, value);
        }
      });

      if (--calls <= 0) {
        callback(errors.length ? errors : undefined, responses);
      }
    };

    this._multi(
      keys,
      (
        server: string,
        key: Array<string>,
        index: number,
        totals: number
      ): void => {
        if (calls === 0) {
          calls = totals;
        }

        this._executeCommand(
          (noreply: boolean): CommandOptions => ({
            callback: handle,
            multi: true,
            type: "get",
            command: `get ${key.join(" ")}`,
            key: keys,
            validate: [
              ["key", Array],
              ["callback", Function],
            ],
          }),
          server
        );
      }
    );
  }

  public incr(key: string, value: number, callback: CallbackFunction): void {
    this._incrdecr("incr", key, value, callback);
  }

  public increment(
    key: string,
    value: number,
    callback: CallbackFunction
  ): void {
    this.incr(key, value, callback);
  }

  public decr(key: string, value: number, callback: CallbackFunction): void {
    this._incrdecr("decr", key, value, callback);
  }

  public decrement(
    key: string,
    value: number,
    callback: CallbackFunction
  ): void {
    this.decr(key, value, callback);
  }

  // You need to use the items dump to get the correct server and slab settings
  // see simple_cachedump.js for an example
  public cachedump(
    server: string,
    slabid: number,
    num: number,
    callback: CallbackFunction
  ) {
    this._executeCommand(
      (noreply) => ({
        callback,
        number: num,
        slabid,
        validate: [
          ["number", Number],
          ["slabid", Number],
          ["callback", Function],
        ],
        type: "stats cachedump",
        command: `stats cachedump ${slabid} ${num}`,
      }),
      server
    );
  }

  public version(callback: CallbackFunction): void {
    this._singles("version", callback);
  }

  public flush(callback: CallbackFunction): void {
    this._singles("flush_all", callback);
  }

  public flushAll(callback: CallbackFunction): void {
    this.flush(callback);
  }

  public stats(callback: CallbackFunction): void {
    this._singles("stats", callback);
  }

  public settings(callback: CallbackFunction): void {
    this._singles("stats settings", callback);
  }

  public statsSettings(callback: CallbackFunction): void {
    this.settings(callback);
  }

  public slabs(callback: CallbackFunction): void {
    this._singles("stats slabs", callback);
  }

  public statsSlabs(callback: CallbackFunction): void {
    this.slabs(callback);
  }

  public items(callback: CallbackFunction): void {
    this._singles("stats items", callback);
  }

  public statsItems(callback: CallbackFunction): void {
    this.items(callback);
  }

  private _singles(type: CommandType, callback: CallbackFunction) {
    let responses: Array<any> = [];
    let errors: Array<Error>;
    let calls: number = 0;

    // handle multiple servers
    const handle = (err: ErrorValue, results: Array<any>): void => {
      if (err) {
        errors = errors || [];
        errors = errors.concat(err);
      }

      if (results) {
        responses = responses.concat(results);
      }

      // multi calls should ALWAYS return an array!
      if (!--calls) {
        callback(errors && errors.length ? errors.pop() : undefined, responses);
      }
    };

    this._multi([], (server, keys, index, totals) => {
      if (!calls) {
        calls = totals;
      }

      this._executeCommand(
        (noreply) => ({
          callback: handle,
          type,
          command: type,
        }),
        server
      );
    });
  }

  private _incrdecr(
    type: "incr" | "decr",
    key: string,
    value: number,
    callback: CallbackFunction
  ) {
    const fullkey = `${this._config.namespace}${key}`;
    this._executeCommand((noreply) => ({
      key: fullkey,
      callback,
      value,
      validate: [
        ["key", String],
        ["value", Number],
        ["callback", Function],
      ],
      type,
      redundancyEnabled: true,
      command: [type, fullkey, value].join(" ") + (noreply ? NOREPLY : ""),
    }));
  }

  // As all command nearly use the same syntax we are going to proxy them all to
  // this function to ease maintenance. This is possible because most set
  // commands will use the same syntax for the Memcached server. Some commands
  // do not require a lifetime and a flag, but the memcached server is smart
  // enough to ignore those.
  private _setters(
    type: CommandType,
    key: string,
    value: any,
    lifetime: number,
    callback: CallbackFunction,
    cas: string = ""
  ): void {
    const fullKey = `${this._config.namespace}${key}`;
    let flag: number = 0;
    const valuetype: string = typeof value;

    if (Buffer.isBuffer(value)) {
      flag = FLAG_BINARY;
      value = value.toString("binary");
    } else if (valuetype === "number") {
      flag = FLAG_NUMERIC;
      value = value.toString();
    } else if (valuetype !== "string") {
      flag = FLAG_JSON;
      value = JSON.stringify(value);
    }

    value = Utils.escapeValue(value);

    const length: number = Buffer.byteLength(value);

    if (length > this._config.maxValue) {
      this._errorResponse(
        new Error(
          `The length of the value is greater than ${this._config.maxValue}`
        ),
        callback
      );
    } else {
      this._executeCommand(
        (noreply): CommandOptions => ({
          key: fullKey,
          callback,
          lifetime,
          value,
          cas,
          validate: [
            ["key", String],
            ["value", String],
            ["lifetime", Number],
            ["callback", Function],
          ],
          type,
          redundancyEnabled: false,
          command:
            [type, fullKey, flag, lifetime, length].join(" ") +
            (cas ? ` ${cas}` : "") +
            (noreply ? NOREPLY : "") +
            LINEBREAK +
            value,
        })
      );
    }
  }

  private _errorResponse(error: Error, callback: CallbackFunction): boolean {
    if (typeof callback === "function") {
      this._makeCallback(callback, error, false);
    }

    return false;
  }

  private _makeCallback(
    callback: CallbackFunction,
    err?: ErrorValue,
    value?: any
  ): void {
    this._activeQueries--;
    callback(err, value); // loose first
  }

  // Creates a multi stream, so it's easier to query agains multiple memcached
  // servers.
  private _multi(
    keys: Array<string>,
    callback: (
      server: string,
      key: Array<string>,
      index: number,
      totals: number
    ) => void
  ): void {
    const map: { [name: string]: Array<string> } = {};
    let servers;
    let i;

    // gets all servers based on the supplied keys,
    // or just gives all servers if we don't have keys
    if (keys && keys.length > 0) {
      keys.forEach((key: string): void => {
        const server: string =
          this._servers.length === 1
            ? this._servers[0]
            : this._hashRing.get(key);

        if (map[server]) {
          map[server].push(key);
        } else {
          map[server] = [key];
        }
      });

      // store the servers
      servers = Object.keys(map);
    } else {
      servers = this._servers;
    }

    i = servers.length;

    while (i--) {
      callback(servers[i], map[servers[i]], i, servers.length);
    }
  }

  private _failedServers(): Array<string> {
    const result: Array<string> = [];

    for (const server in this._issues) {
      if (this._issues[server].failed) {
        result.push(server);
      }
    }

    return result;
  }

  private _executeCommand(compiler: CommandCompiler, server?: string): void {
    this._activeQueries += 1;
    const command: IMemcachedCommand = makeCommand(compiler());

    if (
      this._activeQueries > this._config.maxQueueSize &&
      this._config.maxQueueSize > 0
    ) {
      this._makeCallback(command.callback, new Error("over queue limit"), null);
    } else if (command.validate && !Utils.validateArg(command, this._config)) {
      this._activeQueries -= 1;
    } else {
      // generate a regular query,
      const redundancy = this._config.redundancy < this._servers.length;
      const queryRedundancy = command.redundancyEnabled;
      let redundants: Array<string> = [];

      if (redundancy && queryRedundancy) {
        redundants = this._hashRing.range(
          command.key,
          this._config.redundancy + 1,
          true
        );
      }

      // try to find the correct server for this query
      if (server === undefined) {
        // no need to do a hashring lookup if we only have one server assigned to
        // us
        if (this._servers.length === 1) {
          server = this._servers[0];
        } else {
          if (redundancy && queryRedundancy) {
            server = redundants.shift();
          } else {
            server = this._hashRing.get(command.key);
          }
        }
      }

      // check if any server exists or and if the server is still alive
      // a server may not exist if the manager was never able to connect
      // to any server.
      if (
        server === undefined ||
        (server in this._issues && this._issues[server].failed)
      ) {
        if (command.callback) {
          const failedServers: string = this._failedServers().join();
          this._makeCallback(
            command.callback,
            new Error(`Server at ${failedServers} not available`)
          );
        }
      } else if (server !== undefined) {
        this._connect(
          server,
          (error: ErrorValue, socket: MemcachedSocket): void => {
            if (this._config.debug) {
              command.command.split(LINEBREAK).forEach((line) => {
                console.log(socket.streamID + " << " + line);
              });
            }

            // S not set if unable to connect to server
            if (!socket) {
              const connectionLike: IConnectionLike = {
                serverAddress: server!,
                tokens: server!.split(":").reverse(),
              };
              const message = `Unable to connect to socket[${server}]`;
              error = error || new Error(message);
              this._connectionIssue(error.toString(), connectionLike);

              if (command.callback) {
                this._makeCallback(command.callback, error);
              }
            } else {
              // Other errors besides inability to connect to server
              if (error) {
                this._connectionIssue(error.toString(), socket);
                if (command.callback) {
                  this._makeCallback(command.callback, error);
                }
              } else if (!socket.writable) {
                error = new Error(
                  `Unable to write to socket[${socket.serverAddress}]`
                );
                this._connectionIssue(error.toString(), socket);

                if (command.callback) {
                  this._makeCallback(command.callback, error);
                }
              } else {
                // used for request timing
                command.start = Date.now();
                socket.metaData.push(command);
                const commandString: string = `${command.command}${LINEBREAK}`;
                socket.write(commandString);
              }
            }
          }
        );
      }
    }
  }

  private _connectionIssue(error: string, socket: IConnectionLike): void {
    if (socket && socket.end) {
      socket.end();
    }

    let issues;
    const server = socket.serverAddress;
    const memcached = this;

    // check for existing issue logs, or create a new log
    if (server in this._issues) {
      issues = this._issues[server];
    } else {
      issues = this._issues[server] = new IssueLog({
        server,
        tokens: socket.tokens,
        reconnect: this._config.reconnect,
        failures: this._config.failures,
        failuresTimeout: this._config.failuresTimeout,
        retry: this._config.retry,
        remove: this._config.remove,
        failOverServers: this._config.failOverServers,
      });

      // proxy the events
      Utils.fuse(issues, {
        issue: function issue(details: IIssueLogDetails) {
          memcached.emit("issue", details);
        },
        failure: function failure(details: IIssueLogDetails) {
          memcached.emit("failure", details);
        },
        reconnecting: function reconnect(details: IIssueLogDetails) {
          memcached.emit("reconnecting", details);
        },
        reconnected: function reconnected(details: IIssueLogDetails) {
          memcached.emit("reconnect", details);
        },
        remove: function remove(details: IIssueLogDetails) {
          // emit event and remove servers
          memcached.emit("remove", details);
          memcached._connections[server].end();

          if (memcached._config.failOverServers.length > 0) {
            memcached._hashRing.swap(
              server,
              memcached._config.failOverServers.shift()!
            );
          } else {
            memcached._hashRing.remove(server);
            memcached.emit("failure", details);
          }
        },
      });

      // bumpt the event listener limit
      issues.setMaxListeners(0);
    }

    // log the issue
    issues.log(error);
  }

  // Creates or generates a new connection for the give server, the callback
  // will receive the connection if the operation was successful
  private _connect(server: string, callback: ConnectionCallback): void {
    // Default port to 11211
    if (!server.match(/(.+):(\d+)$/)) {
      server = `${server}:11211`;
    }

    // server is dead, bail out
    if (server in this._issues && this._issues[server].failed) {
      return callback();
    } else {
      // fetch from connection pool
      if (server in this._connections) {
        this._connections[server].pull(callback);
      } else {
        // No connection factory created yet, so we must build one
        const serverTokens: Array<string> =
          Array.isArray(server) && server[0] === "/"
            ? server
            : /(.*):(\d+){1,}$/.exec(server)!.reverse();

        // Pop original string from array
        if (Array.isArray(serverTokens)) {
          serverTokens.pop();
        }

        let sid: number = 0;

        /**
         * Generate a new connection pool manager.
         */

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
          const streamError = (e: Error) => {
            this._connectionIssue(e.toString(), socket);
            manager.remove(socket);
          };

          // config the Stream
          socket.setTimeout(this._config.timeout);
          socket.setNoDelay(true);
          socket.setEncoding("utf8");
          socket.tokens = [...serverTokens];

          // Add the event listeners
          Utils.fuse(socket, {
            close: () => {
              manager.remove(socket);
            },
            data: (data: Buffer) => {
              this._buffer(socket, data);
            },
            connect: () => {
              // Jackpot handles any pre-connect timeouts by calling back
              // with the error object.
              socket.setTimeout(socket.memcached._config.idle, idleTimeout);
              // Jackpot handles any pre-connect errors, but does not handle errors
              // once a connection has been made, nor does Jackpot handle releasing
              // connections if an error occurs post-connect
              socket.on("error", streamError);
            },
            end: socket.end,
          });

          // connect the net.Stream (or net.Socket) [port, hostname]
          socket.connect.apply(socket, socket.tokens);
          return socket;
        });

        manager.on("error", (err: Error): void => {
          if (this._config.debug) {
            console.log("Connection error", err);
          }
        });

        this._connections[server] = manager;

        // now that we have setup our connection factory we can allocate a new
        // connection
        this._connections[server].pull(callback);
      }
    }
  }

  private _buffer(socket: MemcachedSocket, buffer: Buffer): void {
    socket.responseBuffer += buffer;

    // only call transform the data once we are sure, 100% sure, that we valid
    // response ending
    if (
      socket.responseBuffer.substr(socket.responseBuffer.length - 2) ===
      LINEBREAK
    ) {
      socket.responseBuffer = `${socket.responseBuffer}`;

      const chunks = socket.responseBuffer.split(LINEBREAK);

      if (this._config.debug) {
        chunks.forEach((line: string): void => {
          console.log(socket.streamID + " >> " + line);
        });
      }

      // Fix zero-line endings in the middle
      const chunkLength = chunks.length - 1;
      if (chunks[chunkLength].length === 0) {
        chunks.splice(chunkLength, 1);
      }

      socket.responseBuffer = ""; // clear!
      socket.bufferArray = socket.bufferArray.concat(chunks);
      this._rawDataReceived(socket);
    }
  }

  private _rawDataReceived(socket: MemcachedSocket): void {
    const queue: Array<any> = [];
    const err: Array<Error> = [];

    while (
      socket.bufferArray.length &&
      ALL_COMMANDS.test(socket.bufferArray[0])
    ) {
      const token: string = socket.bufferArray.shift()!;
      const tokenSet: Array<string> = token.split(" ");
      let dataSet: string | undefined = "";
      let resultSet: any;

      if (/^\d+$/.test(tokenSet[0])) {
        // special case for "config get cluster"
        // Amazon-specific memcached configuration information, see aws
        // documentation regarding adding auto-discovery to your client library.
        // Example response of a cache cluster containing three nodes:
        //   configversion\n
        //   hostname|ip-address|port hostname|ip-address|port hostname|ip-address|port\n\r\n
        if (
          /(([-.a-zA-Z0-9]+)\|(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)\|(\d+))/.test(
            socket.bufferArray[0]
          )
        ) {
          tokenSet.unshift("CONFIG");
        } else {
          tokenSet.unshift("INCRDECR");
        }
      }

      const tokenType: string = tokenSet[0];

      // special case for value, it's required that it has a second response!
      // add the token back, and wait for the next response, we might be
      // handling a big ass response here.
      if (tokenType === "VALUE" && socket.bufferArray.indexOf("END") === -1) {
        socket.bufferArray.unshift(token);
        return;
      } else {
        // check for dedicated parser
        if (TOKEN_TYPES.indexOf(tokenType) > -1) {
          // fetch the response content
          if (tokenType === "VALUE") {
            dataSet = Utils.unescapeValue(socket.bufferArray.shift() || "");
          }

          resultSet = this._parse(
            tokenType,
            socket,
            tokenSet,
            dataSet,
            token,
            err,
            queue
          );

          // check how we need to handle the resultSet response
          switch (resultSet.shift()) {
            case BUFFER:
              break;

            case FLUSH: {
              const metaData = socket.metaData.shift();
              resultSet = queue;

              // if we have a callback, call it
              if (metaData && metaData.callback) {
                const parsedResult = // see if optional parsing needs to be applied to make the result set more readable
                  RESULT_PARSERS.indexOf(metaData.type) > -1
                    ? this._parseResults(metaData.type, resultSet, err, socket)
                    : !Array.isArray(queue) || queue.length > 1
                    ? queue
                    : queue[0];

                metaData.execution = Date.now() - metaData.start;

                this._delegateCallback(
                  metaData,
                  // err.length ? err : err[0],
                  err[0],

                  parsedResult,
                  metaData.callback
                );
              }

              queue.length = err.length = 0;
              break;
            }

            default: {
              const metaData = socket.metaData.shift();

              if (metaData && metaData.callback) {
                metaData.execution = Date.now() - metaData.start;

                this._delegateCallback(
                  metaData,
                  // err.length > 1 ? err : err[0],
                  err[0],
                  resultSet[0],
                  metaData.callback
                );
              }

              err.length = 0;
              break;
            }
          }
        } else {
          // handle unkown responses
          const metaData = socket.metaData.shift();

          if (metaData && metaData.callback) {
            metaData.execution = Date.now() - metaData.start;
            this._delegateCallback(
              metaData,
              new Error(`Unknown response from the memcached server: ${token}`),
              false,
              metaData.callback
            );
          }
        }

        // check if we need to remove an empty item from the array, as splitting on /r/n might cause an empty
        // item at the end..
        if (socket.bufferArray[0] === "") {
          socket.bufferArray.shift();
        }
      }
    }
  }

  private _parse(
    tokenType: string,
    socket: MemcachedSocket,
    tokenSet: Array<string>,
    dataSet: any,
    token: string,
    err: Array<Error>,
    queue: Array<any>
  ): ParseResult {
    switch (tokenType) {
      case "NOT_STORED": {
        const errObj = new Error("Item is not stored");
        errObj.notStored = true;
        err.push(errObj);
        return [CONTINUE, false];
      }

      case "ERROR": {
        err.push(new Error("Received an ERROR response"));
        return [FLUSH, false];
      }

      case "CLIENT_ERROR": {
        err.push(new Error(tokenSet.splice(1).join(" ")));
        return [CONTINUE, false];
      }

      case "SERVER_ERROR": {
        this._connectionIssue(tokenSet.splice(1).join(" "), socket);
        return [CONTINUE, false];
      }

      case "END": {
        if (!queue.length) {
          queue.push(undefined);
        }

        return [FLUSH, true];
      }

      // value parsing:
      case "VALUE": {
        const key = tokenSet[1];
        const flag = +tokenSet[2];
        const dataLen = tokenSet[3]; // length of dataSet in raw bytes,
        const cas = tokenSet[4];
        const front = socket.metaData.peekFront();
        const multi: any = (front && front.multi) || cas ? {} : false;

        // In parse data there is an '||' passing us the content of token
        // if dataSet is empty. This may be fine for other types of responses,
        // in the case of an empty string being stored in a key, it will
        // result in unexpected behavior:
        // https://github.com/3rd-Eden/node-memcached/issues/64
        if (dataLen === "0") {
          dataSet = "";
        }

        switch (flag) {
          case FLAG_JSON:
            dataSet = JSON.parse(dataSet);
            break;

          case FLAG_NUMERIC:
            dataSet = +dataSet;
            break;

          case FLAG_BINARY:
            dataSet = Buffer.from(dataSet, "binary");
            break;
        }

        // Add to queue as multiple get key key key key key returns multiple values
        if (!multi) {
          queue.push(dataSet);
        } else {
          multi[key] = dataSet;

          if (cas) {
            multi.cas = cas;
          }

          queue.push(multi);
        }

        return [BUFFER, false];
      }

      case "INCRDECR": {
        return [CONTINUE, +tokenSet[1]];
      }

      case "STAT": {
        queue.push([
          tokenSet[1],
          /^\d+$/.test(tokenSet[2]) ? +tokenSet[2] : tokenSet[2],
        ]);
        return [BUFFER, true];
      }

      case "VERSION": {
        const versionTokens = /(\d+)(?:\.)(\d+)(?:\.)(\d+)$/.exec(tokenSet[1]);

        return [
          CONTINUE,
          {
            server: socket.serverAddress,
            version: versionTokens![0] || 0,
            major: versionTokens![1] || 0,
            minor: versionTokens![2] || 0,
            bugfix: versionTokens![3] || 0,
          },
        ];
      }

      case "ITEM": {
        queue.push({
          key: tokenSet[1],
          b: +tokenSet[2].substr(1),
          s: +tokenSet[4],
        });

        return [BUFFER, false];
      }

      // Amazon-specific memcached configuration information, used for node
      // auto-discovery.
      case "CONFIG": {
        return [CONTINUE, socket.bufferArray[0]];
      }

      // keyword based responses
      case "STORED":
      case "TOUCHED":
      case "DELETED":
      case "OK": {
        return [CONTINUE, true];
      }

      case "EXISTS":
      case "NOT_FOUND":
      default: {
        return [CONTINUE, false];
      }
    }
  }

  private _parseResults(
    type: string,
    resultSet: Array<any> | undefined,
    err: Array<Error>,
    socket: MemcachedSocket
  ): any {
    switch (type) {
      // combines the stats array, in to an object
      case "stats": {
        const response: any = {};

        if (Utils.resultSetIsEmpty(resultSet)) {
          return response;
        } else {
          // add references to the retrieved server
          response.server = socket.serverAddress;

          // Fill the object
          resultSet!.forEach((statSet) => {
            if (statSet) {
              response[statSet[0]] = statSet[1];
            }
          });

          return response;
        }
      }

      // the settings uses the same parse format as the regular stats
      case "stats settings": {
        return this._parseResults("stats", resultSet, err, socket);
      }

      // Group slabs by slab id
      case "stats slabs": {
        const response: any = {};

        if (Utils.resultSetIsEmpty(resultSet)) {
          return response;
        } else {
          // add references to the retrieved server
          response.server = socket.serverAddress;

          // Fill the object
          resultSet!.forEach(function each(statSet) {
            if (statSet) {
              const identifier = statSet[0].split(":");

              if (!response[identifier[0]]) {
                response[identifier[0]] = {};
              }

              response[identifier[0]][identifier[1]] = statSet[1];
            }
          });

          return response;
        }
      }

      case "stats items": {
        const response: any = {};

        if (Utils.resultSetIsEmpty(resultSet)) {
          return response;
        } else {
          // add references to the retrieved server
          response.server = socket.serverAddress;

          // Fill the object
          resultSet!.forEach(function each(statSet) {
            if (statSet && statSet.length > 1) {
              const identifier = statSet[0].split(":");

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

  private _delegateCallback(
    command: IMemcachedCommand,
    err: Error | undefined,
    result: any,
    callback: CallbackFunction
  ): void {
    this._activeQueries -= 1;
    callback(err, result);
  }
}
