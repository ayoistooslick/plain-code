# Upgrade Guide — v1.1 → v2.1.2

## Overview

Plain 2.1.2 keeps everything from 2.1.1 and adds one composition upgrade:
`login pairing` accepts any Plain value, so a WhatsApp number can be typed in
at runtime with `ask "WhatsApp number: " as phone` instead of being
hard-coded. Plain 2.1.1 had already turned the compiler into a complete
backend platform: portable databases, an HTTP client, auth, sessions,
uploads, cookies, rate limiting, OAuth and error handling are all first-class
deterministic language features.
**No Plain language syntax was removed or changed.**

All programs written for v1.0/v1.1 continue to compile and run without
modification.

---

## Step 1 — Update the compiler

```bash
npm install -g @ayoxx/plain-code
```

Verify the version:

```bash
plain version
# Plain v2.1.2
```

---

## Step 2 — What changed

- `plain install` now verifies that the native SQLite driver actually loads.
  When it cannot (missing build tools, unsupported platform), Plain warns and
  falls back to the pure-WebAssembly engine — your program still runs.
- `database "app.db"` gains an optional engine clause:
  `using "native"` / `using "wasm"`. Programs that never specify an engine
  behave exactly as before, with automatic fallback as a safety net.
- New backend statements (`enable sessions`, `accept uploads`,
  `require api key`, `rate limit`, `google oauth`, `when nothing matches`,
  `try`/`recover`/`retry`, HTTP client calls) are recognised by the lexer,
  parser and formatter.
- Boolean/null literals and full arithmetic operators (`+ - * / %`, unary
  minus, parentheses) are now part of the language.
- Double-quoted strings now decode escape sequences (`\n`, `\t`, `\\`,
  `\"`). Source that never used a backslash in a string is unaffected;
  backtick strings keep their previous multiline/interpolation behaviour and
  additionally survive escaped backticks.

---

## Step 3 — Adopt what you need

Nothing below is mandatory; each feature stands alone.

```plain
database "app.db"

web app
enable sessions "a-long-random-secret"
require api key from env("API_KEY")

route get "/teams"
    remember rows as query
        select id, name from teams order by name
    done
    reply json
        teams is rows
    done
done

when nothing matches
    status 404
    reply "not found"
done

start 3000
```

New in this line: WhatsApp bots. A `whatsapp bot ... done` block links a real
WhatsApp account (QR scan or pairing code) and answers messages — see the
README's "WhatsApp Bots (v2.1.1)" section and `examples/whatsapp-bot/`.

New in v2.1.2: `login pairing` accepts any value, so the number can be typed
in at runtime:

```plain
ask "WhatsApp number: " as phone

whatsapp bot
    auth "session"
    login pairing phone
done
```

See the README's "Backend Services (v2.1.1)" section for every new feature
with examples.

---

## Breaking changes

None. Existing Plain syntax, the JavaScript Gateway, and the dependency system
are unchanged.

---

# Previous guide — v0.6 → v1.0.0

## Overview

Plain v1.0.0 is a stabilisation release. It contains no breaking changes.

All programs written for Plain v0.6 will continue to work without modification.

---

## Step 1 — Update the compiler

```bash
npm install -g @ayoxx/plain-code
```

Verify the version:

```bash
plain version
# Plain v1.0.0
```

---

## Step 2 — Update your plain.json (optional)

If you track the Plain version in `plain.json`:

```json
{
    "name": "my-app",
    "version": "0.1.0",
    "entry": "app.pln"
}
```

No changes are required. This file tracks your application version, not the compiler version.

---

## Step 3 — Update the VS Code extension (optional)

If you use the Plain VS Code extension, update to v1.0.0 for consistency.
The grammar is unchanged.

---

## Breaking changes

None. Every program that compiled under v0.6 will compile identically under v1.0.0.

---

## What changed in the CLI

The output of `plain run` changed slightly:

| v0.6                     | v1.0.0                |
|--------------------------|-----------------------|
| `Compilation successful.`| `Done.`               |

This is a cosmetic change only. Exit codes are unchanged.

---

## Questions?

See `RELEASE_NOTES.md` or the language specification in `docs/PLAIN_SPEC.md`.
