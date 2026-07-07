/**
 * Transaction posting use-case: turns a validated request body into a balanced,
 * persisted double-entry transaction, or an explanatory {@link DomainError}.
 */
import { toAccountId } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import { Money } from "../domain/money.value-object.ts";
import { err, type Result } from "../domain/result.ts";
import { analyzePostings, type Posting, type Transaction } from "../domain/transaction.entity.ts";
import type { CreateTransactionBody } from "../http/transaction.schema.ts";
import type { LedgerRepository } from "../persistence/ledger.repository.ts";

/**
 * Post a double-entry transaction.
 *
 * Each raw posting is resolved to its account and its currency is taken **from
 * that account** (postings carry no currency of their own); the string amount is
 * parsed into `bigint` minor units. The assembled postings are then checked for
 * the double-entry invariants before persisting.
 *
 * Expected failures are returned as `Result.err`, never thrown:
 * - `AccountNotFound` — a posting references an account that does not exist.
 * - `TooFewPostings` / `MixedCurrencyPostings` — surfaced by {@link analyzePostings}.
 * - `UnbalancedTransaction` — the postings do not sum to zero.
 *
 * @param repo - Ledger repository.
 * @param input - Request body already validated by the transaction schema, so
 *   `accountId` and `amount` are well-formed (non-empty id, integer-string amount).
 * @returns `Result.ok` with the persisted transaction, or `Result.err` with the
 *   domain error describing why it was rejected.
 */
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
