import { Account, type AccountId, toAccountId } from "../domain/account.entity.ts";
import type { DomainError } from "../domain/errors.ts";
import type { Money } from "../domain/money.value-object.ts";
import { err, ok, type Result } from "../domain/result.ts";
import {
  type Transaction,
  Transaction as TransactionEntity,
  type TransactionId,
  toTransactionId,
} from "../domain/transaction.entity.ts";
import type { IdGenerator } from "./id-generator.ts";
import type {
  CreateAccountInput,
  LedgerRepository,
  PostTransactionInput,
} from "./ledger.repository.ts";

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly #accounts = new Map<AccountId, Account>();
  readonly #generateId: IdGenerator;

  #transactions = new Map<TransactionId, Transaction>();

  constructor(generateId: IdGenerator) {
    this.#generateId = generateId;
  }

  async postTransaction(input: PostTransactionInput): Promise<Result<Transaction, DomainError>> {
    // Check for existence
    for (const posting of input.postings) {
      if (!this.#accounts.get(posting.accountId)) {
        return err({ kind: "AccountNotFound", id: posting.accountId });
      }
    }
    // Generate an id
    const id = toTransactionId(this.#generateId());
    // Create the transaction
    const transaction = TransactionEntity.create({
      id,
      postings: input.postings,
      ...(input.memo ? { memo: input.memo } : {}),
    });
    // Save it
    this.#transactions.set(id, transaction);
    return ok(transaction);
  }

  getBalance(accountId: AccountId): Promise<Money> {
    throw new Error("Method not implemented.");
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
