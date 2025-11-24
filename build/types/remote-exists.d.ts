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
export declare function remoteExists(remoteUser: string, remoteHost: string, remotePath: string): Promise<boolean>;
