/**
 * A source of unique identifier strings, injected into repositories so id
 * generation (e.g. `crypto.randomUUID`) is a swappable, testable dependency.
 */
export type IdGenerator = () => string;
