import type { DomainError } from "../domain/errors.ts";
import { assertNever } from "../domain/result.ts";
import { type Problem, problem } from "./problem.ts";

export const domainErrorToProblem = (e: DomainError): Problem => {
  switch (e.kind) {
    case "AccountNotFound":
      return problem({
        slug: "account-not-found",
        title: "Account not found",
        status: 404,
        detail: `id=${e.id}`,
      });

    case "AccountClosed":
      return problem({
        slug: "account-closed",
        title: "Account is closed",
        status: 409,
        detail: `id=${e.id}`,
      });

    case "UnbalancedTransaction":
      return problem({
        slug: "unbalanced-transaction",
        title: "Transaction postings must sum to zero",
        status: 422,
        detail: `delta=${e.delta.minorUnits}`,
      });

    case "MixedCurrencyPostings":
      return problem({
        slug: "mixed-currency",
        title: "Different currencies being used",
        status: 422,
        extensions: { currencies: e.currencies },
      });

    case "TooFewPostings":
      return problem({
        slug: "too-few-postings",
        title: "Transaction must have at least 2 postings",
        status: 422,
        detail: e.count.toString(),
      });

    case "InsufficientFunds":
      return problem({
        slug: "insufficient-funds",
        title: "Not enough funds to do a transaction",
        status: 422,
        extensions: {
          accountId: e.accountId,
          required: e.required.minorUnits.toString(),
          available: e.available.minorUnits.toString(),
          currency: e.available.currency,
        },
      });

    default:
      return assertNever(e);
  }
};
