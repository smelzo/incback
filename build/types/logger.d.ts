import type { ProgramOptions } from "./types.js";
/**
 * Logger class for logging messages to console and optionally to a file.
 */
export declare class Logger {
    private logFilePath;
    private stream;
    constructor(logFilePath?: string | null);
    private _log;
    log(message: string): void;
    error(message: string): void;
    warn(message: string): void;
}
export declare function getLogger(config: ProgramOptions): Logger;
