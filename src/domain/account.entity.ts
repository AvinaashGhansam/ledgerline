/**
 * `Account` entity: a single-currency ledger account, plus its branded id type
 * and the closed sets of account types and statuses.
 */
import { InvalidAccountIdError } from "./errors.ts";
import type { Currency } from "./money.value-object.ts";

/**
 * A nominal (branded) account id. It is structurally a `string`, but the brand
 * means a raw string cannot be used where an `AccountId` is expected without
 * going through {@link toAccountId}.
 */
declare const accountIdBrand: unique symbol;
export type AccountId = string & { readonly [accountIdBrand]: true };

/**
 * Validate and brand a raw string as an {@link AccountId}.
 * @throws InvalidAccountIdError if `raw` is empty.
 */
export const toAccountId = (raw: string): AccountId => {
  if (raw.length === 0) {
    throw new InvalidAccountIdError();
  }
  return raw as AccountId;
};

/** The five standard accounting account types. */
export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Account lifecycle statuses. */
export const ACCOUNT_STATUSES = ["open", "closed"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** A ledger account. Currency is fixed at creation and applies to all its postings. */
export type Account = {
  readonly id: AccountId;
  readonly currency: Currency;
  readonly type: AccountType;
  readonly status: AccountStatus;
};

export const Account = {
  /** Create a new account; newly created accounts are always `open`. */
  create(input: { id: AccountId; currency: Currency; type: AccountType }): Account {
    return {
      id: input.id,
      currency: input.currency,
      type: input.type,
      status: "open",
    };
  },
};
