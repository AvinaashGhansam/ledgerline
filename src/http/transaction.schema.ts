import { z } from "zod";

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

export type CreateTransactionBody = z.infer<typeof CreateTransactionBody>;
