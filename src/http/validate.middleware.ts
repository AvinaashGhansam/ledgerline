/**
 * Typed request-validation middleware: the boundary where untrusted input is
 * parsed with Zod before any handler runs. Handlers receive already-narrowed data
 * and never touch `req.body`/`req.params`/`req.query` directly.
 */
import type { Request, RequestHandler, Response } from "express";
import type { ReqId } from "pino-http";
import type { ZodError, ZodType, z } from "zod";
import { problem, sendProblem } from "./problem.ts";

/** The request parts to validate; each is an optional Zod schema. */
interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/** The validated data passed to a handler: each provided schema's inferred type. */
type Parsed<S extends ValidationSchemas> = {
  [K in keyof S]: S[K] extends ZodType ? z.infer<S[K]> : never;
};

/** A route handler that receives typed, pre-validated `data` alongside req/res. */
type ValidatedHandler<S extends ValidationSchemas> = (
  req: Request,
  res: Response,
  data: Parsed<S>,
) => void | Promise<void>;

const formatIssues = (error: ZodError) => {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
};

const respond400 = (res: Response, error: ZodError, id: ReqId) => {
  const p = problem({
    slug: "validation-error",
    title: "Validation Error",
    status: 400,
    extensions: { reqId: id, issues: formatIssues(error) },
  });
  sendProblem(res, p);
};

/**
 * Wrap a handler with request validation.
 *
 * Parses each provided part (`body`, then `params`, then `query`) with its Zod
 * schema. On the first failure it responds with a `400` `validation-error` problem
 * (the failing fields are reported in the `issues` extension) and the handler is
 * never called. On success the handler runs with a `data` object holding the
 * parsed, typed values.
 *
 * @param schemas - Zod schemas for the request parts to validate.
 * @param handler - The handler to run once validation passes.
 * @returns An Express `RequestHandler`.
 */
export const validate = <S extends ValidationSchemas>(
  schemas: S,
  handler: ValidatedHandler<S>,
): RequestHandler => {
  return async (req, res) => {
    const { body, params, query } = schemas;

    const parsed: { body?: unknown; params?: unknown; query?: unknown } = {};
    if (body) {
      const safeBody = body.safeParse(req.body);
      if (!safeBody.success) {
        respond400(res, safeBody.error, req.id);
        return;
      }
      parsed.body = safeBody.data;
    }

    if (params) {
      const safeParams = params.safeParse(req.params);

      if (!safeParams.success) {
        respond400(res, safeParams.error, req.id);
        return;
      }
      parsed.params = safeParams.data;
    }

    if (query) {
      const safeQuery = query.safeParse(req.query);

      if (!safeQuery.success) {
        respond400(res, safeQuery.error, req.id);
        return;
      }
      parsed.query = safeQuery.data;
    }

    return handler(req, res, parsed as unknown as Parsed<S>);
  };
};
