# PlainScript 1.0.35 Capability Audit

This audit is based on what the compiler actually supports right now.
If `plainscript check` validates it, it's listed here.

## Core Language

| Capability | Status | Current source form |
| --- | --- | --- |
| Variables and assignment | Implemented | `remember x as 1`, `x becomes 2` |
| Strings and templates | Implemented | `"text"`, `` `Hello ${name}` `` |
| Numbers and BigInt | Implemented | `3.14`, `42n` |
| Arrays and objects | Implemented | `[1, 2]`, `{name: "Ada"}` |
| Records and record kinds | Implemented | `define a kind called "User" with ... done` |
| Conditions | Implemented | `if ... otherwise ... done` |
| Functions | Implemented | `make add(a, b) ... done` |
| Generators | Implemented | `yield value` |
| For and while loops | Implemented | `for each ... done`, `while ... done` |
| Match and switch | Implemented | `match value against ... done` |
| Loop control | Implemented | `break`, `continue` |
| String verbs | Implemented | `lowercase`, `uppercase`, `split`, `join`, `trim`, `capitalize words` |
| Classes and `new` | Implemented | JavaScript-compatible class forms |

## Modules and Runtime

| Capability | Status | Notes |
| --- | --- | --- |
| Relative PlainScript imports | Implemented | Imported files are bundled |
| Named imports and exports | Implemented | `import { name } from "./file.pln"` |
| npm packages | Implemented | `use package-name` and CLI dependency detection |
| JSON | Implemented | `jsonEncode`, `jsonDecode`, JSON response blocks |
| Files and paths | Implemented | Read/write, bytes, folders, path helpers |
| Crypto and auth helpers | Implemented | Hashes, passwords, tokens |
| Async/await | Implemented | `wait for`, `await`, async propagation |
| Concurrency | Implemented | `allOf`, `anyOf`, `settledOf`, `withTimeout` |
| Errors and retries | Implemented | `try`, `recover`, `finally`, `retry` |
| Native tests | Implemented | `test` and `check` assertions |

## Web and Services

| Capability | Status | Current source form |
| --- | --- | --- |
| Express web app | Implemented | `web app` |
| HTTP routes | Implemented | `route get "/path" ... done` |
| JSON responses | Implemented | `reply json ... done` |
| CORS and fallback | Implemented | `allow cors`, `when nothing matches` |
| Request accessors | Implemented | `body`, `param`, `query`, `header`, uploads |
| Cookies and sessions | Implemented | `set cookie`, `enable sessions` |
| API keys and rate limits | Implemented | `require api key`, `limit requests` |
| File uploads | Implemented | `accept uploads` |
| HTTP client | Implemented | `get`, `post`, `put`, `patch`, `delete` |
| SQLite | Implemented | native and WebAssembly drivers |
| PostgreSQL generation | Implemented | `postgres connection` |
| SQL parameter binding | Implemented | `{variable}` placeholders |
| MongoDB | Implemented | `mongo connection`, insert, select, update, delete |
| MongoDB insert | Implemented | `insert into ... done` |
| MongoDB select | Implemented | `select from ... done` |
| MongoDB update | Implemented | `update ... set ... done` |
| MongoDB delete | Implemented | `delete from ... done` |
| Email | Implemented | `mail transport`, `send mail` |
| Schedules and jobs | Implemented | `every`, `schedule`, `run background` |
| WebSockets | Implemented | `websocket server` |
| Redis/in-memory cache | Implemented | `cache`, `cacheGet`, `cacheSet` |
| Telegram bots | Implemented | `bot`, message/callback handlers |
| AI providers | Implemented | `chat`, `chatWith`, `embedText`, provider presets |
| WhatsApp bots | Implemented | `whatsapp bot` (pairing/QR, message types, media download, custom Baileys) |
| OCR | Implemented | `ocr path of file as text` |

## Canonical Examples

Here are the example files that exercise each capability:

```text
examples/basics.pln
examples/conditions.pln
examples/loops.pln
examples/functions.pln
examples/records.pln
examples/collections.pln
examples/json.pln
examples/files.pln
examples/packages.pln
examples/http.pln
examples/sqlite.pln
examples/web-api.pln
examples/auth-sessions.pln
examples/async-errors.pln
examples/concurrency.pln
examples/websocket.pln
examples/cache-schedule.pln
examples/bots.pln
examples/ocr.pln
examples/testing.pln
examples/modules/
examples/football-backend/
examples/id-verification/
examples/whatsapp-bot/
```

Run this to make sure everything still compiles:

```bash
find examples -name '*.pln' -exec node compiler/cli.js check {} \;
```

## Version Info

The release label for this repo is `1.0.35`. It covers the compiler,
package metadata, website, and editor tooling. Third-party dependency
versions are not tied to this label.
