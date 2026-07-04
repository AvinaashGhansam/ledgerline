import { postTransactionUseCase } from "../application/transaction.use-case.ts";
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

export const postTransactionController = (repo: LedgerRepository, store: IdempotencyStore) => {
  return validate({ body: CreateTransactionBody }, async (req, res, data) => {
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
        default:
          responseStatus = 500;
          responseBody = { error: "internal_server_error" };
          break;
      }
    }

    if (responseStatus === 201 && key) {
      await store.put(key, { fingerprint: fp, status: responseStatus, body: responseBody });
    }

    res.status(responseStatus).json(responseBody);
    return;
  });
};
