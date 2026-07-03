import type { DomainError } from "../domain/errors.ts";
import { err, type Result } from "../domain/result.ts";
import { analyzePostings, type Transaction } from "../domain/transaction.entity.ts";
import type { LedgerRepository, PostTransactionInput } from "../persistence/ledger.repository.ts";

export const postTransactionUseCase = async (
  repo: LedgerRepository,
  input: PostTransactionInput,
): Promise<Result<Transaction, DomainError>> => {
  const analysis = analyzePostings(input.postings);
  if (!analysis.ok) {
    return analysis;
  }

  const delta = analysis.value;

  if (!delta.isZero()) {
    return err({ kind: "UnbalancedTransaction", delta });
  }

  return await repo.postTransaction(input);
};
