/**
 * Zod schemas defining the request contract for the account endpoints. The
 * allowed currencies and account types are sourced from the domain so the API
 * and the domain can never drift apart.
 */
import { z } from "zod";
import { ACCOUNT_TYPES } from "../domain/account.entity.ts";
import { CURRENCIES } from "../domain/money.value-object.ts";

/** Body of `POST /accounts`. */
export const CreateAccountBody = z.object({
  currency: z.enum(CURRENCIES),
  type: z.enum(ACCOUNT_TYPES),
});

/** Path params for account routes (`/:id`); `id` must be non-empty. */
export const AccountParams = z.object({
  id: z.string().min(1),
});
