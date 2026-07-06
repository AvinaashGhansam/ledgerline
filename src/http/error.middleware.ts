import type { ErrorRequestHandler } from "express";
import type { Logger } from "../observability/logger.ts";
import { problem, sendProblem } from "./problem.ts";

export const centralErrorHandler = (logger: Logger): ErrorRequestHandler => {
  return (err, req, res, _next) => {
    logger.error({ err, reqId: req.id }, "Unhandled exception caught by central error middleware");

    const p = problem({
      slug: "internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred. Please try again later.",
      instance: req.originalUrl,
    });
    sendProblem(res, p);
  };
};
