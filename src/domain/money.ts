import { CurrencyMismatchError, NonIntegerAmountError } from "./errors.ts";

export type Currency = "USD" | "EUR" | "GBP";

export class Money {
  readonly minorUnits: bigint;
  readonly currency: Currency;

  private constructor(minorUnits: bigint, currency: Currency) {
    this.minorUnits = minorUnits;
    this.currency = currency;
  }

  static of(amount: number | bigint, currency: Currency): Money {
    let safeAmount: bigint;

    if (typeof amount === "number") {
      if (!Number.isSafeInteger(amount)) {
        throw new NonIntegerAmountError(amount);
      }
      safeAmount = BigInt(amount);
    } else {
      safeAmount = amount;
    }
    return new Money(safeAmount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  equals(other: Money): boolean {
    if (this.currency !== other.currency) {
      return false;
    }
    return this.minorUnits === other.minorUnits;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }
}
