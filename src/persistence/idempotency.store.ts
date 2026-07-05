export type IdempotencyRecord = {
  readonly fingerprint: string;
  readonly status: number;
  readonly body: unknown;
};

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  put(key: string, record: IdempotencyRecord): Promise<void>;
}
