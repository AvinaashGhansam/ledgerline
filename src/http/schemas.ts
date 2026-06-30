import { z } from "zod";
import { ACCOUNT_TYPES } from "../domain/account.ts";
import { CURRENCIES } from "../domain/money.ts";

export const CreateAccountBody = z.object({
  currency: z.enum(CURRENCIES),
  type: z.enum(ACCOUNT_TYPES),
});

export const AccountParams = z.object({
  id: z.string().min(1),
});
