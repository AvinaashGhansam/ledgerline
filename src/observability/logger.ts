import pino from "pino";
import { config } from "../config/env.ts";

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: "ledgerline" },
});

export type Logger = typeof logger;
