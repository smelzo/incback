/**
 * Remote path existence checker via SSH
 *
 * This module provides functionality to check if files or directories exist
 * on remote servers using SSH connections.
 */

import { executeCommand } from "./exec.js";

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
export async function remoteExists(remoteUser: string, remoteHost: string, remotePath: string): Promise<boolean> {
    // Use explicit output ("exists" or "not_exists") to determine result
    // The || operator ensures exit code 0 even when test fails, allowing us to
    // distinguish between connection failures (caught in catch block) and path not found
    const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 ${remoteUser}@${remoteHost} "test -e \\"${remotePath}\\" && echo exists || echo not_exists"`;

    try {
        const stdout = await executeCommand(cmd);
        const exists = stdout.trim() === 'exists';
        return exists;
    } catch (_error) {
        // If we end up here, the SSH connection likely failed or the command itself failed
        // In both cases, we return false to indicate the path is not accessible
        return false;
    }
}

