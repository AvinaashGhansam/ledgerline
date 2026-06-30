import { Router } from "express";
import { createAccount, getAccount } from "../../application/accounts.ts";
import type { LedgerRepository } from "../../persistence/repository.ts";
import { AccountParams, CreateAccountBody } from "../schemas.ts";
import { validate } from "../validate.ts";

export const accountsRouter = (repo: LedgerRepository): Router => {
  const router = Router();

  router.post(
    "/",
    validate({ body: CreateAccountBody }, async (_req, res, data) => {
      const account = await createAccount(repo, data.body);
      res.status(201).json(account);
    }),
  );

  router.get(
    "/:id",
    validate({ params: AccountParams }, async (req, res, data) => {
      const account = await getAccount(repo, data.params.id);

      if (!account) {
        res.status(404).json({ requestId: req.id, error: "not_found" });
        return;
      }
      res.status(200).json(account);
    }),
  );
  return router;
};
