import { Router } from "express";
import { createAccount, getAccount } from "../application/account.use-case.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";
import { AccountParams, CreateAccountBody } from "./account.schema.ts";
import { validate } from "./validate.middleware.ts";

export const accountController = (repo: LedgerRepository): Router => {
  const router = Router();

  router.post(
    "/",
    validate({ body: CreateAccountBody }, async (_req, res, data) => {
      const account = await createAccount(repo, data.body);
      res.status(201).json(account);
    }),
  );

  router.get(
    "/:id",
    validate({ params: AccountParams }, async (req, res, data) => {
      const account = await getAccount(repo, data.params.id);

      if (!account) {
        res.status(404).json({ requestId: req.id, error: "not_found" });
        return;
      }
      res.status(200).json(account);
    }),
  );

  router.get(
    "/:id/balance",
    validate({ params: AccountParams }, async (req, res, data) => {
      const existing = await getAccount(repo, data.params.id);

      if (!existing) {
        res.status(404).json({ requestId: req.id, error: "not_found" });
        return;
      }

      const balance = await repo.getBalance(existing.id);
      res.status(200).json({ currency: balance.currency, balance: balance.minorUnits.toString() });
      return;
    }),
  );
  return router;
};
