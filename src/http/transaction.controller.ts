import { Router } from "express";
import { postTransactionUseCase } from "../application/transaction.use-case.ts";
import { assertNever } from "../domain/result.ts";
import type { Transaction } from "../domain/transaction.entity.ts";
import type { IdempotencyStore } from "../persistence/idempotency.store.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";
import { fingerprint } from "./fingerprint.ts";
import { CreateTransactionBody } from "./transaction.schema.ts";
import { validate } from "./validate.middleware.ts";

const presentTransaction = (tx: Transaction) => ({
  id: tx.id,
  memo: tx.memo,
  postings: tx.postings.map((p) => ({
    accountId: p.accountId,
    amount: p.amount.minorUnits.toString(),
    currency: p.amount.currency,
  })),
});

export const transactionController = (repo: LedgerRepository, store: IdempotencyStore): Router => {
  const router = Router();

  router.post(
    "/",
    validate({ body: CreateTransactionBody }, async (req, res, data) => {
      const key = req.get("Idempotency-Key");
      const fp = fingerprint(data.body);

      if (key) {
        const existing = await store.get(key);
        if (existing) {
          if (existing.fingerprint === fp) {
            res.status(existing.status).json(existing.body);
            return;
          }
          res.status(409).json({ error: "idempotency_conflict" });
          return;
        }
      }

      const result = await postTransactionUseCase(repo, data.body);

      let responseStatus: number;
      let responseBody: unknown;

      if (result.ok) {
        responseStatus = 201;
        responseBody = presentTransaction(result.value);
      } else {
        switch (result.error.kind) {
          case "AccountNotFound":
            responseStatus = 404;
            responseBody = { error: "account_not_found", accountId: result.error.id };
            break;
          case "AccountClosed":
            responseStatus = 422;
            responseBody = { error: "account_closed", accountId: result.error.id };
            break;
          case "TooFewPostings":
            responseStatus = 400;
            responseBody = { error: "too_few_postings", count: result.error.count };
            break;
          case "MixedCurrencyPostings":
            responseStatus = 422;
            responseBody = { error: "currency_mismatch", currencies: result.error.currencies };
            break;
          case "UnbalancedTransaction":
            responseStatus = 422;
            responseBody = {
              error: "unbalanced_transaction",
              delta: result.error.delta.minorUnits.toString(),
            };
            break;
          case "InsufficientFunds":
            responseStatus = 422;
            responseBody = {
              error: "insufficient_funds",
              accountId: result.error.accountId,
              required: result.error.required.minorUnits.toString(),
              available: result.error.available.minorUnits.toString(),
            };
            break;
          default:
            return assertNever(result.error);
        }
      }

      if (responseStatus === 201 && key) {
        await store.put(key, { fingerprint: fp, status: responseStatus, body: responseBody });
      }

      res.status(responseStatus).json(responseBody);
    }),
  );

  return router;
};
