/**
 * HTTP application factory.
 *
 * Assembles the Express app from injected dependencies: middleware, resource
 * routers, health/readiness probes, and the RFC 9457 error boundary. It performs
 * no I/O and starts no server — construction only — so it can be exercised in tests.
 */
import express from "express";
import { pinoHttp } from "pino-http";
import { accountController } from "./http/account.controller.ts";
import { centralErrorHandler } from "./http/error.middleware.ts";
import { problem, sendProblem } from "./http/problem.ts";
import { transactionController } from "./http/transaction.controller.ts";
import type { Logger } from "./observability/logger.ts";
import type { IdempotencyStore } from "./persistence/idempotency.store.ts";
import type { LedgerRepository } from "./persistence/ledger.repository.ts";

/**
 * Dependencies injected into {@link createApp}. Passing these in rather than
 * importing concretes keeps the app storage-agnostic and testable.
 */
export interface AppDeps {
  logger: Logger;
  repo: LedgerRepository;
  store: IdempotencyStore;
}

/**
 * Build and configure the Express application.
 *
 * Middleware and routes are registered in a deliberate order: request logging →
 * JSON body parsing (capped at 100 kb) → resource routers → health/readiness
 * probes → a catch-all that returns an RFC 9457 `route-not-found` → the central
 * error handler. The error handler is registered **last** so it forms the error
 * boundary for everything above it; the 404 catch-all sits just before it so it
 * only runs when no route matched.
 *
 * @param deps - Logger and storage adapters to wire into the app.
 * @returns The configured Express app, ready to `listen`.
 */
export function createApp(deps: AppDeps) {
  const { logger, repo, store } = deps;
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/accounts", accountController(repo));
  app.use("/transactions", transactionController(repo, store));

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/readyz", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  app.use((req, res) => {
    const p = problem({
      slug: "route-not-found",
      title: "Route Not Found",
      status: 404,
      instance: req.originalUrl,
    });
    sendProblem(res, p);
  });
  app.use(centralErrorHandler(logger));

  return app;
}
