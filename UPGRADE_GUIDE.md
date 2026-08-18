# Upgrade Guide — v1.1 → v2.0.0

## Overview

Plain 2.0.0 adds an AI-assisted compilation layer (RFC-0020) on top of the
existing deterministic compiler. **No Plain language syntax was removed or
changed.**

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
# Plain v2.0.0-beta
```

---

## Step 2 — Optional: configure the AI provider

The AI layer is used only when the deterministic compiler cannot compile a
supported construct and a matching rule exists. Deterministic programs need no
configuration.

To enable AI-assisted compilation, copy `.env.example` to `.env` and set:

```bash
MISTRAL_API_KEY=...
PLAIN_AI_BASE_URL=https://api.mistral.ai
PLAIN_AI_MODEL=mistral-small-latest
```

Check the layer with `plain ai status`.

---

## Step 3 — What changed

- The `plain` command is now exposed alongside `plain-code`.
- `compile()` is now deterministic-first with an AI fallback; command output is
  unchanged for deterministic programs.
- New diagnostics commands: `plain ai status`, `plain ai rules`,
  `plain ai cache [clear]`.
- `plain doctor` additionally reports the AI layer.

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
