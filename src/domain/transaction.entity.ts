import type { AccountId } from "./account.entity.ts";
import {
  type DomainError,
  InvalidTransactionIdError,
  UnbalancedTransactionError,
} from "./errors.ts";
import type { Money } from "./money.value-object.ts";
import { err, ok, type Result } from "./result.ts";

declare const transactionIdBrand: unique symbol;
export type TransactionId = string & { readonly [transactionIdBrand]: true };

export const toTransactionId = (raw: string): TransactionId => {
  if (raw.length === 0) {
    throw new InvalidTransactionIdError();
  }
  return raw as TransactionId;
};

export type Posting = {
  readonly accountId: AccountId;
  readonly amount: Money;
};

export type Transaction = {
  readonly id: TransactionId;
  readonly postings: readonly Posting[];
  readonly memo?: string;
};

export const analyzePostings = (postings: readonly Posting[]): Result<Money, DomainError> => {
  const [first, ...rest] = postings;

  if (!first || rest.length === 0) {
    return err({ kind: "TooFewPostings", count: postings.length });
  }

  const hasMixedCurrencies = rest.some(
    (posting) => posting.amount.currency !== first.amount.currency,
  );

  if (hasMixedCurrencies) {
    return err({
      kind: "MixedCurrencyPostings",
      currencies: [...new Set(postings.map((p) => p.amount.currency))],
    });
  }

  let runningTotal = first.amount;
  for (const posting of rest) {
    runningTotal = runningTotal.add(posting.amount);
  }

  return ok(runningTotal);
};

export const Transaction = {
  create(input: { id: TransactionId; postings: readonly Posting[]; memo?: string }): Transaction {
    const analysis = analyzePostings(input.postings);

    if (!analysis.ok) {
      // TODO: InvariantViolationError
      throw new Error(`Invariant violation ${analysis.error.kind}`);
    }

    const delta = analysis.value;

    if (!delta.isZero()) {
      throw new UnbalancedTransactionError(delta.minorUnits);
    }

    return {
      id: input.id,
      postings: input.postings,
      ...(input.memo ? { memo: input.memo } : {}),
    };
  },
};
