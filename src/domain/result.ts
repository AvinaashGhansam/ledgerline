/**
 * `Result` type and helpers for modeling *expected* failures as return values
 * rather than thrown exceptions, so the type system forces callers to handle them.
 */

/**
 * The outcome of an operation that can fail in an expected way: either a success
 * carrying a `value` of type `T`, or a failure carrying an `error` of type `E`.
 * Discriminate on the `ok` flag.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a success result. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Construct a failure result. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Exhaustiveness guard for discriminated unions. Reaching it is a compile error
 * (its parameter is `never`) as long as every case is handled; at runtime — if an
 * unexpected variant slips through — it throws with the offending value.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled variant: ${stringify(value)}`);
};

/** Best-effort stringify for error messages; renders `bigint` as a string and never throws. */
const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v));
  } catch {
    return String(value);
  }
};
