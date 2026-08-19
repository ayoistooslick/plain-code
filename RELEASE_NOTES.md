# Plain v2.0.0-latest — Release Notes

**Release date:** 2026

---

## What is Plain 2.0.0-latest?

Plain 2.0.0-latest is an Intent-Oriented Programming Language (IOPL) with a
**Complex Compilation layer**. The deterministic compiler remains
authoritative: it compiles everything it understands, offline and for free.
When it cannot compile a supported Plain construct, versioned rule files and a
Complex Compilation provider translate it into validated JavaScript that flows
through the normal bundler/runtime path (RFC-0020).

> An Intent-Oriented Programming Language with a deterministic compiler, a
> growing rule system, and a Complex Compilation translation layer for
> capabilities that have not yet been hard-coded into the compiler.

## What's in v2.0.0-latest?

### Rule system hardening

- **Narrower triggers** — rule matching now requires an explicit trigger match
  before invoking the Complex Compilation layer, reducing false positives
- **Most-specific-first precedence** — a broad generic rule never overrides an
  exact Plain language rule

### Expanded rules

- **WebSocket** (`websocket/ws`) — WebSocket client support
- **Cron scheduling** (`automation/cron`) — scheduled task syntax
- **HTTP** (`http/fetch`) — expanded coverage
- **REST** (`web/rest-api`) — expanded coverage
- **Telegram** (`bots/telegram`) — expanded coverage

### New rule: Email

- **Email** (`communication/email`) — email sending via SMTP

### Complex Compilation (RFC-0020)

- **Rule system** — versioned rule pairs (Markdown + JSON) shipped inside the
  package (`compiler/rules/`)
- **Complex Compilation layer** — rule resolver, translator, provider agent,
  OpenAI-compatible client, strict prompt contract, and a validation gate
  (`compiler/ai/`)
- **Deterministic first** — existing Plain syntax never calls the Complex
  Compilation layer
- **Caching** — successful translations cached locally; stale rule versions are
  never reused
- **Validation** — output is syntax-checked and scanned for forbidden patterns
  and undeclared requires before it can run
- **Diagnostics** — `plain cc status`, `plain cc rules`, `plain cc cache
  [clear]`; layer-specific error messages

### CLI

- `plain cc` is the primary Complex Compilation interface
- `plain ai` is retained as an alias for backward compatibility

### Branding

- "AI-Assisted Compilation" renamed to "Complex Compilation" across all
  documentation and public-facing text
- Version updated to 2.0.0-latest

### Breaking changes

- No Plain language syntax was removed or changed.

---

## Installation

```bash
npm install -g @ayoxx/plain-code
```

## Upgrade from v1.1

See `UPGRADE_GUIDE.md`. Existing Plain programs and the JavaScript Gateway
continue to work unchanged.

---

# Previous release — v2.0.0

See the [CHANGELOG](CHANGELOG.md) for the original v2.0.0 release details.

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
