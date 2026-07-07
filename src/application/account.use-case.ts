/**
 * Account use-cases: application-layer operations over accounts. They orchestrate
 * the {@link LedgerRepository} and translate raw string ids into the domain's
 * branded `AccountId`; they hold no persistence or HTTP concerns of their own.
 */
import { type Account, toAccountId } from "../domain/account.entity.ts";
import type { Money } from "../domain/money.value-object.ts";
import type { CreateAccountInput, LedgerRepository } from "../persistence/ledger.repository.ts";

/**
 * Create and persist a new account.
 *
 * @param repo - Ledger repository.
 * @param input - Validated currency and account type.
 * @returns The created account (status `open`).
 */
export const createAccount = async (
  repo: LedgerRepository,
  input: CreateAccountInput,
): Promise<Account> => {
  return repo.createAccount(input);
};

/**
 * Fetch an account by its raw id.
 *
 * @param repo - Ledger repository.
 * @param id - Raw account id from the request; normalized via `toAccountId`.
 * @returns The account, or `undefined` if no account has that id.
 * @throws InvalidAccountIdError if `id` is empty.
 */
export const getAccount = async (
  repo: LedgerRepository,
  id: string,
): Promise<Account | undefined> => {
  const accountId = toAccountId(id);
  return repo.getAccount(accountId);
};

/**
 * Compute an account's current balance by summing its postings.
 *
 * @param repo - Ledger repository.
 * @param id - Raw account id from the request; normalized via `toAccountId`.
 * @returns The balance as {@link Money}, or `undefined` if the account does not exist.
 * @throws InvalidAccountIdError if `id` is empty.
 */
export const getBalanceUseCase = async (
  repo: LedgerRepository,
  id: string,
): Promise<Money | undefined> => {
  return repo.getBalance(toAccountId(id));
};
