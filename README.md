# Ledgerline

A small, strongly-typed **double-entry ledger API** built on Node.js and Express 5.

Every movement of money is recorded as a *transaction* made of two or more *postings* that
must sum to zero — the accounting invariant that guarantees the books always balance. Ledgerline
enforces that invariant in the domain layer, represents money as exact integers (never floats),
and returns machine-readable errors in the [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
`application/problem+json` format.

> **Status:** early development. Storage is currently **in-memory**, so all data is lost when the
> process restarts, and there is **no authentication** yet. It is a learning/portfolio codebase,
> not production software. See [Roadmap](#roadmap).

---

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Core concepts](#core-concepts)
- [API reference](#api-reference)
- [Error model](#error-model)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

---

## Requirements

- **Node.js ≥ 24.** Ledgerline runs TypeScript source directly (native type stripping), so there
  is no build step for local development. Node 24+ is required for this to work.
- **npm** (ships with Node).

No database or other external services are needed — persistence is in-memory.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env
# then edit .env and set a port, e.g. PORT=3000

# 3. Run in watch mode
npm run dev
```

The server logs a `server listening` line once it is up. By default it listens on
`http://localhost:3000`.

### A complete walkthrough

Create two accounts, move money between them, and read a balance. Amounts are **integer strings in
the currency's minor unit** (cents for USD) — see [Money & amounts](#money--amounts).

```bash
BASE=http://localhost:3000

# Create a source and a destination account (both USD)
SRC=$(curl -s -X POST $BASE/accounts -H 'Content-Type: application/json' \
  -d '{"currency":"USD","type":"asset"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

DST=$(curl -s -X POST $BASE/accounts -H 'Content-Type: application/json' \
  -d '{"currency":"USD","type":"expense"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# Post a balanced transaction: -$1.00 from SRC, +$1.00 to DST (postings sum to zero)
curl -s -X POST $BASE/transactions \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: demo-key-1" \
  -d "{\"memo\":\"first move\",\"postings\":[
        {\"accountId\":\"$SRC\",\"amount\":\"-100\"},
        {\"accountId\":\"$DST\",\"amount\":\"100\"}]}"

# Read the destination balance -> {"currency":"USD","balance":"100"}
curl -s $BASE/accounts/$DST/balance
```

---

## Configuration

Configuration comes from environment variables, validated at startup with [Zod](https://zod.dev).
If a variable is present but invalid, the process prints the problem and exits.

| Variable     | Type / allowed values                                                     | Default        | Description                          |
|--------------|---------------------------------------------------------------------------|----------------|--------------------------------------|
| `PORT`       | positive integer                                                          | `3000`         | Port the HTTP server binds to.       |
| `NODE_ENV`   | `development` \| `test` \| `production`                                   | `development`  | Runtime environment.                 |
| `LOG_LEVEL`  | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent`  | `info`         | Minimum log level (pino).            |

`npm run dev` loads these from `.env` automatically (`--env-file=.env`).

---

## Core concepts

### Money & amounts

Money is represented as **exact integers in the currency's smallest (minor) unit** — cents for
USD/EUR, pence for GBP — using JavaScript `bigint` internally. This avoids all floating-point
rounding error.

Over the wire, amounts are **strings** of those integer minor units:

| You mean | You send   | Currency |
|----------|------------|----------|
| $1.00    | `"100"`    | USD      |
| $0.05    | `"5"`      | USD      |
| −$1.00   | `"-100"`   | USD      |
| €10.00   | `"1000"`   | EUR      |

Amounts must match the pattern `^-?\d+$` (optional leading minus, then digits). Decimal points,
currency symbols, and thousands separators are rejected.

Supported currencies: **`USD`, `EUR`, `GBP`**.

### Accounts

An account has an `id`, a `currency`, a `type` (one of `asset`, `liability`, `equity`, `revenue`,
`expense`), and a `status` (`open` on creation). Accounts are single-currency: the currency is
fixed at creation and every posting against the account is denominated in it.

### Transactions & postings

A transaction is an atomic set of **postings**. Each posting names an `accountId` and an `amount`.
Two rules are enforced:

1. **At least two postings.**
2. **The postings must sum to exactly zero** (double-entry). Debits and credits balance.

A posting does **not** carry its own currency — the currency is taken from the referenced account.
Because the sum-to-zero check requires a common currency, **every account referenced in a single
transaction must share the same currency**; mixing currencies is rejected.

### Idempotency

`POST /transactions` accepts an optional `Idempotency-Key` request header. The server stores a
SHA-256 fingerprint of the request body against the key:

- **Same key + identical body** → the original `201` response is replayed; no duplicate
  transaction is created.
- **Same key + different body** → `409 Conflict` (`idempotency-conflict`).
- **No key** → the request is processed normally with no idempotency protection.

---

## API reference

Base URL: `http://localhost:{PORT}`. All request and response bodies are JSON. Successful responses
use `application/json`; all errors use `application/problem+json` (see [Error model](#error-model)).

### `GET /healthz`

Liveness probe. Always `200`.

```json
{ "status": "ok" }
```

### `GET /readyz`

Readiness probe. Always `200`.

```json
{ "status": "ready" }
```

### `POST /accounts`

Create an account.

**Request body**

| Field      | Type   | Required | Allowed values                                          |
|------------|--------|----------|---------------------------------------------------------|
| `currency` | string | yes      | `USD`, `EUR`, `GBP`                                      |
| `type`     | string | yes      | `asset`, `liability`, `equity`, `revenue`, `expense`    |

**`201 Created`**

```json
{
  "id": "3f2a…",
  "currency": "USD",
  "type": "asset",
  "status": "open"
}
```

**Errors:** `400` (validation).

### `GET /accounts/:id`

Fetch an account by id.

**`200 OK`** — the account object (same shape as the create response).

**Errors:** `404` (`account-not-found`).

### `GET /accounts/:id/balance`

Return the account's current balance, computed by summing all postings against it.

**`200 OK`**

```json
{ "currency": "USD", "balance": "100" }
```

`balance` is an integer string in minor units.

**Errors:** `404` (`account-not-found`).

### `POST /transactions`

Post a balanced transaction.

**Headers**

| Header            | Required | Description                          |
|-------------------|----------|--------------------------------------|
| `Idempotency-Key` | no       | See [Idempotency](#idempotency).     |

**Request body**

| Field                 | Type              | Required | Notes                                            |
|-----------------------|-------------------|----------|--------------------------------------------------|
| `postings`            | array             | yes      | At least 2 items; must sum to zero.              |
| `postings[].accountId`| string            | yes      | Must reference an existing account.              |
| `postings[].amount`   | string            | yes      | Integer minor units, pattern `^-?\d+$`.          |
| `memo`                | string            | no       | Free-text description.                           |

**Example**

```json
{
  "memo": "first move",
  "postings": [
    { "accountId": "3f2a…", "amount": "-100" },
    { "accountId": "9b71…", "amount": "100" }
  ]
}
```

**`201 Created`**

```json
{
  "id": "c04e…",
  "memo": "first move",
  "postings": [
    { "accountId": "3f2a…", "amount": "-100", "currency": "USD" },
    { "accountId": "9b71…", "amount": "100", "currency": "USD" }
  ]
}
```

**Errors:**

| Status | Problem type              | When                                                             |
|--------|---------------------------|------------------------------------------------------------------|
| `400`  | `validation-error`        | Malformed body, fewer than 2 postings, or bad amount format.     |
| `404`  | `account-not-found`       | A posting references an account that does not exist.             |
| `409`  | `idempotency-conflict`    | `Idempotency-Key` reused with a different body.                  |
| `422`  | `unbalanced-transaction`  | Postings do not sum to zero.                                     |
| `422`  | `mixed-currency`          | Postings reference accounts of differing currencies.            |

---

## Error model

Every error response is [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem Details, sent
with `Content-Type: application/problem+json`. The shape:

```json
{
  "type": "https://ledgerline/errors/unbalanced-transaction",
  "title": "Transaction postings must sum to zero",
  "status": 422,
  "detail": "delta=200"
}
```

- `type` — a stable URI identifying the problem kind (the last path segment is the stable slug).
- `title` — a stable, human-readable summary of the kind.
- `status` — the HTTP status code, repeated in the body.
- `detail` *(optional)* — specifics about this occurrence.
- Some problems add **extension members**: validation errors include an `issues` array; mixed
  currency includes `currencies`; several include a `reqId` for log correlation.

Internal/unexpected failures return a generic `500` (`internal-server-error`) with **no stack
trace or internal message** — details are logged server-side only.

### Problem catalog

| Status | `type` slug              | Meaning                                              |
|--------|--------------------------|------------------------------------------------------|
| `400`  | `validation-error`       | Request failed schema validation (`issues` extension).|
| `404`  | `account-not-found`      | Referenced account does not exist.                   |
| `404`  | `route-not-found`        | No route matches the request.                        |
| `409`  | `idempotency-conflict`   | `Idempotency-Key` reused with a different payload.    |
| `422`  | `unbalanced-transaction` | Postings do not sum to zero.                          |
| `422`  | `mixed-currency`         | Postings mix account currencies.                     |
| `500`  | `internal-server-error`  | Unexpected server error (leak-free).                 |

> A few additional problem types (`account-closed`, `insufficient-funds`) are defined in the domain
> and wired into the error mapper but are not yet reachable through the current API surface. They
> are reserved for upcoming validation and will be documented when active.

---

## Development

### Scripts

| Command             | What it does                                                        |
|---------------------|---------------------------------------------------------------------|
| `npm run dev`       | Start the server in watch mode with `.env` loaded.                  |
| `npm run build`     | Type-check and emit JavaScript to `dist/` (production build).       |
| `npm start`         | Run the built server from `dist/` (requires `npm run build` first). |
| `npm run typecheck` | Type-check with `tsc --noEmit`.                                     |
| `npm run lint`      | Lint and format-check with Biome.                                   |
| `npm run format`    | Auto-format with Biome.                                             |
| `npm test`          | Run the test suite with the built-in `node --test` runner.          |
| `npm run check`     | Run typecheck + lint + test together (use before committing).       |

### Tooling

- **TypeScript** — source runs directly on Node 24 with no build step for local development.
- **[Biome](https://biomejs.dev)** — linting and formatting.
- **`node --test`** — test runner.

---

## Roadmap

Planned, not yet implemented:

- **Persistent storage** — a PostgreSQL-backed repository behind the existing `LedgerRepository`
  port, with transactional, concurrency-safe posting.
- **Automated tests** — unit tests for the domain and integration tests that drive the running app.
- **Security & hardening** — authentication, authorization scoping, rate limiting, and security
  headers.
- **Observability & CI/CD** — richer metrics/tracing and a continuous-integration pipeline.
- **Additional validations** — account closing and insufficient-funds checks (see the reserved
  problem types above).

---

## License

MIT