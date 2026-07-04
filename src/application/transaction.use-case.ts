import { toAccountId } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import { Money } from "../domain/money.value-object.ts";
import { err, type Result } from "../domain/result.ts";
import { analyzePostings, type Posting, type Transaction } from "../domain/transaction.entity.ts";
import type { CreateTransactionBody } from "../http/transaction.schema.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";

export const postTransactionUseCase = async (
  repo: LedgerRepository,
  input: CreateTransactionBody,
): Promise<Result<Transaction, DomainError>> => {
  const domainPostings: Posting[] = [];
  for (const rawPosting of input.postings) {
    const accountId = toAccountId(rawPosting.accountId);
    const account = await repo.getAccount(accountId);

    if (!account) {
      return err({ kind: "AccountNotFound", id: accountId });
    }

    const amount = BigInt(rawPosting.amount);
    const money = Money.of(amount, account.currency);

    const posting: Posting = {
      accountId: account.id,
      amount: money,
    };
    domainPostings.push(posting);
  }
  const analysis = analyzePostings(domainPostings);
  if (!analysis.ok) {
    return analysis;
  }

  const delta = analysis.value;
  if (!delta.isZero()) {
    return err({ kind: "UnbalancedTransaction", delta });
  }

  return repo.postTransaction({
    postings: domainPostings,
    ...(input.memo ? { memo: input.memo } : {}),
  });
};
