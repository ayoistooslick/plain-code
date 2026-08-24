# Plain v2.1.1 — Release Notes

**Release date:** 2026

---

## What is Plain 2.1.1?

Plain is an Intent-Oriented Programming Language (IOPL) with a fully
deterministic compiler: everything compiles offline, for free, with no
hidden codegen. You describe **what** you want; the compiler decides **how**
to implement it in JavaScript.

> An Intent-Oriented Programming Language where backend services — databases,
> HTTP clients, auth, sessions, uploads, rate limiting, OAuth — are
> first-class language features.

## What's in v2.1.1?

### Portable databases (SQLite native or WebAssembly)

- `database "app.db"` probes for the native `better-sqlite3` driver and falls
  back to pure-WebAssembly SQLite (`sql.js`) when it cannot load.
- `plain install` verifies the native driver actually opens a database.
- Explicit engines: `using "native"` or `using "wasm"`; unknown drivers fail
  at compile time. The WebAssembly engine persists to disk after every write.
- Fixed: transactions run their body exactly once on both engines.

### HTTP client

- `get "…"` / `post url with body` / `put` / `patch` / `delete "<url>"`,
  with optional `headers { … }` and `timeout <ms>` clauses.
- Responses are records (`ok`, `status`, `headers`, `data`); JSON parses
  automatically; 30-second default timeout.

### Auth, sessions and web middleware

- scrypt passwords: `hashPassword`, `checkPassword`.
- HMAC tokens: `createToken(payload, secret [, ttl])`, `readToken(token, secret)`.
- Signed-cookie sessions: `enable sessions "<secret>"`,
  `session of request`, `destroy session`.
- Uploads: `accept uploads limit "5 MB" allow […] folder "…"`,
  `upload("field")` / `uploads("field")` (HTTP 413/415 enforced).
- Cookies: `set cookie … [expires in …]`, `cookie("name")`, `clear cookie`.
- `require api key from env("…")`, `rate limit 100 requests per minute`.
- Google OAuth: `google oauth` blocks with `id` / `secret` / `callback` /
  `landing`.
- Custom 404: `when nothing matches ... done`.
- Error handling: `try ... recover ... done`, `retry N times every M seconds`.

### WhatsApp bots

- `whatsapp bot ... done` with `auth "<folder>"`, `login qr` or
  `login pairing "<number>"` (compile-time E.164 validation), and
  `on message ... done` handlers.
- Handlers read the normalized record via `message.text`, answer with
  `reply`, and can dump everything with `log message`.
- Baileys (`@whiskeysockets/baileys`) powers it behind the scenes: QR +
  pairing linking, credential persistence, reconnects — installed and hidden
  by the compiler.

### Language core additions

- Boolean/null literals: `true`, `false`, `null`.
- Arithmetic operators `+ - * / %`, unary minus, parenthesised grouping with
  standard precedence.
- String escapes: double-quoted strings decode `\n`, `\t`, `\\`, `\"`;
  multiline backtick strings survive escaped backticks.

### Examples and tests

- New acceptance examples: `examples/football-backend/` and
  `examples/id-verification/`, booted over live HTTP by
  `tests/acceptance.test.js`.
- New example `examples/whatsapp-bot/` (`qr.pln`, `pairing.pln`).
- New feature suites `tests/v211.test.js` and `tests/whatsapp.test.js`; full
  suite now 595 tests.

### Breaking changes

- No existing Plain syntax was removed or changed.

---

## Installation

```bash
npm install -g @ayoxx/plain-code
```

## Upgrade

See `UPGRADE_GUIDE.md`. Existing Plain programs continue to work unchanged.

---

# Previous releases

See the [CHANGELOG](CHANGELOG.md) for v2.1.0 (backend capabilities), v2.0.0
(Telegram deterministic syntax) and earlier release details.
