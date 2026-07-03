import { type Account, type AccountId, toAccountId } from "../domain/account.entity.ts";
import { type DomainError, UnbalancedTransactionError } from "../domain/errors.ts";
import { Money } from "../domain/money.value-object.ts";
import { err, type Result } from "../domain/result.ts";
import { analyzePostings, type Posting, type Transaction } from "../domain/transaction.entity.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";

export type PostTransactionDTO = {
  readonly postings: readonly {
    readonly accountId: string;
    readonly amount: string;
  }[];
  readonly memo?: string;
};

export const postTransactionUseCase = async (
  repo: LedgerRepository,
  input: PostTransactionDTO,
): Promise<Result<Transaction, DomainError>> => {
  const domainPostings: Posting[] = [];
  for (const rawPosting of input.postings) {
    const account = await repo.getAccount(toAccountId(rawPosting.accountId));

    if (!account) {
      return err({ kind: "AccountNotFound", id: toAccountId(rawPosting.accountId) });
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
