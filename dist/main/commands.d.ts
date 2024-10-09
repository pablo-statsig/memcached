import { CallbackFunction, Key } from './types';
export type NativeConstructor = StringConstructor | NumberConstructor | FunctionConstructor | ArrayConstructor | BooleanConstructor | ObjectConstructor;
export type ValidationItem = [
    string,
    NativeConstructor
];
export type ValidationItems = Array<ValidationItem>;
export type CommandType = 'touch' | 'get' | 'gets' | 'delete' | 'stats cachedump' | 'set' | 'replace' | 'add' | 'cas' | 'append' | 'prepend' | 'incr' | 'decr' | 'version' | 'flush_all' | 'stats' | 'stats settings' | 'stats slabs' | 'stats items';
export type CommandCompiler = (noreply?: boolean) => CommandOptions;
export interface IMemcachedCommand {
    key: Key;
    value: any;
    callback: CallbackFunction;
    lifetime: number;
    validate: ValidationItems;
    type: CommandType;
    command: string;
    redundancyEnabled: boolean;
    multi: boolean;
    cas: string;
    start: number;
    execution: number;
}
export declare const DEFAULT_COMMAND: IMemcachedCommand;
export type CommandOptions = Partial<IMemcachedCommand>;
export declare function makeCommand(options: CommandOptions): IMemcachedCommand;
