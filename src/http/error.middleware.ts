/**
 * Central error boundary for the HTTP app: the catch-all for anything *thrown*
 * (as opposed to expected failures, which controllers return and map explicitly).
 */
import type { ErrorRequestHandler } from "express";
import type { Logger } from "../observability/logger.ts";
import { problem, sendProblem } from "./problem.ts";

/**
 * Build Express's four-argument error-handling middleware.
 *
 * Logs the full error server-side (with request id), then responds with a generic
 * `500` problem that leaks **no** stack trace or internal message. If the response
 * has already started streaming (`headersSent`), it delegates to `next(err)` so
 * Express can abort the connection rather than throwing on a double write.
 *
 * Must be registered **last** in the middleware chain to catch everything above it.
 *
 * @param logger - Structured logger for recording the internal error detail.
 */
export const centralErrorHandler = (logger: Logger): ErrorRequestHandler => {
  return (err, req, res, next) => {
    logger.error({ err, reqId: req.id }, "Unhandled exception caught by central error middleware");

    if (res.headersSent) {
      return next(err);
    }

    const p = problem({
      extensions: { reqId: req.id },
      slug: "internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred. Please try again later.",
      instance: req.originalUrl,
    });
    sendProblem(res, p);
  };
};
