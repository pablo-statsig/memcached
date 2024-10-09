import { EventEmitter } from 'events';
export interface IIssueLogOptions {
    failOverServers: Array<string>;
    failures: number;
    server: string;
    tokens: Array<string>;
    reconnect: number;
    retry: number;
    remove: boolean;
    failuresTimeout: number;
}
export interface IIssueLogDetails {
    server: string;
    tokens: Array<string>;
    messages: Array<string>;
}
export interface IFailueDetails extends IIssueLogDetails {
    failures: number;
    totalFailures: number;
}
export interface ISuccessDetails extends IIssueLogDetails {
    totalReconnectsAttempted: number;
    totalReconnectsSuccess: number;
    totalReconnectsFailed: number;
    totalDownTime: number;
}
export type IssueLogDetails = IFailueDetails | ISuccessDetails;
export declare class IssueLog extends EventEmitter {
    failed: boolean;
    failOverServers: Array<string> | null;
    private args;
    private config;
    private messages;
    private locked;
    private isScheduledToReconnect;
    private totalFailures;
    private totalReconnectsAttempted;
    private totalReconnectsSuccess;
    private failuresResetId;
    constructor(args: IIssueLogOptions);
    log(message: string): void;
    failuresReset(): void;
    get details(): IssueLogDetails;
    attemptRetry(): void;
    attemptReconnect(): void;
}
