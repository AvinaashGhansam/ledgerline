import type { Request, RequestHandler, Response } from "express";
import type { ZodError, ZodType, z } from "zod";

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

type Parsed<S extends ValidationSchemas> = {
  [K in keyof S]: S[K] extends ZodType ? z.infer<S[K]> : never;
};

type ValidatedHandler<S extends ValidationSchemas> = (
  req: Request,
  res: Response,
  data: Parsed<S>,
) => void | Promise<void>;

const formatIssues = (error: ZodError) => {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
};

const respond400 = (res: Response, error: ZodError) => {
  res.status(400).json({ error: "validation", issues: formatIssues(error) });
};

export const validate = <S extends ValidationSchemas>(
  schemas: S,
  handler: ValidatedHandler<S>,
): RequestHandler => {
  return async (req, res) => {
    const { body, params, query } = schemas;

    const parsed: { body?: unknown; param?: unknown; query?: unknown } = {};
    if (body) {
      const safeBody = body.safeParse(req.body);
      if (!safeBody.success) {
        respond400(res, safeBody.error);
        return;
      }
      parsed.body = safeBody.data;
    }

    if (params) {
      const safeParams = params.safeParse(req.params);

      if (!safeParams.success) {
        respond400(res, safeParams.error);
        return;
      }
      parsed.param = safeParams.data;
    }

    if (query) {
      const safeQuery = query.safeParse(req.query);

      if (!safeQuery.success) {
        respond400(res, safeQuery.error);
        return;
      }
      parsed.query = safeQuery.data;
    }

    return handler(req, res, parsed as unknown as Parsed<S>);
  };
};
