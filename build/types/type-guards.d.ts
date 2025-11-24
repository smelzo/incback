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
export declare function isProgramOptions(_obj: unknown): _obj is ProgramOptions;
