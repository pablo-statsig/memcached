import { CallbackFunction, Key } from './types'
import * as Utils from './utils'

export type NativeConstructor =
    StringConstructor | NumberConstructor | FunctionConstructor |
    ArrayConstructor | BooleanConstructor | ObjectConstructor

export type ValidationItem =
    [ string, NativeConstructor ]

export type ValidationItems =
    Array<ValidationItem>

export type CommandType =
    'touch' | 'get' | 'gets' | 'delete' | 'stats cachedump' |
    'set' | 'replace' | 'add' | 'cas' | 'append' | 'prepend'

export type CommandCompiler =
    (noreply?: boolean) => Partial<IMemcachedCommand>

export interface IMemcachedCommand {
    key: Key
    callback: CallbackFunction
    lifetime: number
    validate: ValidationItems
    type: CommandType
    command: string
    redundancyEnabled: boolean
    multi: boolean
    cas: string
    start: number
    execution: number
}

export const DEFAULT_COMMAND: IMemcachedCommand = {
    key: '',
    callback: (err: Error, data: any): void => {},
    lifetime: 0,
    validate: [],
    type: 'touch',
    command: '',
    redundancyEnabled: false,
    multi: false,
    cas: '',
    start: 0,
    execution: 0,
}

export function makeCommand(options: Partial<IMemcachedCommand>): IMemcachedCommand {
    return Utils.merge(DEFAULT_COMMAND, options)
}
