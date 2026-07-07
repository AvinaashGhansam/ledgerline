/**
 * `Transaction` entity: an atomic set of double-entry postings, plus its branded
 * id type and the rules that decide whether a set of postings is well-formed.
 */
import type { AccountId } from "./account.entity.ts";
import {
  type DomainError,
  InvalidTransactionIdError,
  InvariantViolationError,
  UnbalancedTransactionError,
} from "./errors.ts";
import type { Money } from "./money.value-object.ts";
import { err, ok, type Result } from "./result.ts";

/** A nominal (branded) transaction id; construct it via {@link toTransactionId}. */
declare const transactionIdBrand: unique symbol;
export type TransactionId = string & { readonly [transactionIdBrand]: true };

/**
 * Validate and brand a raw string as a {@link TransactionId}.
 * @throws InvalidTransactionIdError if `raw` is empty.
 */
export const toTransactionId = (raw: string): TransactionId => {
  if (raw.length === 0) {
    throw new InvalidTransactionIdError();
  }
  return raw as TransactionId;
};

/** A single leg of a transaction: a signed amount posted against one account. */
export type Posting = {
  readonly accountId: AccountId;
  readonly amount: Money;
};

/** A recorded transaction. Its postings are guaranteed balanced (they sum to zero). */
export type Transaction = {
  readonly id: TransactionId;
  readonly postings: readonly Posting[];
  readonly memo?: string;
};

/**
 * Check a set of postings for well-formedness and compute their signed total.
 *
 * @returns `Result.ok` with the running total (the *delta*; zero means balanced),
 *   or `Result.err` with `TooFewPostings` (fewer than two) or `MixedCurrencyPostings`.
 *   Note it returns the total rather than asserting balance — the caller decides
 *   whether a non-zero delta is acceptable.
 */
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
  /**
   * Construct a balanced transaction, enforcing the domain invariants as a last
   * line of defense. Because callers (the posting use-case) are expected to have
   * already validated the postings, a failure here indicates a bug and is
   * **thrown**, not returned: `InvariantViolationError` for a malformed set
   * (too few / mixed currency) and `UnbalancedTransactionError` for a non-zero sum.
   */
  create(input: { id: TransactionId; postings: readonly Posting[]; memo?: string }): Transaction {
    const analysis = analyzePostings(input.postings);

    if (!analysis.ok) {
      throw new InvariantViolationError(analysis.error);
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
