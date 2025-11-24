/**
 * Runtime type guards for validating configuration objects
 */

import type { ProgramOptions } from "./types.js";

/**
 * Type guard to validate if an object conforms to the ProgramOptions interface.
 *
 * Validates:
 * 1. Mandatory fields: src and dest must be strings
 * 2. Remote configuration: if any remote field is present, all three (remoteRole, remoteUser, remoteHost)
 *    must be present and valid
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid ProgramOptions, false otherwise
 */
export function isProgramOptions(_obj: unknown): _obj is ProgramOptions {
    // First check if it's an object
    if (typeof _obj !== 'object' || _obj === null) {
        return false;
    }

    // Type assertion to allow property access
    const obj = _obj as Record<string, unknown>;

    // Check mandatory fields
    const mandatory = typeof obj.src === 'string' && typeof obj.dest ===
        'string';
    if (!mandatory) {
        return false;
    }

    // If any remote configuration field is present, validate all remote   fields
    if (obj.remoteRole !== undefined || obj.remoteUser !== undefined ||
        obj.remoteHost !== undefined) {
        const isRemoteRoleOk = obj.remoteRole === "src" || obj.remoteRole
            === "dest";
        const isRemoteUserOk = typeof obj.remoteUser === 'string';
        const isRemoteHostOk = typeof obj.remoteHost === 'string';
        return isRemoteRoleOk && isRemoteUserOk && isRemoteHostOk;
    }

    // Valid local configuration (no remote fields)
    return true;
}
