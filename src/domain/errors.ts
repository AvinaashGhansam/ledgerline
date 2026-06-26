import type { Currency } from "./money.ts";

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
