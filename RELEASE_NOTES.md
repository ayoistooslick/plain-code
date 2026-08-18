# Plain v2.0.0 — Release Notes

**Release date:** 2026

---

## What is Plain 2.0.0?

Plain 2.0.0 is an Intent-Oriented Programming Language (IOPL) with an
**AI-assisted compilation layer**. The deterministic compiler remains
authoritative: it compiles everything it understands, offline and for free.
When it cannot compile a supported Plain construct, versioned rule files and an
AI provider translate it into validated JavaScript that flows through the
normal bundler/runtime path (RFC-0020).

> An Intent-Oriented Programming Language with a deterministic compiler, a
> growing rule system, and an AI-assisted translation layer for capabilities
> that have not yet been hard-coded into the compiler.

## What's in v2.0.0?

### AI-assisted compilation (RFC-0020)

- **Rule system** — versioned rule pairs (Markdown + JSON) for Telegram bots,
  HTTP fetch, and REST APIs, shipped inside the package (`compiler/rules/`)
- **AI layer** — rule resolver, translator, provider agent, OpenAI-compatible
  client, strict prompt contract, and a validation gate (`compiler/ai/`)
- **Deterministic first** — existing Plain syntax never calls the AI layer
- **Caching** — successful translations cached locally; stale rule versions are
  never reused
- **Validation** — AI output is syntax-checked and scanned for forbidden
  patterns and undeclared requires before it can run
- **Environment-based configuration** — `MISTRAL_API_KEY`, `PLAIN_AI_BASE_URL`,
  `PLAIN_AI_MODEL`; no secrets in the repository (`.env.example` provided)
- **Diagnostics** — `plain ai status`, `plain ai rules`, `plain ai cache
  [clear]`; layer-specific error messages
- **`plain` CLI** — the `plain` executable is now exposed alongside
  `plain-code`

### Telegram language support (v1.2 deterministic syntax)

```plain
remember token as env("BOT_TOKEN")

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done
```

Including `when someone clicks`, `reply ... with buttons`, `sendMessage` /
`sendPhoto` / `getChat` / `getMyChats` / `editMessage`, `start telegram bot`,
inline `{ key: value }` objects, and statement-level `javascript` blocks.

### Breaking changes

- Version bumps to 2.0.0 (package.json, CLI, docs). No Plain language syntax
  was removed or changed.

---

## Installation

```bash
npm install -g @ayoxx/plain-code
```

## AI configuration (optional)

```bash
export MISTRAL_API_KEY=...
export PLAIN_AI_BASE_URL=https://api.mistral.ai
export PLAIN_AI_MODEL=mistral-small-latest
```

Deterministic Plain programs compile without any configuration. The AI layer is
used only when the deterministic compiler cannot compile the source and a rule
matches.

## Upgrade from v1.1

See `UPGRADE_GUIDE.md`. Existing Plain programs and the JavaScript Gateway
continue to work unchanged.

---

# Previous release — v1.0.0

**Release date:** 2026

---

## What is Plain?

Plain is an Intent-Oriented Programming Language (IOPL) that compiles to JavaScript.

You describe **what** you want. The compiler decides **how** to implement it.

```plain
remember name as "Ayokunle"
remember age as 17

if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done
```

---

## What's in v1.0.0?

This is the first **stable release** of Plain.

The language syntax is now frozen. No new syntax changes are planned before v1.1.

### Quality improvements

- Compiler audit: dead code removed, comments improved, naming clarified
- CLI: `plain run` now uses `execFileSync` (no shell interpolation)
- 250+ tests passing across all language features
- Documentation updated throughout

### Language features (all stable)

- Variables: `remember` / `becomes`
- Printing: `show`
- Conditions: `if` / `otherwise` / `done` with all comparison operators
- Functions: `make` / `give`
- Loops: `for each` / `for every` / `while`
- Arrays and objects
- Imports: `import "./file.pln"`
- Runtime packages: `use express` / `use sqlite` / `use fs` / `use path`
- Express server (classic and shorthand)
- SQLite database (classic and shorthand)
- Standard library: `print`, `readFile`, `writeFile`, `fileExists`, `sleep`, `time`, `date`, `jsonEncode`, `jsonDecode`, `env`, `exit`, `uuid`
- Developer tools: `plain check`, `plain fmt`, `plain new`, `plain init`, `plain add`, `plain remove`, `plain install`, `plain update`

---

## Installation

```bash
npm install -g @ayoxx/plain-code
```

---

## Upgrade guide

See `UPGRADE_GUIDE.md` for instructions on upgrading from v0.6 to v1.0.

---

## What's next?

The language is frozen for v1.0. Future improvements will be proposed via RFC and released as v1.1+.
