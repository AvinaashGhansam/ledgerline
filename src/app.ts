import express from "express";
import { pinoHttp } from "pino-http";
import { accountController } from "./http/account.controller.ts";
import { transactionController } from "./http/transaction.controller.ts";
import type { Logger } from "./observability/logger.ts";
import type { IdempotencyStore } from "./persistence/idempotency.store.ts";
import type { LedgerRepository } from "./persistence/ledger.repository.ts";

export interface AppDeps {
  logger: Logger;
  repo: LedgerRepository;
  store: IdempotencyStore;
}

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

  return app;
}
