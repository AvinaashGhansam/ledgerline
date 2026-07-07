/**
 * Composition root and process entry point.
 *
 * This is the only module that names concrete implementations: it constructs the
 * adapters (id generator, in-memory repository and idempotency store), wires them
 * into the Express app, starts the HTTP server, and installs graceful-shutdown
 * handlers. Everything reachable from {@link createApp} depends on interfaces, so
 * swapping a storage backend is a change here and nowhere above the persistence layer.
 */
import { createApp } from "./app.ts";
import { config } from "./config/env.ts";
import { logger } from "./observability/logger.ts";
import type { IdGenerator } from "./persistence/id-generator.ts";
import { InMemoryIdempotencyStore } from "./persistence/idempotency.store.in-memory.ts";
import { InMemoryLedgerRepository } from "./persistence/ledger.repository.in-memory.ts";

const generateId: IdGenerator = () => crypto.randomUUID();
const repo = new InMemoryLedgerRepository(generateId);
const store = new InMemoryIdempotencyStore();

const app = createApp({ logger, repo, store });

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "server listening");
});

let shuttingDown = false;

/** Hard deadline for graceful shutdown; once it elapses the process is force-exited. */
const FORCE_EXIT_MS = 10_000;

/**
 * Gracefully shut the server down in response to a termination signal.
 *
 * Idempotent: a second signal received while shutdown is already in progress is
 * ignored. Stops accepting new connections and exits `0` once in-flight requests
 * drain. Exits `1` if the server reports a close error, or if {@link FORCE_EXIT_MS}
 * elapses first — the deadline timer is `unref`'d so it never keeps the process alive.
 *
 * @param signal - The received signal name, logged for operator visibility.
 */
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
