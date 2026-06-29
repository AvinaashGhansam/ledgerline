import express from "express";
import { pinoHttp } from "pino-http";
import type { Logger } from "./observability/logger.ts";
import type { LedgerRepository } from "./persistence/repository.ts";

export interface AppDeps {
  logger: Logger;
  repo: LedgerRepository;
}

export function createApp(deps: AppDeps) {
  const { logger } = deps;
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/readyz", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  return app;
}
