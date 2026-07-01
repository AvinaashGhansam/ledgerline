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
export type DomainError =
  | { readonly kind: "AccountNotFound"; readonly id: AccountId }
  | { readonly kind: "AccountClosed"; readonly id: AccountId }
  | {
      readonly kind: "InsufficientFunds";
      readonly accountId: AccountId;
      readonly required: Money;
      readonly available: Money;
    };
