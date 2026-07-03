import type { AccountId } from "./account.entity.ts";
import type { Currency, Money } from "./money.value-object.ts";

export class CurrencyMismatchError extends Error {
  constructor(base: Currency, other: Currency) {
    super(`Currency mismatch: cannot operate on ${base} and ${other}`);
    this.name = "CurrencyMismatchError";
  }
}

export class NonIntegerAmountError extends Error {
  constructor(amount: number) {
    super(
      `minor units must be a safe integer (|amount| ≤ 2^53−1); pass a bigint for larger amounts. Received: ${amount}`,
    );
    this.name = "NonIntegerAmountError";
  }
}

export class InvalidAccountIdError extends Error {
  constructor() {
    super("Invariant violation: AccountId cannot be empty");
    this.name = "InvalidAccountIdError";
  }
}

export class InvalidTransactionIdError extends Error {
  constructor() {
    super("Invariant violation: TransactionId cannot be empty");
    this.name = "InvalidTransactionIdError";
  }
}

export class UnbalancedTransactionError extends Error {
  constructor(delta: bigint) {
    super(`Invariant violation: postings must sum to zero; delta=${delta}`);
    this.name = "UnbalancedTransactionError";
  }
}

export class AccountNotFoundError extends Error {
  constructor(id: AccountId) {
    super(`Error: cannot find account with id=${id}`);

    this.name = "AccountNotFoundError";
  }
}
export class TooFewPostingsError extends Error {
  constructor() {
    super("Invariant violation. Must be 2 or more postings.");

    this.name = "TooFewPostingsError";
  }
}

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
