// RFC 9457
import type { Response } from "express";

export const PROBLEM_CONTENT_TYPE = "application/problem+json";
const TYPE_BASE = "https://ledgerline/errors";

export type Problem = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [extension: string]: unknown;
};

export const problem = (input: {
  slug: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  extensions?: Record<string, unknown>;
}): Problem => ({
  ...input.extensions,
  type: `${TYPE_BASE}/${input.slug}`,
  title: input.title,
  status: input.status,
  ...(input.detail ? { detail: input.detail } : {}),
  ...(input.instance ? { instance: input.instance } : {}),
});

export const sendProblem = (res: Response, p: Problem): void => {
  res.setHeader("Content-Type", PROBLEM_CONTENT_TYPE);
  res.status(p.status).send(JSON.stringify(p));
};
