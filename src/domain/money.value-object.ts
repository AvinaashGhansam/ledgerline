/**
 * `Money` value object: an exact monetary amount as an integer count of a
 * currency's minor units (cents, pence), held in `bigint` to avoid floating-point
 * error. Instances are immutable — every operation returns a new `Money`.
 */
import { CurrencyMismatchError, NonIntegerAmountError } from "./errors.ts";

/** Supported ISO currency codes. */
export const CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export class Money {
  readonly minorUnits: bigint;
  readonly currency: Currency;

  private constructor(minorUnits: bigint, currency: Currency) {
    this.minorUnits = minorUnits;
    this.currency = currency;
  }

  /**
   * Construct `Money` from an amount in minor units. Prefer `bigint`; a `number`
   * is accepted for ergonomics but must be a safe integer.
   *
   * @throws NonIntegerAmountError if `amount` is a `number` that is not a safe integer.
   */
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

  /**
   * Sum with another amount of the same currency.
   * @throws CurrencyMismatchError if currencies differ.
   */
  add(other: Money): Money {
    this.#assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  /**
   * Difference from another amount of the same currency.
   * @throws CurrencyMismatchError if currencies differ.
   */
  subtract(other: Money): Money {
    this.#assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  /**
   * Split this amount into `n` shares as evenly as possible with **no minor units
   * lost or created**: the shares always sum back to the original. Any indivisible
   * remainder is spread one unit at a time across the leading shares (largest-
   * remainder), and negative amounts allocate in the same direction.
   *
   * @param n - Number of shares; must be a positive safe integer.
   * @throws Error if `n` is not a positive integer.
   */
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

  /** True if the same currency and the same minor-unit amount. Differing currencies are never equal. */
  equals(other: Money): boolean {
    if (this.currency !== other.currency) {
      return false;
    }
    return this.minorUnits === other.minorUnits;
  }

  /** True if the amount is exactly zero. */
  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  /** True if the amount is below zero. */
  isNegative(): boolean {
    return this.minorUnits < 0n;
  }
}
