import { CurrencyMismatchError, NonIntegerAmountError } from "./errors.ts";

export const CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

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
    this.#assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.#assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  allocate(n: number): Money[] {
    if (!Number.isSafeInteger(n) || n < 1) {
      throw new Error("allocate(n): n must be positive integer");
    }

    const bigN = BigInt(n);
    const bareShare = this.minorUnits / bigN;

    let remainder = this.minorUnits % bigN;

    // Determine the direction of the leftover pennies
    const unit = remainder < 0n ? -1n : 1n;

    const shares: Money[] = [];
    for (let i = 0; i < n; i++) {
      // If we still have a remainder, distribute one unit (positive or negative)
      const extra = remainder !== 0n ? unit : 0n;
      shares.push(new Money(bareShare + extra, this.currency));

      // Unconditionally walk the remainder toward zero.
      // Once remainder hits 0n, extra is 0n, making this a safe no-op.
      remainder -= extra;
    }

    return shares;
  }

  #assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
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
