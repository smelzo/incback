'use strict';

var child_process = require('child_process');
var path = require('path');
var fs = require('fs');
require('commander');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var path__default = /*#__PURE__*/_interopDefault(path);
var fs__default = /*#__PURE__*/_interopDefault(fs);

/**
 * Command execution utilities for local and remote shell operations.
 *
 * This module provides functions to execute shell commands both locally and
 * on remote servers via SSH.
 */
/**
 * Executes a local shell command and returns its output (stdout).
 *
 * @param command - The shell command to execute
 * @returns A Promise that resolves with the command's output (trimmed)
 * @throws Error if the command fails or produces stderr output
 */
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        // Use spawn with shell: true to execute the command string
        // This avoids the maxBuffer limit of exec()
        const child = child_process.spawn(command, { shell: true });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('error', (error) => {
            reject(new Error(`Error executing command "${command}": ${error.message}`));
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Error executing command "${command}": ${stderr || `Process exited with code ${code}`}`));
            }
            else if (stderr) {
                // Maintain original behavior: fail if there is any stderr output
                reject(new Error(`Error executing command "${command}": ${stderr}`));
            }
            else {
                resolve(stdout.trim());
            }
        });
    });
}
/**
 * Escapes a string for safe use in a POSIX shell by wrapping it in single quotes.
 * This prevents expansion of local variables and properly handles spaces and special characters.
 *
 * Single quotes within the string are escaped by ending the quote, adding an escaped
 * single quote, and starting a new quoted string: 'text'\''more text'
 *
 * @param arg - The string to escape
 * @returns The escaped string safe for shell execution
 */
function escapeShellArg(arg) {
    return `'${arg.replace(/'/g, "'\\''")}'`;
}
/**
 * Executes a command on a remote server via SSH.
 *
 * Uses SSH with BatchMode (no password prompts) and a 5-second connection timeout.
 * Both the destination and command are properly escaped to prevent shell injection.
 *
 * @param command - The command to execute on the remote server
 * @param config - Configuration object containing remoteUser and remoteHost
 * @param throwError - If true, throws errors; if false, returns empty string on error
 * @returns A Promise that resolves with the command's output
 * @throws Error if remoteUser or remoteHost are not provided, or if command fails and throwError is true
 */
async function remoteCommand(command, config, throwError = false) {
    const remoteUser = config.remoteUser ?? "";
    const remoteHost = config.remoteHost ?? "";
    if (!remoteHost || !remoteUser) {
        throw new Error("remoteCommand requires remoteUser and remoteHost in configuration");
    }
    // Escape both destination and command to prevent the local shell from interpreting
    // variables or special characters meant for the remote shell
    const destination = `${remoteUser}@${remoteHost}`;
    const sshCommand = `ssh -o BatchMode=yes -o ConnectTimeout=5 ${escapeShellArg(destination)} ${escapeShellArg(command)}`;
    try {
        return await executeCommand(sshCommand);
    }
    catch (error) {
        if (throwError) {
            throw error;
        }
        return "";
    }
}

/**
 * Remote path existence checker via SSH
 *
 * This module provides functionality to check if files or directories exist
 * on remote servers using SSH connections.
 */
/**
 * Checks if a path exists on a remote server via SSH.
 *
 * Uses the `test -e` command on the remote server to check for path existence.
 * The function always returns a boolean - it never throws errors, returning false
 * if the SSH connection fails or the path doesn't exist.
 *
 * The command structure uses `|| echo not_exists` to ensure exit code 0 even when
 * the path doesn't exist, allowing us to distinguish between "path not found" and
 * "SSH connection failed" scenarios.
 *
 * @param remoteUser - SSH username for the remote server
 * @param remoteHost - Hostname or IP address of the remote server
 * @param remotePath - Path to check on the remote server
 * @returns A Promise that resolves to true if the path exists, false otherwise
 *
 * @example
 * ```ts
 * const exists = await remoteExists('user', 'example.com', '/var/www/html');
 * if (exists) {
 *   console.log('Path exists on remote server');
 * }
 * ```
 */
async function remoteExists(remoteUser, remoteHost, remotePath) {
    // Use explicit output ("exists" or "not_exists") to determine result
    // The || operator ensures exit code 0 even when test fails, allowing us to
    // distinguish between connection failures (caught in catch block) and path not found
    const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 ${remoteUser}@${remoteHost} "test -e \\"${remotePath}\\" && echo exists || echo not_exists"`;
    try {
        const stdout = await executeCommand(cmd);
        const exists = stdout.trim() === 'exists';
        return exists;
    }
    catch (_error) {
        // If we end up here, the SSH connection likely failed or the command itself failed
        // In both cases, we return false to indicate the path is not accessible
        return false;
    }
}

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
 * rsync -av --delete \
 *   --link-dest={remote}[dest]/[previous-backup]/ \
 *   {remote}[src]/ {remote}[dest]/[current-backup]/
 *
 * Command to get the most recent backup directory:
 * ls -dt {remote}[dest]/[BACKUP_PREFIX].../ | head -n 1
 */
/**
 * Global configuration instance
 */
let config;
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
function getPath(pathStr, isRemote) {
    if (isRemote) {
        return `${config.remoteUser}@${config.remoteHost}:${pathStr}`;
    }
    else {
        if (path__default.default.isAbsolute(pathStr)) {
            return pathStr;
        }
        else {
            // Convert relative paths to absolute (relative to current working directory)
            return path__default.default.join(process.cwd(), pathStr);
        }
    }
}
/**
 * Gets the formatted source path for rsync.
 * @returns Source path in rsync format (local absolute path or user@host:path)
 */
function getSrcPath() {
    return getPath(config.src, config.isRemoteSrc);
}
/**
 * Gets the formatted destination path for rsync.
 * @returns Destination path in rsync format (local absolute path or user@host:path)
 */
function getDestPath() {
    return getPath(config.dest, config.isRemoteDest);
}
/**
 * Checks if a path exists, handling both local and remote paths.
 *
 * @param pathStr - The path to check
 * @param isRemote - Whether this is a remote path
 * @returns True if the path exists, false otherwise
 */
async function existsPath(pathStr, isRemote) {
    if (isRemote) {
        return await remoteExists(config.remoteUser, config.remoteHost, pathStr);
    }
    else {
        return fs__default.default.existsSync(pathStr);
    }
}
/**
 * Checks if the configured source path exists.
 * @returns True if source exists, false otherwise
 */
async function existsSrcPath() {
    return await existsPath(config.src, config.isRemoteSrc);
}
/**
 * Checks if the configured destination path exists.
 * @returns True if destination exists, false otherwise
 */
async function existsDestPath() {
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
async function getLatestBackupDir() {
    const destPath = config.dest;
    const lsCmd = `ls -dt "${destPath}/${config.backupPrefix ?? 'BACKUP-'}"* | head -n 1`;
    if (config.isRemoteDest) {
        try {
            const result = await remoteCommand(lsCmd, config, false);
            return result ? result.trim() : null;
        }
        catch (_e) {
            return null;
        }
    }
    else {
        // For local destinations, check if the directory exists first
        if (!fs__default.default.existsSync(destPath)) {
            return null;
        }
        try {
            const result = await executeCommand(lsCmd);
            return result ? result.trim() : null;
        }
        catch (_e) {
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
async function createDestDir() {
    const destPath = config.dest;
    if (config.isRemoteDest) {
        const mkdirCmd = `mkdir -p "${destPath}"`;
        await remoteCommand(mkdirCmd, config, true);
    }
    else {
        fs__default.default.mkdirSync(destPath, { recursive: true });
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
async function backup(programConfig) {
    config = programConfig;
    const logger = config.logger;
    // Generate timestamp suffix for backup directory
    // Format: ISO 8601 without colons, e.g., 2025-11-23T193045
    // Original bash equivalent: DATE=$(date +%F-%H%M%S)
    const suffix = new Date().toISOString().replace(/:/g, "").split(".")[0];
    // Current backup directory name
    const currentBackupDirname = path__default.default.join(programConfig.dest, `${config.backupPrefix ?? 'BACKUP-'}${suffix}`);
    // Step 1: Check that source and destination exist
    if (!(await existsSrcPath())) {
        throw new Error(`Source directory "${programConfig.src}" does not exist.`);
    }
    if (!(await existsDestPath())) {
        // If destination doesn't exist, try to create it
        try {
            await createDestDir();
        }
        catch (_error) {
            throw new Error(`Destination directory "${programConfig.dest}" does not exist and could not be created.`);
        }
    }
    // Step 2: Get the most recent backup directory in destination
    const latestBackupDir = await getLatestBackupDir();
    let rsyncCmd = `rsync -av --delete `;
    // Include exclude-from option if specified
    if (programConfig.excludeFrom) {
        rsyncCmd += ` --exclude-from="${programConfig.excludeFrom}" `;
    }
    if (!latestBackupDir) {
        // Initial backup: full copy without hard-linking
        logger.log(`Initial backup to ${getDestPath()}/${path__default.default.basename(currentBackupDirname)}`);
        // rsync -av --delete \
        //   {remote}[src]/ {remote}[dest]/[current-backup]/
        rsyncCmd += ` "${getSrcPath()}/" "${getDestPath()}/${path__default.default.basename(currentBackupDirname)}/"`;
    }
    else {
        // Step 3: Build rsync command with --link-dest for incremental backup
        logger.log(`Incremental backup to ${getDestPath()}/${path__default.default.basename(currentBackupDirname)} with link-dest to ${programConfig.dest}/${path__default.default.basename(latestBackupDir)}`);
        // rsync -av --delete \
        //   --link-dest={remote}[dest]/[previous-backup]/ \
        //   {remote}[src]/ {remote}[dest]/[current-backup]/
        rsyncCmd += ` --link-dest="../${path__default.default.basename(latestBackupDir)}/" `;
        rsyncCmd += ` "${getSrcPath()}/" "${getDestPath()}/${path__default.default.basename(currentBackupDirname)}/"`;
    }
    // Step 4: Execute the rsync command
    logger.log("Executing command:" + rsyncCmd);
    await executeCommand(rsyncCmd);
}

exports.backup = backup;
