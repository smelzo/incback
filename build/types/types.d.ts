/**
 * Type definitions for incback configuration
 */
import type { Logger } from "./logger.js";
/**
 * Program options that can be provided via CLI arguments or configuration file.
 * These define the source, destination, and optional remote connection details.
 */
export interface ProgramOptions {
    /**
     * Source path for the backup.
     * CLI flag: -s | --src
     * Example: /www/my_files
     */
    src: string;
    /**
     * Destination path where backups will be stored.
     * CLI flag: -d | --dest
     * Example: /www/backup
     */
    dest: string;
    /**
     * Specifies which path (source or destination) is on a remote server.
     * CLI flag: -R | --remote-role <src|dest>
     * Optional: Only required for remote backups
     */
    remoteRole?: 'src' | 'dest';
    /**
     * Username for SSH connection to the remote server.
     * CLI flag: -U | --remote-user <user>
     * Required if remoteRole is specified
     */
    remoteUser?: string;
    /**
     * Hostname or IP address of the remote server.
     * CLI flag: -H | --remote-host <host>
     * Required if remoteRole is specified
     */
    remoteHost?: string;
    /**
    * Optional path to a file containing patterns to exclude from backup.
    * CLI flag: -e | --exclude-from <file>
    */
    excludeFrom?: string;
    /**
     * Optional path to a log file where backup logs will be written.
     * CLI flag: -l | --log-file <file>
     */
    logFile?: string;
    /**
     * Optional prefix for backup directories defaults to "BACKUP-"
     * CLI flag: -p | --backup-prefix <prefix>
     */
    backupPrefix?: string;
    /**
     * Rsync flags to use for the backup.
     * only flags admitted by incback are "a" "z" and "c" and default is "az"
     * CLI flag: -o | --rsync-options <options>
     */
    rsyncOptions?: string;
}
/**
 * Internal configuration object with computed boolean flags.
 * Extends ProgramOptions with additional derived properties for easier logic handling.
 */
export interface ProgramConfig extends ProgramOptions {
    /**
     * True if the source path is on a remote server (remoteRole === 'src')
     */
    isRemoteSrc: boolean;
    /**
     * True if the destination path is on a remote server (remoteRole === 'dest')
     */
    isRemoteDest: boolean;
    logger: Logger;
}
