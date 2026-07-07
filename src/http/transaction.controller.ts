/**
 * HTTP router for the transaction resource (`/transactions`): posting a balanced
 * transaction, with optional `Idempotency-Key` handling.
 */
import { Router } from "express";
import { postTransactionUseCase } from "../application/transaction.use-case.ts";
import type { Transaction } from "../domain/transaction.entity.ts";
import type { IdempotencyStore } from "../persistence/idempotency.store.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";
import { domainErrorToProblem } from "./domain-error.mapper.ts";
import { fingerprint } from "./fingerprint.ts";
import { problem, sendProblem } from "./problem.ts";
import { CreateTransactionBody } from "./transaction.schema.ts";
import { validate } from "./validate.middleware.ts";

/** Shape a domain {@link Transaction} into its JSON response, rendering bigint amounts as strings. */
const presentTransaction = (tx: Transaction) => ({
  id: tx.id,
  memo: tx.memo,
  postings: tx.postings.map((p) => ({
    accountId: p.accountId,
    amount: p.amount.minorUnits.toString(),
    currency: p.amount.currency,
  })),
});

/**
 * Build the transaction router.
 *
 * `POST /transactions` supports idempotent replay: when an `Idempotency-Key` is
 * present, a prior record with a matching body fingerprint replays the stored
 * response, while a matching key with a *different* body yields a `409`
 * `idempotency-conflict`. Otherwise the posting use-case runs and its
 * `Result.err` is mapped to a problem; on success the new transaction is stored
 * (if keyed) and returned as `201`.
 *
 * @param repo - Ledger repository for posting transactions.
 * @param store - Idempotency store keyed by `Idempotency-Key`.
 */
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
          const p = problem({
            slug: "idempotency-conflict",
            title: "Idempotency key reused with a different payload",
            status: 409,
          });
          sendProblem(res, p);
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
