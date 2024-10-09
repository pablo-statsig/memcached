import { IMemcachedCommand } from './commands';
import { IMemcachedConfig } from './types';
export declare function validateArg(args: IMemcachedCommand, config: IMemcachedConfig): boolean;
export type EventHandler = (evt: any) => void;
export interface IEventHandlerMap {
    [name: string]: EventHandler;
}
export declare function fuse(target: any, handlers: IEventHandlerMap): void;
export declare function merge<A extends object, B extends object>(obj1: A, obj2: B): A & B;
export declare function merge<A extends object, B extends object, C extends object>(obj1: A, obj2: B, obj3: C): A & B & C;
export declare function escapeValue(value: string): string;
export declare function unescapeValue(value: string): string;
export declare function resultSetIsEmpty(resultSet?: Array<any>): boolean;
