/**
 * Configuration management for incback
 *
 * This module handles loading and parsing configuration from either:
 * 1. Command-line arguments (using Commander.js)
 * 2. A .incback JSON configuration file (custom path via -c or default in current directory)
 *
 * The configuration is cached after first load to avoid repeated parsing.
 */
import type { ProgramConfig } from "./types.js";
/**
 * Gets the program configuration, loading it on first call.
 *
 * Configuration is loaded in the following priority order:
 * 1. Command-line arguments (if provided)
 *    a. --config flag: loads from specified JSON file
 *    b. Other flags: uses inline configuration
 * 2. .incback JSON file in current directory (if no CLI args)
 *
 * The configuration is cached after first load for performance.
 *
 * @returns The program configuration
 * @throws Exits the process if configuration cannot be loaded
 */
declare function getConfig(): ProgramConfig;
export { getConfig };
