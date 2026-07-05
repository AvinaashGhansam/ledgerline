import { Account, type AccountId, toAccountId } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import { Money } from "../domain/money.value-object.ts";
import { ok, type Result } from "../domain/result.ts";
import { Transaction, type TransactionId, toTransactionId } from "../domain/transaction.entity.ts";
import type { IdGenerator } from "./id-generator.ts";
import type {
  CreateAccountInput,
  LedgerRepository,
  PostTransactionInput,
} from "./ledger.repository.ts";

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly #accounts = new Map<AccountId, Account>();
  readonly #generateId: IdGenerator;
  readonly #transactions = new Map<TransactionId, Transaction>();

  constructor(generateId: IdGenerator) {
    this.#generateId = generateId;
  }

  async postTransaction(input: PostTransactionInput): Promise<Result<Transaction, DomainError>> {
    const id = toTransactionId(this.#generateId());
    const transaction = Transaction.create({
      id,
      postings: input.postings,
      ...(input.memo ? { memo: input.memo } : {}),
    });
    this.#transactions.set(id, transaction);
    return ok(transaction);
  }

  async getBalance(accountId: AccountId): Promise<Money | undefined> {
    const account = await this.getAccount(accountId);

    if (!account) {
      return undefined;
    }

    let balance: Money = Money.of(0n, account.currency);

    for (const transaction of this.#transactions.values()) {
      for (const posting of transaction.postings) {
        if (posting.accountId === accountId) {
          balance = balance.add(posting.amount);
        }
      }
    }
    return balance;
  }

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const id = toAccountId(this.#generateId());
    const account = Account.create({
      id,
      currency: input.currency,
      type: input.type,
    });

    this.#accounts.set(id, account);
    return account;
  }

  async getAccount(id: AccountId): Promise<Account | undefined> {
    return this.#accounts.get(id);
  }

  async getTransaction(id: TransactionId) {
    return this.#transactions.get(id);
  }
}
