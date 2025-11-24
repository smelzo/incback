/**
 * Command execution utilities for local and remote shell operations.
 *
 * This module provides functions to execute shell commands both locally and
 * on remote servers via SSH.
 */

import { spawn } from 'child_process';
import type { ProgramOptions } from './types.js';

/**
 * Executes a local shell command and returns its output (stdout).
 *
 * @param command - The shell command to execute
 * @returns A Promise that resolves with the command's output (trimmed)
 * @throws Error if the command fails or produces stderr output
 */
export function executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Use spawn with shell: true to execute the command string
        // This avoids the maxBuffer limit of exec()
        const child = spawn(command, { shell: true });
        
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
            } else if (stderr) {
                // Maintain original behavior: fail if there is any stderr output
                reject(new Error(`Error executing command "${command}": ${stderr}`));
            } else {
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

