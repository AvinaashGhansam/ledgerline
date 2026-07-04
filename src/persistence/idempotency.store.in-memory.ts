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
