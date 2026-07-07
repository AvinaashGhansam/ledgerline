import type { ErrorRequestHandler } from "express";
import type { Logger } from "../observability/logger.ts";
import { problem, sendProblem } from "./problem.ts";

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
