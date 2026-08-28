# PlainScript 1.0.1 — Capability-Gap Audit vs. TypeScript / Node.js

> **Purpose.** PlainScript's goal is **capability parity**, not syntax parity, with
> modern TypeScript + Node.js. We do not clone TypeScript's syntax or its static
> type system; we keep PlainScript an **Intent-Oriented Programming Language**
> (IOPL) — you describe *what* you want, and the deterministic compiler decides
> *how* to implement it in JavaScript.
>
> This document is the complete working audit for the 1.0.1 milestone. For every
> major TypeScript/Node.js capability area, it records:
>
> - **Status** — what PlainScript 1.0.1 already does,
> - **Gap** — what is missing for real-world capability parity,
> - **Resolution** — either an *IOPL-native implementation* (shipped in this
>   release and covered by tests) or an explicit *rationale* for why the
>   capability is unnecessary / already supplied by the host runtime.
>
> **Gate:** PlainScript must NOT be declared 1.0.1 "ready" until this audit is
> complete and its shipped resolutions are exercised by the test suite.
>
> ---

## 0. The design contract (why IOPL ≠ TypeScript)

Two deliberate departures make PlainScript *better suited* to its job rather
than weaker:

1. **No static type system is needed for the 80% target.** TypeScript's type
   annotations exist to give an editor/compiler enough information to *predict*
   program behaviour. In PlainScript the value graph is constructed by the
   compiler itself (deterministic, whole-module bundling), and runtime behaviour
   is JavaScript. Structural, runtime-checked *record kinds* (see §8) give the
   same safety at the boundaries that "shape" typing would, without a type
   grammar the programmer must learn. **Resolution: unnecessary as a syntax;
   provided as runtime record kinds.**
2. **`any`-style type erasure is the norm.** Because we compile to JavaScript,
   every TypeScript capability that is *implementable in JS* is automatically
   available to PlainScript programmers through the JavaScript Gateway (§18) and
   the runtime stdlib. The compiler exposes the *meaningful* subset as first-class
   IOPL so the common 80% reads like prose.

Everything below is measured against "can a PlainScript program, shipped as
normal Node `dist/`, do what the TypeScript program can?"

---

## 1. Advanced typing & generics

| TypeScript                         | PlainScript resolution |
|------------------------------------|------------------------|
| Interfaces / type aliases            | **IOPL-native `kind` record schema** (§8). Declares fields + defaults; compile-checked constructors. |
| Generics `<T>`                       | **Rationale: unnecessary.** PlainScript functions are untyped by design; JavaScript enforces runtime shapes. For generic *containers* (Map, Set, Promise<T>), use the JS Gateway or runtime stdlib, which are naturally generic. Provide `isArray`, `isText`, `isNumber` runtime predicates instead. |
| Unions / literals                    | **Rationale: unnecessary.** `match <expr> against ... done` (existing) exhaustively branches on runtime values. |
| Optional / default params            | **IOPL-native** — `make f(x, y as 0)` (existing, RFC-0011). |
| Rest params / spread                 | **IOPL-native `spread of`** — see §6 collections. |
| Non-null / optional chaining         | **Runtime null-safety stdlib** — `valueOf(key, fallback)`, `hasField(rec, key)` (§13). Avoids `?.` syntax. |
| `typeof`/`keyof` type queries        | **Runtime reflection stdlib** — `typeOf(x)`, `fieldsOf(x)` (§13). |
| Mapped / conditional types           | **Rationale: unnecessary** (type-level metaprogramming; no runtime value). |
| Tuples / fixed-size arrays            | **`tuple` record kind** — construct via `kind` with `fields`; runtime validated. |
| Readonly / const assertions           | **Rationale: unnecessary** (const-like behaviour via JS `const` output; compiler already emits `let`/`const` as needed). |

**Audit status:** Runtime reflection + record kinds ship; type grammar deliberately
omitted (rationale above). **Gap closed for 80% target.**

---

## 2. Modules / imports / exports

| TypeScript             | PlainScript resolution |
|------------------------|------------------------|
| ES `import`/`export`   | **Exists**: `import "./file.ps"` (§ bundler), top-level `make` auto-exported to `module.exports`. |
| Named imports          | **IOPL-native `import ... from`** — `import { name } from "./util.ps"` binds only named symbols (this release). |
| Dynamic `import()`     | **Runtime stdlib `loadModule(path)`** returning the required module (this release). |
| Circular imports       | **Compile-time error** with a friendly cycle report (existing) — safer than TS's hoisted partials. |
| Barrel files           | **Works** — `import "./index.ps"` where index imports the rest (existing bundler de-dups). |
| `import type`          | **Rationale: unnecessary** — searchable types). |
| Node built-ins         | **Runtime stdlib** `use fs`, `use path`, and IOPL `read/write/...` (existing). |

**Audit status:** Named imports + dynamic `loadModule` ship; barrel/cycle behaviour
already present. **Gap closed.**

---

## 3. Async / await & concurrency

| TypeScript              | PlainScript resolution |
|-------------------------|------------------------|
| `async`/`await`          | **IOPL `wait for <expr>`** (existing, RFC-0011 §10); `run`/`ask`/queries auto-await. |
| `Promise.all`            | **IOPL-native `all of [e1, e2, ...]`** (this release). |
| `Promise.race`           | **IOPL-native `any of [e1, e2, ...]`** (this release). |
| `Promise.allSettled`     | **IOPL-native `settled of [e1, e2, ...]`** returning `{ status, value/error }` records (this release). |
| `await Promise.all([...])` in one line | `all of [...]` is already awaited — `remember results as all of [a(), b()]`. |
| Worker threads / parallel jobs | **IOPL-native `run in parallel ... done [as results]`** (existing, RFC-0011 ¶9) and `run background <call>` (existing). |
| Cancellation / AbortController | **Runtime `withTimeout(promise, ms)`** raises on timeout (this release). |

**Audit status:** `all/any/settled of`, `withTimeout` ship on top of the existing
`wait for`/`run in parallel`. **Gap closed.**

---

## 4. Classes / object systems

The single biggest capability TypeScript users expect from a language. PlainScript
delivers it IOPL-native as **record kinds** — a compile-time-checked schema plus a
prose constructor — rather than `class`/`new`/`extends` syntax.

```
define a kind called "Person" with
    name is ""
    age is 0
done

remember ada as create a Person with name "Ada" and age 17
show name of ada                // "Ada"
```

- Fields declared with defaults; constructors **prompt for missing required
  fields** at compile time; unknown constructor fields are a compile error.
- Kind objects are plain JS objects, so `jsonEncode`, `sendMail`, DB rows,
  and every existing stdlib works on them unchanged.
- Attach behaviour with ordinary `make` functions that take the record
  (`make describe(person)  give name of person + " is " + age of person`).
- **Inheritance** is deliberately *composition-first*: `kind` + stdlib
  `merge(a, b)` (existing) covers the 80%. Deep prototype chains are a
  TypeScript *syntax*, not a capability we need to replicate.

| TypeScript              | PlainScript resolution |
|-------------------------|------------------------|
| `class`, constructor     | **IOPL-native `kind` + `create a X with ...`** (this release). |
| Fields / properties      | `kind` fields; access via `name of x` / `x.name`. |
| Methods                  | Top-level `make` functions taking the record. |
| `this`                   | **Rationale: unnecessary** — functions receive the record explicitly (no context bugs). |
| `static` members         | Module-level`remember`/`make` are naturally static. |
| Extension / mixins       | `merge(a, b)` (existing) + nested kinds. |
| Access modifiers         | **Rationale: unnecessary** — single-process bundles; `_field` is convention. |

**Audit status:** Record kinds ship with tested constructors, field validation,
and JSON/serialization compat. **Gap closed.**

---

## 5. Iterators / generators

| TypeScript       | PlainScript resolution |
|------------------|------------------------|
| `for...of`        | `for each item in x ... done` (existing) — works on arrays, strings, Maps, Sets, generators. |
| Generator `function*` / `yield` | **IOPL-native `yield`** inside `make ... done` (this release) — a `make` containing `yield` compiles to a `function*`. |
| `[Symbol.iterator]` | Accessible via JS Gateway / `kind` producer (this release: `make` with `yield`). |
| Iterator helpers (`map`/`filter`/`reduce`) | **IOPL-native** `gather each ... giving`, `filter each ... when`, `total each ... giving` (existing, functional map/filter/reduce). |
| Spread `/ rest`     | **IOPL-native `spread of x`** unfolds an iterable into a new array (this release). |
| Lazy sequences      | Generators via `yield` + `for each` (this release). |

**Audit status:** Generators, spread, and functional iteration ship. **Gap closed.**

---

## 6. Collections

| TypeScript   | PlainScript resolution |
|--------------|------------------------|
| Array        | Literals `[...]`, `first/last/N-th from`, `length(x)`, `add/remove`, `gather/filter/total` (all existing). |
| Map          | **Runtime stdlib** `keyMap()`/`mapSet/mapGet/mapDelete/mapHas` wrapping JS `Map` (this release). |
| Set          | **Runtime stdlib** `set()`/`unique(x)` (unique exists) — `addToSet/removeFromSet` (this release). |
| Object       | `merge`, `keys`, `values`, `hasKey`, `of` chains (existing) + `fieldsOf` (this release). |
| Tuple        | **`kind` with positional fields** (§4). |

**Audit status:** Map/Set/`spread of` stdlib ship. **Gap closed.**

---

## 7. Decorators / metaprogramming

| TypeScript      | PlainScript resolution |
|-----------------|------------------------|
| Decorators      | **Rationale: unnecessary as syntax.** What decorators achieve — wrapping functions, logging, timing, auth — is done IOPL-natively with `when ... happens` pub/sub (existing), `run background`, and the JS Gateway. A bespoke `@` grammar adds complexity without new capability. |
| Method/class metadata | **Rationale: mostly unnecessary.** Since methods are top-level functions (no `this`), there is nothing to decorate. |
| `Proxy` / `Reflect` | **JS Gateway** exposes raw `Proxy`/`Reflect` when genuinely needed (existing). |

**Audit status:** Rationale documented; no decorator syntax. **No gap for 80%.**

---

## 8. Symbols / well-known keys

- **Rationale: unnecessary as a user-facing feature.** `Symbol` keys matter for
  iterator identity and library protocol, both of which are *inside* the compiler
  (generator `yield` uses `Symbol.iterator` transparently). Exposing `Symbol` as
  an IOPL statement would leak implementation detail without capability gain.
- When a library genuinely requires a user-provided symbol, the **JS Gateway**
  provides it.

**Audit status:** Rationale documented. **No gap.**

---

## 9. Proxies / reflection / duck typing

| TypeScript   | PlainScript resolution |
|--------------|------------------------|
| `Reflect.*`  | **Runtime reflection stdlib**: `typeOf(x)`, `fieldsOf(x)`, `hasField(rec, key)`, `valueOf(rec,key)`, `sizeOf(x)` (this release). |
| `Object.keys`| `keys(x)` (existing) / `fieldsOf(x)` (this release). |
| Duck typing  | Provided naturally: functions receive records and read `name of x` regardless of construction site. |

**Audit status:** Runtime reflection ships. **Gap closed.**

---

## 10. Binary data

| TypeScript / Node | PlainScript resolution |
|-------------------|------------------------|
| `Buffer`          | **Runtime stdlib** `textToBytes(s)`, `bytesToText(b)` (this release); `readBytes`/`writeBytes` exist. |
| `base64`          | **Runtime stdlib** `base64Encode(x)`, `base64Decode(s)` (this release). |
| `ArrayBuffer`/typed arrays | Accessible through `readBytes()` returning a `Buffer` and the JS Gateway. |
| CRC / hash        | `hashPassword` (existing) + `sha256(text)` (this release). |

**Audit status:** Binary + encoding stdlib ships. **Gap closed.**

---

## 11. Workers / processes

| TypeScript / Node | PlainScript resolution |
|-------------------|------------------------|
| Worker threads    | **IOPL-native `run in parallel ... done`** (existing) and `run background <call>` (existing). |
| Child processes   | **Runtime stdlib `runCommand(cmd, args)`** (async, captures stdout/stderr/exit) (this release). |
| `process.exit`    | `exit(code)` (existing); `env()` (existing). |
| Signals / IPC      | **Rationale: unnecessary for 80%** — batch/parallel covers CPU-bound; cross-process messaging is niche. JS Gateway for the rest. |

**Audit status:** Process execution ships; workers via existing parallel model.
**Gap closed.**

---

## 12. Filesystem

| Node fs            | PlainScript resolution |
|--------------------|------------------------|
| Read/write text    | `read`/`readFile`, `write`/`writeFile`, `appendFile` (all existing). |
| Binary             | `readBytes`/`writeBytes` (existing). |
| Metadata           | `fileExists`, `fileSize(path)`, `fileType(path)`, `lastModified(path)` (this release). |
| Directory ops      | `makeFolder`, `deleteFolder`, `listFolder` (existing), `walkFolder(dir)` recursive (this release). |
| Copy/move/delete   | `copyFile`, `moveFile`, `deleteFile` (existing). |
| Path helpers       | `joinPath`, `baseName`, `folderOf(path)`, `extensionOf(path)` (this release). |

**Audit status:** Filesystem suite extended to metadata/walk/path. **Gap closed.**

---

## 13. Streams

| Node stream        | PlainScript resolution |
|--------------------|------------------------|
| Read line-by-line  | **IOPL-native `stream "file" as line ... done`** (existing). |
| Write append       | `writeLine(file, text)` / `appendLine(file, text)` (this release). |
| Transform / pipe   | **Rationale: necessary via JS Gateway only** — stream pipelines are an implementation detail; `write`/`read`/`stream` cover I/O. |

**Audit status:** Stream I/O rounded out. **Gap mostly closed.**

---

## 14. Networking

| Node net/http            | PlainScript resolution |
|--------------------------|------------------------|
| HTTP server              | `web app` + `route` + `start` (existing) and Express form (existing). |
| HTTP client              | `get/post/put/patch/delete "<url>"` + `wait for fetch` (existing). |
| WebSocket server/client  | `websocket server on ...` (existing, server side). |
| TCP server / client      | **IOPL-native — omitted with rationale:** Node `net` is low-level; the 80% uses HTTP/WebSocket. Provided by JS Gateway on demand. |
| TLS / DNS / UDP          | **Rationale: omitted** (niche; JS Gateway / `use`). |

**Audit status:** HTTP/WS cover the target; TCP documented as rationale.
**Gap closed for 80%.**

---

## 15. Serialization / configuration

| TypeScript / Node | PlainScript resolution |
|-------------------|------------------------|
| JSON              | `jsonEncode`/`jsonDecode` (existing). |
| YAML              | **Runtime stdlib `yamlDecode(s)`/`yamlEncode(v)`** (this release). |
| `.env` files      | **IOPL-native `load env file "....env"`** statement + `envFile("path")` fallback (this release). |
| Config files      | `loadEnvFile`; plus `plainscript.config.json` build config (existing). |
| `.toml`           | **Rationale: niche** — YAML+JSON+env covers configuration; JS Gateway for TOML. |
| Binary serialization (msgpack/buffer) | `textToBytes`/`bytesToText`/`base64` (this release). |

**Audit status:** YAML + env-file configuration ship. **Gap closed.**

---

## 16. CLI tooling

| TypeScript / Node | PlainScript resolution |
|-------------------|------------------------|
| `process.argv`    | **Runtime stdlib `args()`** returns the command-line argument array (this release). |
| argparse prompts   | `ask "..." as x` (existing). |
| Subprocess CLI     | `runCommand` (this release, §11). |

**Audit status:** `args()` ships. **Gap closed.**

---

## 17. Testing

| TypeScript / Node | PlainScript resolution |
|-------------------|------------------------|
| Test runner       | **IOPL-native `test "name" ... done` blocks** with `check a equals b`, `check a is true`, `check raises` (this release). |
| Assertions        | `check a equals b` / `check a contains b` / `check a raises <msg>` (this release). |
| Suite grouping    | `test` blocks run in order; `check` failures print and exit `1` (this release). |

**Audit status:** A native test DSL ships — no external runner needed. **Gap closed.**

---

## 18. JavaScript Gateway (escape hatch)

The **JavaScript Gateway** (`javascript ... done`, RFC-0011 §10) is the universal
fallback that closes *every* remaining micro-gap — any of TypeScript's capabilities
that is expressible in JS is reachable here without leaving PlainScript. This
single feature is why the audit can be honest about the many "rationale: omitted"
rows without reducing capability parity.

**Audit status:** Preexisting; retained.

---

## 19. Package / library authoring

| Capability            | PlainScript resolution |
|-----------------------|------------------------|
| Publish npm library   | `plainscript build` → `dist/`; `main`/`prepare` in package.json (existing). |
| Named exports         | **IOPL-native `export <name>`** marks a top-level symbol for export; imported bindings re-exportable (this release). |
| Consumer API          | `module.exports` of top-level `make` (existing) + explicit `export` (this release). |
| `exports` map / ESM   | Standard `package.json` semantics (project model, existing). |

**Audit status:** export statement ships. **Gap closed.**

---

## 20. Summary scoring

| Area                       | Status |
|----------------------------|--------|
| Advanced typing/generics   | ✅ runtime kinds + reflection; type grammar rationalised |
| Modules/imports/exports    | ✅ named imports + loadModule + export |
| Async & concurrency        | ✅ all/any/settled of, withTimeout |
| Classes/objects            | ✅ record kinds |
| Iterators/generators       | ✅ yield + spread of |
| Collections                | ✅ Map/Set stdlib |
| Decorators/metadata        | ⚪ documented (unnecessary) |
| Symbols                    | ⚪ documented (unnecessary) |
| Proxies/reflection         | ✅ runtime reflection stdlib |
| Binary data                | ✅ base64/bytes/sha256 |
| Workers/processes          | ✅ runCommand + parallel |
| Filesystem                 | ✅ metadata/walk/path |
| Streams                    | ✅ writeLine/appendLine |
| Networking                 | ✅ HTTP/WS; TCP rationalised |
| Serialization/config       | ✅ YAML + env-file |
| CLI tooling                | ✅ args() + runCommand |
| Testing                    | ✅ test/check DSL |
| Package/library authoring  | ✅ export + build model |
| JavaScript Gateway         | ✅ universal fallback |

**Legend:** ✅ shipped + tested · ⚪ intentionally omitted with rationale.

---

## 21. 1.0.1 readiness gate

The audit is **complete** only when:

1. Every row above has a **shipped implementation with tests** or an **explicit
   rationale** (both present in this document).
2. `npm test` is green with the new capability tests included.
3. The runtime stdlib table, knowledge base, and README document every new
   capability.

Until then the package version remains **below 1.0.1**.

---

## 22. v2.2.0 — AI/ML, data/storage & web additions

The v2.0–v2.2 releases close further gaps beyond the 1.0.1 audit across the
AI/ML, data/storage and web/full-stack surface. All features below are
IOPL-native (intent-oriented) rather than TypeScript-syntax clones.

### AI / ML (module `ai`)

| Capability                                   | IOPL stdlib                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| LLM chat completion                          | `chat(model, messages, {options})` → text, async, OpenAI-compatible API     |
| Text embeddings                              | `embedText(model, text, {options})` → vector, async                         |
| Vector similarity (cosine)                   | `similarity(a, b)` → -1..1 (identical → 1, orthogonal → 0, opposite → -1)   |
| Auto-tagging convenience                     | `ai_tags(text)` → topic/category tags                                       |
| Post / content generation                    | `ai_post(subject, ideas, options)` → generated prose                         |
| Auth                                            | `OPENAI_API_KEY` env (override via `options.apiKey`/`options.baseURL`)       |

**Audit status:** chat, embeddings, similarity ship with runtime tests; tag/post
compose the same runtime. **Gap closed.**

### Data / storage

| Capability           | IOPL stdlib                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| SQLite persistence   | `http`+`db` runtime, `sql` queries, `table`/`row`/`query` DSL (existing)     |
| In-memory cache fallback | `cacheGet/cacheSet/cacheDelete` use a Map-based store with TTL when no Redis is configured |
| Server-managed cache  | Redis-backed cache when configured (existing)                               |
| Redis cache           | existing TTL semantics, now with graceful no-config fallback                 |
| Pagination           | `paginate(list, page, perPage)` → `{items, count, page, pages, perPage, hasNext, hasPrev}` |

**Audit status:** paginate + in-memory cache fallback ship and are tested.
**Gap closed.**

### Web / full-stack

| Capability    | IOPL stdlib                                                        |
| ------------- | ------------------------------------------------------------------ |
| Request body  | route-scoped `body(...)` accessor: `body()` → raw, `body("field")` → field |
| Redirect      | `redirect to "<url>"` statement inside a route handler (`res.redirect`) |
| (existing)    | routes, status, sessions, uploads, cookies, WebSocket, OAuth, email, schedules |

**Audit status:** `body` + `redirect to` ship, route-guarded with teaching
errors, compile-verified. **Gap closed.**

### Core collections & string primitives (module `coll`)

`range`, `clamp`, `first`, `last`, `flatten`, `includes`, `pick`, `omit`,
`groupBy`, `startsWith`, `endsWith`, `truncate`, `padStart`, `padEnd` — all
runtime-tested. `contains` is a reserved lexer keyword, so the membership helper
is named `includes`.

**Audit status:** shipped + tested. **Gap closed.**

> **Note on v2.2.0 testing:** `npm test` may not fully run in constrained
> sandboxes where native deps (`express`, `sql.js`, `ws`) cannot be installed;
> web/HTTP features are therefore **compile-verified** there. Core language,
> collections, AI (with a live key), and cache fallback run with real tests.
