/**
 * The domain's two error families:
 *
 * 1. **Thrown invariant errors** (the `Error` subclasses below) — signal an
 *    *impossible* state that indicates a bug; they are thrown, not returned.
 * 2. **The {@link DomainError} union** — *expected* business failures that are
 *    returned inside a `Result` and mapped to HTTP problems at the boundary.
 */
import type { AccountId } from "./account.entity.ts";
import type { Currency, Money } from "./money.value-object.ts";

/** Thrown when arithmetic is attempted on two `Money` values of different currencies. */
export class CurrencyMismatchError extends Error {
  constructor(base: Currency, other: Currency) {
    super(`Currency mismatch: cannot operate on ${base} and ${other}`);
    this.name = "CurrencyMismatchError";
  }
}

/** Thrown when a `number` amount is not a safe integer; callers should pass a `bigint` instead. */
export class NonIntegerAmountError extends Error {
  constructor(amount: number) {
    super(
      `minor units must be a safe integer (|amount| ≤ 2^53−1); pass a bigint for larger amounts. Received: ${amount}`,
    );
    this.name = "NonIntegerAmountError";
  }
}

/** Thrown when constructing an `AccountId` from an empty string. */
export class InvalidAccountIdError extends Error {
  constructor() {
    super("Invariant violation: AccountId cannot be empty");
    this.name = "InvalidAccountIdError";
  }
}

/** Thrown when constructing a `TransactionId` from an empty string. */
export class InvalidTransactionIdError extends Error {
  constructor() {
    super("Invariant violation: TransactionId cannot be empty");
    this.name = "InvalidTransactionIdError";
  }
}

/** Thrown when a `Transaction` is constructed whose postings do not sum to zero. */
export class UnbalancedTransactionError extends Error {
  constructor(delta: bigint) {
    super(`Invariant violation: postings must sum to zero; delta=${delta}`);
    this.name = "UnbalancedTransactionError";
  }
}

/**
 * Thrown when an expected {@link DomainError} surfaces somewhere it should have
 * been impossible — i.e. an already-validated invariant was violated anyway.
 */
export class InvariantViolationError extends Error {
  constructor(domainError: DomainError) {
    super(`Invariant violation ${domainError.kind}`);
    this.name = "InvariantViolationError";
  }
}

/**
 * Expected business failures, returned inside a `Result` (never thrown) and
 * discriminated on `kind`. The HTTP layer maps each kind to a problem response;
 * adding a kind here forces a matching case in that mapper (via `assertNever`).
 */
export type DomainError =
  | { readonly kind: "AccountNotFound"; readonly id: AccountId }
  | { readonly kind: "AccountClosed"; readonly id: AccountId }
  | { readonly kind: "UnbalancedTransaction"; readonly delta: Money }
  | { readonly kind: "TooFewPostings"; readonly count: number }
  | { readonly kind: "MixedCurrencyPostings"; readonly currencies: string[] }
  | {
      readonly kind: "InsufficientFunds";
      readonly accountId: AccountId;
      readonly required: Money;
      readonly available: Money;
    };
