# Changelog

All notable changes to PLINJS are documented here.

---

## [0.1.7] — 2026

### First release of PLINJS

PLINJS is an Intent-Oriented Programming Language (IOPL): you describe **what**
you want, and the deterministic compiler decides **how** to implement it in
JavaScript. The `.pln` extension and the whole language ship complete in this
release.

- **npm package `plinjs`.** Installs per project as a devDependency:

  ```bash
  npm install --save-dev plinjs
  ```

  No global install is required anywhere in the deployment story. Projects
  use it through npm scripts:

  ```json
  {
    "scripts": { "build": "plinjs build", "start": "node dist/index.js" },
    "devDependencies": { "plinjs": "^0.1.7" }
  }
  ```

- **`plinjs build` compiles a real production build.** Sources compile into
  `dist/`, preserving source file names and directory structure relative to
  the source root (`src/messi.pln` → `dist/messi.js`,
  `src/a/b.pln` → `dist/a/b.js`). Every entry is bundled with its imports,
  so each file in `dist/` runs standalone. Compilation is deterministic:
  identical sources produce byte-identical output.
- **Zero-config production build** — `plinjs build` auto-discovers `.pln` files
  under `src/` and compiles each to `dist/`, preserving file names and directory
  structure (`src/messi.pln` → `dist/messi.js`, `src/a/b.pln` → `dist/a/b.js`).
  Every entry is bundled with its imports, so each file in `dist/` runs standalone.
  Compilation is deterministic: identical sources produce byte-identical output.
- **Full CLI:** `plinjs build | run | start | new | install | add | remove |
  remove | update | check | fmt | doctor | version | help`.
- **Complete language:** variables, conditions, functions, arrays, objects,
  loops, string templates with `${...}` interpolation, PLINJS Expressions,
  multi-file projects, and a JavaScript Gateway with full async support.
- **Deterministic backend capabilities** compiled by the same compiler — web
  apps and routing, SQLite (native or WebAssembly) and PostgreSQL databases
  with transactions, sessions with signed cookies, password hashing and HMAC
  tokens, Google OAuth, file uploads, OCR, cookies, rate limiting, email,
  cron and background jobs, WebSocket servers, and Redis-backed caching.
- **WhatsApp bots** through Baileys with QR or pairing-code linking,
  compile-time pairing-number validation, and automatic reconnection.
- **Editor support:** a VS Code extension (`plinjs-vscode/`) and an Acode
  plugin (`plinjs-acode/`) whose highlighting is generated from the same
  token table the compiler uses.
