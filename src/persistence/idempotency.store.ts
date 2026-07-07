/**
 * The `IdempotencyStore` **port**: keyed storage of prior responses so a repeated
 * request carrying the same `Idempotency-Key` can be replayed instead of reprocessed.
 */

/**
 * A stored response for one idempotency key: the body {@link fingerprint} used to
 * detect payload mismatches, plus the original status and body to replay.
 */
export type IdempotencyRecord = {
  readonly fingerprint: string;
  readonly status: number;
  readonly body: unknown;
};

/** Persist and look up {@link IdempotencyRecord}s by key. `get` returns `undefined` if unseen. */
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  put(key: string, record: IdempotencyRecord): Promise<void>;
}
