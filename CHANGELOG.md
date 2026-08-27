# Changelog

All notable changes to PlainScript are documented here.

---

## [2.2.0] — 2026

### AI / ML and data / storage & web additions

Broadens the intent-oriented surface with AI/ML, data/storage and web features.

- **AI / ML (builtin `ai`):** `chat(model, messages, options)` — OpenAI-compatible
  LLM chat completion (async); `embedText(model, text, options)` — text embeddings;
  `similarity(a, b)` — cosine vector similarity (-1..1); plus `ai_tags(text)` and
  `ai_post(subject, ideas, options)` conveniences. Reads `OPENAI_API_KEY`/
  `OPENAI_BASE_URL`, overridable via options.
- **Data / storage:** `paginate(list, page, perPage)` returns
  `{ items, count, page, pages, perPage, hasNext, hasPrev }`; the `cache` builtin
  now falls back to an in-memory Map store with TTL (`__cacheGet/__cacheSet/__cacheDelete`)
  when no Redis is configured, so naive caching works out of the box.
- **Web / full-stack:** route-scoped `body(...)` accessor (`body()` raw,
  `body("field")` field) with route-guarded teaching errors; `redirect to "<url>"`
  statement maps to `res.redirect(...)`.
- **Collections & strings (`coll`):** `range`, `clamp`, `first`, `last`, `flatten`,
  `includes`, `pick`, `omit`, `groupBy`, `startsWith`, `endsWith`, `truncate`,
  `padStart`, `padEnd`. (`contains` is a reserved lexer keyword, so the membership
  helper is `includes`.)

---

## [1.0.0-beta] — 2026

### Capability-gap audit vs. TypeScript + Node.js

This release closes a systematic audit of TypeScript/Node.js capabilities from an
**Intent-Oriented** point of view — every gap is addressed *in PlainScript's own
grammar* or explicitly documented as unnecessary. The full audit, with per-area
status and rationale, lives in `docs/CAPABILITY_GAP_AUDIT.md`. PlainScript is
deliberately **not** declared 1.0.0-ready until that audit is complete; `1.0.0-beta`
reflects that it now is.

### New IOPL-native capabilities

- **Record kinds (classes, IOPL-style):** `define a kind called "Person" with name is "" done`
  declares a compile-checked record schema; `create a Person with name "Ada" and age 17`
  builds instances. Unknown fields fail at runtime; records stay plain objects
  (JSON, DB, mail, etc. work unchanged). Composition via `merge` replaces inheritance.
- **Concurrency combinators:** `all of [... ]`, `any of [...]`, `settled of [...]`
  over Promise-combinators, plus `withTimeout(promise, ms)`.
- **Generators:** `yield <expr>` turns a `make ... done` into a generator
  (`function*`); `for each` and `spread of` consume them lazily.
- **Reflection:** `typeOf`, `fieldsOf`, `valueOf`, `hasField`, `sizeOf`.
- **Binary data:** `base64Encode`/`base64Decode`, `textToBytes`/`bytesToText`,
  and `sha256`/`sha1`/`md5` digests.
- **Serialization & config:** dependency-free `yamlDecode`/`yamlEncode` (mappings,
  sequences, scalars) and `load env file ".env"` (applies `KEY=VALUE` to `process.env`).
- **CLI & processes:** `args()` returns `process.argv.slice(2)`; `runCommand(cmd, args)`
  captures `{ ok, code, stdout, stderr }`.
- **Filesystem & path:** `fileSize`, `fileType`, `lastModified`, `walkFolder`,
  `joinPath`, `baseName`, `folderOf`, `extensionOf`.
- **Streams:** `writeLine`/`appendLine` for line-oriented appends.
- **Collections:** `keyMap`/`mapSet`/`mapGet`/`mapHas`/`mapDelete` and
  `newSet`/`addToSet`/`removeFromSet`/`setHas` wrapping JS `Map`/`Set`.
- **Dynamic modules:** `loadModule("./m")` requires a module at runtime.
- **Native test DSL:** `test "name" ... done` with `check a equals b`,
  `check a contains b`, `check a is b`, `check <expr> raises "msg"`; a built-in
  runner prints `PASS/FAIL` and exits non-zero on failure.
- **Exports:** `export <name>` marks a top-level symbol for `module.exports`.

### Fixed

- Lexer keyword lookup no longer leaks `Object.prototype` members (`valueOf`,
  `constructor`, `toString`, ...) as tokens — a latent prototype-pollution bug.

### New tests

- `tests/audit.test.js` exercises every new capability via compile-time and
  runtime assertions (36 tests). Total suite remains green (457 compiler + 36 audit).

---

## [0.1.7] — 2026

### First release of PlainScript

PlainScript is an Intent-Oriented Programming Language (IOPL): you describe **what**
you want, and the deterministic compiler decides **how** to implement it in
JavaScript. The `.ps` extension and the whole language ship complete in this
release.

- **npm package `plainscript`.** Installs per project as a devDependency:

  ```bash
  npm install --save-dev plainscript
  ```

  No global install is required anywhere in the deployment story. Projects
  use it through npm scripts:

  ```json
  {
    "scripts": { "build": "plainscript build", "start": "node dist/index.js" },
    "devDependencies": { "plainscript": "^0.1.7" }
  }
  ```

- **`plainscript build` compiles a real production build.** Sources compile into
  `dist/`, preserving source file names and directory structure relative to
  the source root (`src/messi.ps` → `dist/messi.js`,
  `src/a/b.ps` → `dist/a/b.js`). Every entry is bundled with its imports,
  so each file in `dist/` runs standalone. Compilation is deterministic:
  identical sources produce byte-identical output.
- **Zero-config production build** — `plainscript build` auto-discovers `.ps` files
  under `src/` and compiles each to `dist/`, preserving file names and directory
  structure (`src/messi.ps` → `dist/messi.js`, `src/a/b.ps` → `dist/a/b.js`).
  Every entry is bundled with its imports, so each file in `dist/` runs standalone.
  Compilation is deterministic: identical sources produce byte-identical output.
- **Full CLI:** `plainscript build | run | start | new | install | add | remove |
  remove | update | check | fmt | doctor | version | help`.
- **Complete language:** variables, conditions, functions, arrays, objects,
  loops, string templates with `${...}` interpolation, PlainScript Expressions,
  multi-file projects, and a JavaScript Gateway with full async support.
- **Deterministic backend capabilities** compiled by the same compiler — web
  apps and routing, SQLite (native or WebAssembly) and PostgreSQL databases
  with transactions, sessions with signed cookies, password hashing and HMAC
  tokens, Google OAuth, file uploads, OCR, cookies, rate limiting, email,
  cron and background jobs, WebSocket servers, and Redis-backed caching.
- **WhatsApp bots** through Baileys with QR or pairing-code linking,
  compile-time pairing-number validation, and automatic reconnection.
- **Editor support:** a VS Code extension (`plainscript-vscode/`) and an Acode
  plugin (`plainscript-acode/`) whose highlighting is generated from the same
  token table the compiler uses.
