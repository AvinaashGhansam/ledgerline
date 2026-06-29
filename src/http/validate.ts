import type { Request, RequestHandler, Response } from "express";
import { type ZodType, z } from "zod";

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

type Parsed<S extends ValidationSchemas> = (
  req: Request,
  res: Response,
  data: Parsed<S>,
) => void | Promise<void>;
type ValidatedHandler<S extends ValidationSchemas> = (
  req: Request,
  res: Response,
  data: Parsed<S>,
) => void | Promise<void>;

export const validate = <S extends ValidationSchemas>(
  schema: S,
  handler: ValidatedHandler<S>,
): RequestHandler => {
  return async (req, res, next) => {
    // TODO:
  };
};
