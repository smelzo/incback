/**
 * Command execution utilities for local and remote shell operations.
 *
 * This module provides functions to execute shell commands both locally and
 * on remote servers via SSH.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { ProgramOptions } from './types.js';

const execAsync = promisify(exec);

/**
 * Executes a local shell command and returns its output (stdout).
 *
 * @param command - The shell command to execute
 * @returns A Promise that resolves with the command's output (trimmed)
 * @throws Error if the command fails or produces stderr output
 */
export async function executeCommand(command: string): Promise<string> {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            throw new Error(`Error executing command "${command}": ${stderr}`);
        }
        return stdout.trim();
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error executing command "${command}": ${error.message}`);
        }
        throw new Error(`Unknown error executing command "${command}"`);
    }
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
function escapeShellArg(arg: string): string {
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
export async function remoteCommand(command: string, config: ProgramOptions, throwError = false): Promise<string> {
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
    } catch (error) {
        if (throwError) {
            throw error;
        }
        return "";
    }
}

