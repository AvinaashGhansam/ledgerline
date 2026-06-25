import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const config = Object.freeze(result.data);
export type Config = typeof config;
