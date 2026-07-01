import { Account, type AccountId, toAccountId } from "../domain/account.entity.ts";
import type { IdGenerator } from "./id-generator.ts";
import type { CreateAccountInput, LedgerRepository } from "./ledger.repository.ts";

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly #accounts = new Map<AccountId, Account>();
  readonly #generateId: IdGenerator;

  constructor(generateId: IdGenerator) {
    this.#generateId = generateId;
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
}
