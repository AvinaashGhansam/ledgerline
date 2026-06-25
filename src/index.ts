import { createApp } from "./app.ts";
import { config } from "./config/env.ts";
import { logger } from "./observability/logger.ts";

const app = createApp({ logger });

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "server listening");
});

let shuttingDown = false;
const FORCE_EXIT_MS = 10_000;
const shutdown = (signal: string) => {
  if (shuttingDown) {
    logger.info({ signal }, `Shutdown already in progress. Ignoring duplicate signal`);
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, "Received signal to terminate. Starting graceful shutdown.");

  setTimeout(() => {
    logger.error("Shutdown deadline exceeded. Forcing process exit.");
    process.exit(1);
  }, FORCE_EXIT_MS).unref();

  server.close((err) => {
    if (err) {
      logger.error({ err }, "Server encounter an error during shutdown.");
      process.exit(1);
    }

    logger.info("Server connection closed cleanly. Exiting process.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
