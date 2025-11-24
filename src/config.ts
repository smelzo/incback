/**
 * Configuration management for incback
 *
 * This module handles loading and parsing configuration from either:
 * 1. Command-line arguments (using Commander.js)
 * 2. A .incback JSON configuration file (custom path via -c or default in current directory)
 *
 * The configuration is cached after first load to avoid repeated parsing.
 */

import path from "path";
import fs from "fs";
import { Command } from "commander";
import type { ProgramConfig, ProgramOptions } from "./types.js";
import { isProgramOptions } from "./type-guards.js";
import { getLogger } from "./logger.js";

/**
 * Cached configuration instance (singleton pattern)
 */
let config: ProgramConfig | null = null;

/**
 * Converts ProgramOptions to ProgramConfig by computing derived boolean flags.
 *
 * @param config - The raw program options
 * @returns Configuration with isRemoteSrc and isRemoteDest flags computed
 */
function optionsToConfig(config: ProgramOptions): ProgramConfig {
    let isRemoteSrc = false;
    let isRemoteDest = false;

    if (config.remoteRole === 'src') {
        isRemoteSrc = true;
    } else if (config.remoteRole === 'dest') {
        isRemoteDest = true;
    }
    const logger = getLogger(config);
    if (config.excludeFrom) {
        const excludeFrom = path.isAbsolute(config.excludeFrom) ? config.excludeFrom : path.join(process.cwd(), config.excludeFrom);
        // Verify that the excludeFrom file exists
        if (!fs.existsSync(excludeFrom)) {
            logger.warn(`Exclude file not found: ${excludeFrom}`);
            // remove the excludeFrom property if file doesn't exist
            delete config.excludeFrom;
        } else {
            config.excludeFrom = excludeFrom;
        }
    }
    const backupPrefix = config.backupPrefix ?? 'BACKUP-'
    return {
        ...config,
        isRemoteSrc,
        isRemoteDest,
        backupPrefix,
        logger
    };
}

/**
 * Reads configuration from a .incback JSON file.
 *
 * Expected file format:
 * ```json
 * {
 *   "src": "/path/to/source",
 *   "dest": "/path/to/destination",
 *   "remoteRole": "src",  // optional
 *   "remoteUser": "user", // required if remoteRole is set
 *   "remoteHost": "host"  // required if remoteRole is set
 *   "excludeFrom": "/path/to/exclude-file" || "./exclude-file" (relative to cwd) // optional
 * }
 * ```
 *
 * @param configFilePath - Optional custom path to config file. If empty, uses .incback in current directory
 * @returns The parsed and validated configuration
 * @throws Error if the file doesn't exist or contains invalid configuration
 */
function readConfigFromJSON(configFilePath = ""): ProgramConfig {
    const configPath = configFilePath ? configFilePath : path.join(process.cwd(), '.incback');

    if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        let config: unknown;
        try {
            config = JSON.parse(rawData);
        } catch (_error) {
            throw new Error("Invalid .incback configuration file");
        }
        if (!isProgramOptions(config)) {
            throw new Error("Invalid .incback configuration file");
        }

        return optionsToConfig(config);
    } else {
        throw new Error(`Configuration file .incback not found in ${process.cwd()}`);
    }
}

/**
 * Parses configuration from command-line arguments.
 *
 * Supported options:
 * - -c, --config <path>: Path to JSON configuration file (.incback)
 * - -s, --src <path>: Source path
 * - -d, --dest <path>: Destination path
 * - -R, --remote-role <role>: Remote role (src|dest)
 * - -U, --remote-user <user>: Remote user for SSH
 * - -H, --remote-host <host>: Remote host for SSH
 * - -e, --exclude-from <file>: Path to exclude patterns file
 *
 * Priority: If --config is provided, other options are ignored and config is loaded from file.
 *
 * @returns The parsed configuration, or null if no arguments were provided (indicating to use default JSON config)
 * @throws Exits the process if invalid arguments are provided
 */
function parseConfigFromArgs(): ProgramConfig | null {
    // If no arguments provided (only node and script name), return null to use default JSON config
    if (process.argv.length <= 2) {
        return null;
    }

    const program = new Command();
    program
        .option('-c, --config <path>', 'JSON configuration file path (.incback)')
        .option('-s, --src <path>', 'source path')
        .option('-d, --dest <path>', 'destination path')
        .option('-R, --remote-role <role>', 'remote role (src|dest)')
        .option('-U, --remote-user <user>', 'remote user')
        .option('-H, --remote-host <host>', 'remote host')
        .option('-e, --exclude-from <file>', 'path to exclude patterns file')
        .option('-l, --log-file <file>', 'path to log file');

    program.parse(process.argv);
    const options = program.opts();

    // First check if --config option was provided
    if (options.config && typeof options.config === 'string') {
        return readConfigFromJSON(options.config);
    }

    // Then verify that mandatory options are present for inline configuration
    if (!isProgramOptions(options)) {
        console.error("Error: Missing or invalid parameters.");
        program.outputHelp();
        process.exit(1);
    }

    return optionsToConfig(options);
}

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
function getConfig(): ProgramConfig {
    if (config === null) {
        try {
            const argsConfig = parseConfigFromArgs();
            if (argsConfig) {
                config = argsConfig;
            } else {
                config = readConfigFromJSON();
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Startup error:", error.message);
            } else {
                console.error("Startup error: Unknown error");
            }
            process.exit(1);
        }
    }
    return config;
}

export { getConfig };