/**
 * In-memory {@link IdempotencyStore} adapter backed by a `Map`. Non-persistent
 * and unbounded (no eviction/TTL), so idempotency keys are only remembered for the
 * lifetime of the process — adequate for local development.
 */
import type { IdempotencyRecord, IdempotencyStore } from "./idempotency.store.ts";

export class InMemoryIdempotencyStore implements IdempotencyStore {
  #store = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | undefined> {
    return this.#store.get(key);
  }

  async put(key: string, record: IdempotencyRecord): Promise<void> {
    this.#store.set(key, record);
  }
}
