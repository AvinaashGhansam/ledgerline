import type { Account, AccountId, AccountType } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import type { Currency, Money } from "../domain/money.value-object.ts";
import type { Result } from "../domain/result.ts";
import type { Posting, Transaction } from "../domain/transaction.entity.ts";

export type CreateAccountInput = {
  readonly currency: Currency;
  readonly type: AccountType;
};

export type PostTransactionInput = {
  readonly postings: readonly Posting[];
  readonly memo?: string;
};

export interface LedgerRepository {
  createAccount(input: CreateAccountInput): Promise<Account>;
  getAccount(id: AccountId): Promise<Account | undefined>;
  postTransaction(input: PostTransactionInput): Promise<Result<Transaction, DomainError>>;
  getBalance(accountId: AccountId): Promise<Money>;
}
