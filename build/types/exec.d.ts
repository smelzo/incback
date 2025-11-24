/**
 * Command execution utilities for local and remote shell operations.
 *
 * This module provides functions to execute shell commands both locally and
 * on remote servers via SSH.
 */
import type { ProgramOptions } from './types.js';
/**
 * Executes a local shell command and returns its output (stdout).
 *
 * @param command - The shell command to execute
 * @returns A Promise that resolves with the command's output (trimmed)
 * @throws Error if the command fails or produces stderr output
 */
export declare function executeCommand(command: string): Promise<string>;
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
export declare function remoteCommand(command: string, config: ProgramOptions, throwError?: boolean): Promise<string>;
