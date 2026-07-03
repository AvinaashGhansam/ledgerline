import type { Request, Response } from "express";
import { postTransactionUseCase } from "../application/transaction.use-case.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";

export const postTransactionController = (repo: LedgerRepository) => {
  return async (req: Request, res: Response) => {
    const result = await postTransactionUseCase(repo, req.body);

    if (result.ok) {
      return res.status(201).json(result.value);
    }

    switch (result.error.kind) {
      case "AccountNotFound":
        return res.status(404).json({ error: "account_not_found", accountId: result.error.id });
      case "TooFewPostings":
        return res.status(400).json({ error: "too_few_posting", count: result.error.count });
      case "MixedCurrencyPostings":
        return res
          .status(422)
          .json({ error: "currency_mismatch", currencies: result.error.currencies });
      case "UnbalancedTransaction":
        return res.status(422).json({ error: "unbalanced_transaction", delta: result.error.delta });
    }
    return res.status(500).json({ error: result.error });
  };
};
