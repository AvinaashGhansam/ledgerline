import { Account, type AccountId, toAccountId } from "../domain/account.ts";
import type { CreateAccountInput, LedgerRepository } from "./repository.ts";

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly #accounts = new Map<AccountId, Account>();

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const id = toAccountId(crypto.randomUUID());
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
