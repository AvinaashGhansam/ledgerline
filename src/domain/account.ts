import { InvalidAccountIdError } from "./errors.ts";
import type { Currency } from "./money.ts";

declare const accountIdBrand: unique symbol;
export type AccountId = string & { readonly [accountIdBrand]: true };

export const toAccountId = (raw: string): AccountId => {
  if (raw.length === 0) {
    throw new InvalidAccountIdError();
  }
  return raw as AccountId;
};

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ["open", "closed"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type Account = {
  readonly id: AccountId;
  readonly currency: Currency;
  readonly type: AccountType;
  readonly status: AccountStatus;
};

export const Account = {
  create(input: { id: AccountId; currency: Currency; type: AccountType }): Account {
    return {
      id: input.id,
      currency: input.currency,
      type: input.type,
      status: "open",
    };
  },
};
