import type { Account, AccountId, AccountType } from "../domain/account.entity.ts";
import type { Currency } from "../domain/money.value-object.ts";

export type CreateAccountInput = {
  readonly currency: Currency;
  readonly type: AccountType;
};

export interface LedgerRepository {
  createAccount(input: CreateAccountInput): Promise<Account>;
  getAccount(id: AccountId): Promise<Account | undefined>;
}
