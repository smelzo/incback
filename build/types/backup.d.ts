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
import type { ProgramConfig } from "./types.js";
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
export declare function backup(programConfig: ProgramConfig): Promise<void>;
export declare function backupRun(): Promise<void>;
