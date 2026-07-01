import { type Account, toAccountId } from "../domain/account.entity.ts";
import type { CreateAccountInput, LedgerRepository } from "../persistence/ledger.repository.ts";

export const createAccount = async (
  repo: LedgerRepository,
  input: CreateAccountInput,
): Promise<Account> => {
  return repo.createAccount(input);
};

export const getAccount = async (
  repo: LedgerRepository,
  id: string,
): Promise<Account | undefined> => {
  const accountId = toAccountId(id);
  return repo.getAccount(accountId);
};
