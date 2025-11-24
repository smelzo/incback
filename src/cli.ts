#!/usr/bin/env node
/**
 * incback - Incremental Backup Tool
 *
 * Entry point for the CLI tool. Executes a backup operation using rsync
 * with hard-link based incremental backups.
 *
 * The shebang allows direct execution on Unix-like systems when installed globally.
 */

import { backupRun } from "./backup.js";


// Execute the backup operation immediately
backupRun().catch(error => {
    console.error("Backup failed:", error);
    process.exit(1);
});

