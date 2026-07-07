/**
 * Zod schema defining the request contract for `POST /transactions`.
 *
 * Enforces the *shape* of a transaction (at least two postings, each with a
 * non-empty account id and an integer-minor-unit amount string). The accounting
 * invariants — postings summing to zero, single currency — are business rules
 * enforced later in the domain, not here.
 */
import { z } from "zod";

/** Body of `POST /transactions`. `amount` is an integer-minor-unit string (`^-?\d+$`). */
export const CreateTransactionBody = z.object({
  postings: z
    .array(
      z.object({
        accountId: z.string().min(1),
        amount: z.string().regex(/^-?\d+$/),
      }),
    )
    .min(2),
  memo: z.string().optional(),
});

/** Inferred type of a validated create-transaction body. */
export type CreateTransactionBody = z.infer<typeof CreateTransactionBody>;
