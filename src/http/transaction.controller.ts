import { Router } from "express";
import { postTransactionUseCase } from "../application/transaction.use-case.ts";
import { assertNever } from "../domain/result.ts";
import type { Transaction } from "../domain/transaction.entity.ts";
import type { IdempotencyStore } from "../persistence/idempotency.store.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";
import { domainErrorToProblem } from "./domain-error.mapper.ts";
import { fingerprint } from "./fingerprint.ts";
import { sendProblem } from "./problem.ts";
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

      if (!result.ok) {
        const p = domainErrorToProblem(result.error);
        sendProblem(res, p);
        return;
      }

      const responseBody = presentTransaction(result.value);

      if (key) {
        await store.put(key, { fingerprint: fp, status: 201, body: responseBody });
      }

      res.status(201).json(responseBody);
    }),
  );

  return router;
};
