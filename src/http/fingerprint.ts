/**
 * Request-body fingerprinting for idempotency: a stable hash used to detect
 * whether a replayed `Idempotency-Key` carries the same payload as the original.
 */
import { createHash } from "node:crypto";

/**
 * Compute a SHA-256 hex digest of a request body.
 *
 * @param body - The parsed request body to fingerprint.
 * @returns The hex-encoded digest. Note the input is hashed via `JSON.stringify`,
 *   so two bodies match only if they serialize identically (key order matters).
 */
export const fingerprint = (body: unknown): string =>
  createHash("sha256").update(JSON.stringify(body)).digest("hex");
