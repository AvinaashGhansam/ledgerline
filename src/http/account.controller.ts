import { Router } from "express";
import { createAccount, getAccount, getBalanceUseCase } from "../application/account.use-case.ts";
import { toAccountId } from "../domain/account.entity.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";
import { AccountParams, CreateAccountBody } from "./account.schema.ts";
import { domainErrorToProblem } from "./domain-error.mapper.ts";
import { sendProblem } from "./problem.ts";
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
    validate({ params: AccountParams }, async (_req, res, data) => {
      const account = await getAccount(repo, data.params.id);

      if (!account) {
        const p = domainErrorToProblem({
          kind: "AccountNotFound",
          id: toAccountId(data.params.id),
        });
        sendProblem(res, p);
        return;
      }
      res.status(200).json(account);
    }),
  );

  router.get(
    "/:id/balance",
    validate({ params: AccountParams }, async (_req, res, data) => {
      const balance = await getBalanceUseCase(repo, data.params.id);

      if (!balance) {
        const p = domainErrorToProblem({
          kind: "AccountNotFound",
          id: toAccountId(data.params.id),
        });
        sendProblem(res, p);
        return;
      }

      res.status(200).json({ currency: balance.currency, balance: balance.minorUnits.toString() });
    }),
  );
  return router;
};
