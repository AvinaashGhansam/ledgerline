/**
 * RFC 9457 (Problem Details for HTTP APIs) machinery.
 *
 * Generic and domain-agnostic: the {@link Problem} shape, a {@link problem}
 * builder, and a {@link sendProblem} sender. Mapping specific domain concepts to
 * problems lives in `domain-error.mapper.ts`, not here.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */
import type { Response } from "express";

/** Media type for problem responses, per RFC 9457. */
export const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** Base URI for problem `type` values; the per-problem slug is appended to it. */
const TYPE_BASE = "https://ledgerline/errors";

/**
 * A Problem Details object. `type`/`title`/`status`/`detail`/`instance` are the
 * RFC 9457 members; the index signature permits arbitrary top-level extension
 * members (e.g. `issues`, `currencies`).
 */
export type Problem = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [extension: string]: unknown;
};

/**
 * Build a {@link Problem} from a stable `slug` plus per-occurrence fields.
 *
 * The `type` URI is derived as `${TYPE_BASE}/${slug}`. Absent optional fields are
 * omitted rather than set to `undefined`. Extension members are spread **first**,
 * so the reserved fields always win if an extension key collides with one.
 *
 * @param input - `slug` and `title`/`status` (required) plus optional `detail`,
 *   `instance`, and `extensions`.
 */
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

/**
 * Write a problem to the response with the RFC 9457 content type and its status.
 *
 * Sets `Content-Type` explicitly before serializing so Express does not override
 * it with `application/json`.
 */
export const sendProblem = (res: Response, p: Problem): void => {
  res.setHeader("Content-Type", PROBLEM_CONTENT_TYPE);
  res.status(p.status).send(JSON.stringify(p));
};
