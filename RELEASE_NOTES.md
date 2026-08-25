# PLIN v0.1.7 — Release Notes

**Release date:** 2026

---

## What is PLIN 0.1.7?

PLIN is the new name and package for the Intent-Oriented Programming Language
formerly published as `@ayoxx/plain-code`. Same language, same `.pln` files,
same deterministic compiler — now with a real production build model and a
local-devDependency workflow instead of a global install.

## What's new?

### The `plin` npm package (breaking identity change)

- Install per project: `npm install --save-dev plin`. No global install.
- CLI commands: `plin build | run | start | init | new | install | add |
  remove | update | check | fmt | doctor`.
- Old binaries (`plain`, `plain-code`) are removed.

### Production builds (`plin build`)

- Sources compile to `dist/` preserving names and structure:
  `src/messi.pln` → `dist/messi.js`, nested folders included.
- Imports are bundled into each output, so every file in `dist/` runs
  standalone under Node.
- Deterministic output: rebuilds are byte-identical.

### Project configuration (`plin.config.json`)

- Replaces `plain.json`. Keys: `outDir` (default `"dist"`), `srcDir`
  (default `"src"` when present, else the project root), optional `entry`,
  plus `name`/`version`/`dependencies` for dependency management.
- Discovery never scans `node_modules`, hidden directories, or the output
  directory itself.

### npm-package building

- A library written in PLIN ships like any Node package: `src/index.pln`
  builds to `dist/index.js`; consumers `require()` the result through normal
  `package.json` semantics. Nothing PLIN-specific reaches your users.

### Breaking changes

- Package name, binaries, and config file changed; see UPGRADE_GUIDE.md.
- `_plain_out.js` no longer exists: `plin run` works from an external scratch
  directory and leaves your project untouched.
- Language syntax is unchanged.

---

# Plain v2.1.2 — Release Notes

**Release date:** 2026

---

## What's new in v2.1.2?

### Pairing numbers from any value

- `login pairing` accepts any Plain value, not only a string literal:

  ```plain
  ask "WhatsApp number: " as phone

  whatsapp bot
      auth "session"
      login pairing phone
  done
  ```

- String literals keep compile-time validation; the value form is validated
  at startup with the same teaching message before connecting.
- `ask "<prompt>" as <name>` (Node `readline` terminal input, async handled
  for you) is confirmed as a general Plain capability and is now covered by
  deterministic compiler and runtime tests, including its use in pairing.

### Breaking changes

- None. Existing Plain syntax is unchanged; the literal pairing form behaves
  exactly as before.

---

# Plain v2.1.1 — Release Notes

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
  suite now 595 tests (603 as of v2.1.2).

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
