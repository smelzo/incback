/**
 * Core backup functionality using rsync with incremental hard-link backups
 *
 * This module implements the main backup logic, creating timestamped backup
 * snapshots using rsync's --link-dest feature for space-efficient incremental backups.
 *
 * Backup strategy:
 * - First backup: Full copy to BACKUP-{timestamp}/
 * - Subsequent backups: Changed files are copied; unchanged files are hard-linked
 *   to the previous backup, saving disk space
 *
 * rsync command structure for incremental backups:
 * rsync -az --delete \
 *   --link-dest={remote}[dest]/[previous-backup]/ \
 *   {remote}[src]/ {remote}[dest]/[current-backup]/
 *
 * Command to get the most recent backup directory:
 * ls -dt {remote}[dest]/[BACKUP_PREFIX].../ | head -n 1
 */

import { executeCommand, remoteCommand } from "./exec.js";
import path from "path";
import fs from "fs";
import { getConfig } from "./config.js";
import type { ProgramConfig } from "./types.js";
import { remoteExists } from "./remote-exists.js";

/**
 * Global configuration instance
 */
let config: ProgramConfig;

/**
 * Formats a path for rsync, handling both local and remote paths.
 *
 * For remote paths, returns format: user@host:path
 * For local paths, converts relative paths to absolute (relative to cwd)
 *
 * @param pathStr - The path to format
 * @param isRemote - Whether this is a remote path
 * @returns Formatted path suitable for rsync
 */
function getPath(pathStr: string, isRemote: boolean): string {
    if (isRemote) {
        return `${config.remoteUser}@${config.remoteHost}:${pathStr}`;
    } else {
        if (path.isAbsolute(pathStr)) {
            return pathStr;
        } else {
            // Convert relative paths to absolute (relative to current working directory)
            return path.join(process.cwd(), pathStr);
        }
    }
}

/**
 * Gets the formatted source path for rsync.
 * @returns Source path in rsync format (local absolute path or user@host:path)
 */
function getSrcPath():string {
    return getPath(config.src, config.isRemoteSrc);
}

/**
 * Gets the formatted destination path for rsync.
 * @returns Destination path in rsync format (local absolute path or user@host:path)
 */
function getDestPath():string {
    return getPath(config.dest, config.isRemoteDest);
}
/**
 * Checks if a path exists, handling both local and remote paths.
 *
 * @param pathStr - The path to check
 * @param isRemote - Whether this is a remote path
 * @returns True if the path exists, false otherwise
 */
async function existsPath(pathStr: string, isRemote: boolean): Promise<boolean> {
    if (isRemote) {
        return await remoteExists(config.remoteUser!, config.remoteHost!, pathStr);
    } else {
        return fs.existsSync(pathStr);
    }
}

/**
 * Checks if the configured source path exists.
 * @returns True if source exists, false otherwise
 */
async function existsSrcPath():Promise<boolean>  {
    return await existsPath(config.src, config.isRemoteSrc);
}

/**
 * Checks if the configured destination path exists.
 * @returns True if destination exists, false otherwise
 */
async function existsDestPath():Promise<boolean>  {
    return await existsPath(config.dest, config.isRemoteDest);
}

/**
 * Gets the most recent backup directory in the destination.
 *
 * Uses `ls -dt` to list directories sorted by modification time (newest first),
 * then filters for directories matching BACKUP_PREFIX pattern.
 *
 * @returns The path to the most recent backup directory, or null if none exist
 */
async function getLatestBackupDir(): Promise<string | null> {
    const destPath = config.dest;
    const lsCmd = `ls -dt "${destPath}/${config.backupPrefix??'BACKUP-'}"* | head -n 1`;

    if (config.isRemoteDest) {
        try {
            const result = await remoteCommand(lsCmd, config, false);
            return result ? result.trim() : null;
        } catch (_e) {
            return null;
        }
    } else {
        // For local destinations, check if the directory exists first
        if (!fs.existsSync(destPath)) {
            return null;
        }
        try {
            const result = await executeCommand(lsCmd);
            return result ? result.trim() : null;
        } catch (_e) {
            return null;
        }
    }
}

/**
 * Creates the destination directory if it doesn't exist.
 *
 * Uses `mkdir -p` for remote destinations (via SSH) or fs.mkdirSync for local.
 * The recursive flag ensures parent directories are created as needed.
 *
 * @throws Error if directory creation fails
 */
async function createDestDir():Promise<void>  {
    const destPath = config.dest;
    if (config.isRemoteDest) {
        const mkdirCmd = `mkdir -p "${destPath}"`;
        await remoteCommand(mkdirCmd, config, true);
    } else {
        fs.mkdirSync(destPath, { recursive: true });
    }
}
/**
 * Performs an incremental backup using rsync with hard-link support.
 *
 * This is the main entry point for the backup operation. It:
 * 1. Loads configuration
 * 2. Validates source and destination paths exist (creating destination if needed)
 * 3. Finds the most recent previous backup (if any)
 * 4. Constructs and executes the appropriate rsync command:
 *    - Initial backup: Full copy without --link-dest
 *    - Incremental backup: Uses --link-dest to hard-link unchanged files
 *
 * The backup directory is named with format: BACKUP-{ISO8601-timestamp}
 * Example: BACKUP-2025-11-23T193045
 *
 * rsync flags used:
 * - -a: Archive mode (recursive, preserves permissions, times, etc.)
 * - -v: Verbose output
 * - --delete: Delete files in destination that don't exist in source
 * - --link-dest: Hard-link unchanged files to previous backup (incremental only)
 *
 * @throws Error if source doesn't exist or destination cannot be created
 */
export async function backup(programConfig:ProgramConfig): Promise<void> {
    config = programConfig;
    const logger = config.logger;
    // Generate timestamp suffix for backup directory
    // Format: ISO 8601 without colons, e.g., 2025-11-23T193045
    // Original bash equivalent: DATE=$(date +%F-%H%M%S)
    const suffix = new Date().toISOString().replace(/:/g, "").split(".")[0];

    // Current backup directory name
    const currentBackupDirname = path.join(programConfig.dest, `${config.backupPrefix??'BACKUP-'}${suffix}`)

    // Step 1: Check that source and destination exist
    if (!(await existsSrcPath())) {
        throw new Error(`Source directory "${programConfig.src}" does not exist.`);
    }

    if (!(await existsDestPath())) {
        // If destination doesn't exist, try to create it
        try {
            await createDestDir();
        } catch (_error) {
            throw new Error(`Destination directory "${programConfig.dest}" does not exist and could not be created.`);
        }
    }

    // Step 2: Get the most recent backup directory in destination
    const latestBackupDir = await getLatestBackupDir();
    let rsyncCmd = `rsync -${config.rsyncOptions??'az'} --delete `;
    // Include exclude-from option if specified
    if (programConfig.excludeFrom) {
        rsyncCmd += ` --exclude-from="${programConfig.excludeFrom}" `;
    }
    if (!latestBackupDir) {
        // Initial backup: full copy without hard-linking
        logger.log(`Initial backup to ${getDestPath()}/${path.basename(currentBackupDirname)}`);
        // rsync -az --delete \
        //   {remote}[src]/ {remote}[dest]/[current-backup]/
        rsyncCmd += ` "${getSrcPath()}/" "${getDestPath()}/${path.basename(currentBackupDirname)}/"`;
    } else {
        // Step 3: Build rsync command with --link-dest for incremental backup
        logger.log(`Incremental backup to ${getDestPath()}/${path.basename(currentBackupDirname)} with link-dest to ${programConfig.dest}/${path.basename(latestBackupDir)}`);
        // rsync -az --delete \
        //   --link-dest={remote}[dest]/[previous-backup]/ \
        //   {remote}[src]/ {remote}[dest]/[current-backup]/
        rsyncCmd += ` --link-dest="../${path.basename(latestBackupDir)}/" `;
        rsyncCmd += ` "${getSrcPath()}/" "${getDestPath()}/${path.basename(currentBackupDirname)}/"`;
    }

    // Step 4: Execute the rsync command
    logger.log("Executing command:" + rsyncCmd);
    await executeCommand(rsyncCmd);
}
export async function backupRun(): Promise<void> {
    const config = getConfig();
    await backup(config);
}