/**
 * The `LedgerRepository` **port**: the storage interface the application depends
 * on. Adapters (in-memory today, a database later) implement it, so the backend
 * can change without touching the domain or application layers.
 */
import type { Account, AccountId, AccountType } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import type { Currency, Money } from "../domain/money.value-object.ts";
import type { Result } from "../domain/result.ts";
import type { Posting, Transaction, TransactionId } from "../domain/transaction.entity.ts";

/** Input for creating an account; the id is assigned by the repository. */
export type CreateAccountInput = {
  readonly currency: Currency;
  readonly type: AccountType;
};

/** Input for posting a transaction; the id is assigned by the repository. */
export type PostTransactionInput = {
  readonly postings: readonly Posting[];
  readonly memo?: string;
};

/**
 * Storage operations for accounts and transactions. Reads return `undefined` when
 * nothing is found; `postTransaction` returns a `Result` because posting can fail
 * with a {@link DomainError}.
 */
export interface LedgerRepository {
  createAccount(input: CreateAccountInput): Promise<Account>;
  getAccount(id: AccountId): Promise<Account | undefined>;
  postTransaction(input: PostTransactionInput): Promise<Result<Transaction, DomainError>>;
  getBalance(accountId: AccountId): Promise<Money | undefined>;
  getTransaction(id: TransactionId): Promise<Transaction | undefined>;
}
