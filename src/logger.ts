import fs from "fs";
import path from "path";
import type {  ProgramOptions } from "./types.js";
let loggerInstance: Logger | null = null;
/**
 * Logger class for logging messages to console and optionally to a file.
 */
export class Logger {
    private logFilePath: string | null;
    private stream: fs.WriteStream | null = null;

    constructor(logFilePath: string | null = null) {
        this.logFilePath = logFilePath;
        if (this.logFilePath) {
            if (!path.isAbsolute(this.logFilePath)) {
                this.logFilePath = path.join(process.cwd(), this.logFilePath);
            }
            try {
                fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
                this.stream = fs.createWriteStream(this.logFilePath, { flags: "a" });
                this.stream.on("error", (error) => {
                    console.error(`Logger file write failed (${this.logFilePath}):`, error);
                    this.stream = null;
                });
            } catch (error) {
                console.error(`Logger initialization failed (${this.logFilePath}):`, error);
                this.stream = null;
            }
        }
    }

    private _log(message: string, logType: 'log' | 'error' | 'warn'): void {
        const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
        console[logType](timestampedMessage);
        if (this.stream) {
            this.stream.write(`${logType} - ${timestampedMessage}\n`);
        }
    }
    public log(message: string): void {
        this._log(message, 'log');
    }

    public error(message: string): void {
        this._log(message, 'error');
    }

    public warn(message: string): void {
        this._log(message, 'warn');
    }
}

export function getLogger(config:ProgramOptions): Logger {
    if (!loggerInstance) {
        const logFilePath = config.logFile ?? null;
        loggerInstance = new Logger(logFilePath);
    }
    return loggerInstance;
}   
