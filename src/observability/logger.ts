/**
 * Structured logging via pino. The shared {@link logger} is configured from the
 * `LOG_LEVEL` env var and stamps every line with `service: "ledgerline"`.
 */
import pino from "pino";
import { config } from "../config/env.ts";

/** Application-wide structured logger. */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: "ledgerline" },
});

/** The logger's type, for typing injected `logger` dependencies. */
export type Logger = typeof logger;
