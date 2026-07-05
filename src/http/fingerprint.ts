import { createHash } from "node:crypto";

export const fingerprint = (body: unknown): string =>
  createHash("sha256").update(JSON.stringify(body)).digest("hex");
