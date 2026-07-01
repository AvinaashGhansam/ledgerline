import type { AccountId } from "./account.entity.ts";
import {
  InvalidTransactionIdError,
  TooFewPostingsError,
  UnbalancedTransactionError,
} from "./errors.ts";
import type { Money } from "./money.value-object.ts";

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

export const imbalanceOf = (postings: readonly Posting[]): Money => {
  if (postings.length < 2) {
    throw new TooFewPostingsError();
  }

  let runningTotal = postings[0]!.amount;
  for (const posting of postings.slice(1)) {
    runningTotal = runningTotal.add(posting.amount);
  }
  return runningTotal;
};

export const Transaction = {
  create(input: { id: TransactionId; postings: readonly Posting[]; memo?: string }): Transaction {
    const delta = imbalanceOf(input.postings);

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
