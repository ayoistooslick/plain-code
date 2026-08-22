# Changelog

All notable changes to Plain are documented here.

---

## [2.1.0] — 2026

### Backend capabilities as first-class language features

Everything below compiles deterministically — no rules, no Complex
Compilation, no hidden codegen. Implementation packages (`pg`, `nodemailer`,
`croner`, `ws`, `redis`) are detected and installed automatically; they never
appear in source.

- **HTTP routing**: `route get|post|put|patch|delete "<path>"`, nestable
  `group "<prefix>"` blocks, `param()` / `query()` / `header()` accessors
  (compile errors outside routes), contextual `status <expr>`, `allow cors`
  middleware with OPTIONS preflight, `validate(data, fields)` builtin, and
  automatic JSON body parsing in `web app`.
- **Databases**: `{name}` placeholders bound to Plain variables in SQL blocks,
  captured results via `remember x as query|insert|update|delete ... done`,
  atomic `transaction ... done` blocks, and `postgres env("URL")` switching
  every later statement to awaited node-postgres pool queries (`$n`).
- **Filesystem**: `copyFile`, `moveFile`, `deleteFile`, `makeFolder`,
  `deleteFolder`, `listFolder`, `appendFile`, `readBytes`, `writeBytes`.
- **Stdlib expansion**: `trim`, `replace`, `split`, `join`, `number`, `text`,
  `floor`, `ceiling`, `sort` (unified mixed-type ordering), `reverse`,
  `unique`, `sum`, `smallest`, `largest`, `keys`, `values`, `hasKey`, `merge`.
- **Email**: `mail transport ... done` (user/pass become SMTP auth) and
  `send mail ... done` via nodemailer.
- **Scheduling**: `every <n> <unit>s ... done` and `schedule "<cron>" ... done`
  via croner.
- **Background jobs**: `run background someFn(args)` fire-and-forget with
  logged errors.
- **WebSocket servers**: `websocket server on <port>` with
  `when socket connects | sends message | disconnects` handlers,
  `send socket <value>` and `broadcast <value>` via ws.

### Fixed

- npm install/update on Windows: Node ≥18.20 blocks spawning `.cmd` shims
  (CVE-2024-27980), so the CLI now spawns npm's JS entry point directly and
  anchors installs to the project's own package.json.

---

## [2.0.0-latest] — 2026

### Rule system hardening

- Narrower triggers: rule matching now requires an explicit trigger match
  before invoking the Complex Compilation layer, reducing false positives
- Rules are evaluated most-specific-first; a broad generic rule never overrides
  an exact Plain language rule

### Expanded rules

- **WebSocket** (`websocket/ws`) — WebSocket client support
- **Cron scheduling** (`automation/cron`) — scheduled task syntax
- **HTTP** (`http/fetch`) — expanded coverage
- **REST** (`web/rest-api`) — expanded coverage
- **Telegram** (`bots/telegram`) — expanded coverage

### New rule

- **Email** (`communication/email`) — email sending via SMTP

### Documentation

- Updated `compiler/rules/README.md` as the rule-authoring specification
- Complex Compilation branding update across all documentation
- Version updated to 2.0.0-latest

### CLI

- `plain cc` command added as the primary Complex Compilation interface
- `plain ai` retained as an alias for backward compatibility

---

## [2.0.0] — 2026

### Complex Compilation (RFC-0020)

Plain gains a Complex Compilation layer **without replacing the existing
deterministic compiler**. The deterministic compiler stays authoritative;
versioned rules and an AI provider translate supported constructs that the
compiler does not yet understand into validated JavaScript that flows through
the normal bundler/runtime path.

**Rule system** (`compiler/rules/`)
- Versioned rule pairs (Markdown + JSON metadata) for Telegram bots, HTTP
  fetch, and REST APIs
- Rule metadata: name, category, version, keywords, triggers, dependencies,
  async, compilerMin — used for deterministic matching and cache keys
- Rule authoring guide in `compiler/rules/README.md`

**Complex Compilation layer** (`compiler/ai/`)
- `resolver.js` — deterministic rule matching (RFC-0020 §8, §37)
- `translator.js` — rule → cache → provider → validation orchestration
- `agent.js` — provider-facing `translate()` interface (RFC-0020 §10)
- `client.js` — OpenAI-compatible chat completions client, Agent Router +
  Claude Opus defaults, environment-based configuration only
- `prompt.js` — strict compile prompt contract (RFC-0020 §11)
- `validator.js` — structure/field checks, `vm.Script` syntax check, forbidden
  patterns, `require()` allowlist (RFC-0020 §13)
- `cache.js` — local translation cache keyed by rule version + compiler
  version + model + normalized source (RFC-0020 §15)

**CLI**
- Deterministic-first compile path with Complex Compilation fallback (`compile()` in `cli.js`)
- New commands: `plain cc status`, `plain cc rules`, `plain cc cache [clear]`
- `plain doctor` reports the Complex Compilation layer
- `plain` exposed as a CLI executable alongside `plain-code`
- Layer-specific diagnostics (RFC-0020 §39): Plain rule error, Complex Compilation
  error, generated JavaScript validation error

**Configuration & security**
- `.env.example` added (`MISTRAL_API_KEY`, `PLAIN_AI_BASE_URL`,
  `PLAIN_AI_MODEL`, optional `PLAIN_AI_CACHE_DIR`)
- `.gitignore` added (`.env`, Complex Compilation cache, build output)
- Secrets are never hard-coded or sent to the provider (RFC-0020 §16, §44)

### Language — Telegram (v1.2 deterministic syntax)

- `remember bot as telegram bot with token` — create a polling Telegram bot
- `when someone sends "/start"` — command handlers; `when someone clicks`
  — callback handlers
- `reply "..." with buttons … done` — inline keyboards
- `sendMessage`, `sendPhoto`, `getChat`, `getMyChats`, `editMessage` stdlib
- `start telegram bot` — begin polling
- Inline `{ key: value }` object literals
- Statement-level `javascript` blocks
- `tests/telegram.test.js` added

### Documentation

- README updated for 2.0.0 (Complex Compilation, rules, Telegram, configuration)
- `docs/AI_COMPILATION.md` added
- `compiler/version.js` centralizes the version constant

---

## [1.1.0] — 2026

### Language — Plain Expressions (RFC-0010)

New natural-language syntax for collections, properties, and files. All v1.0 syntax remains valid.

**Items**
- `first player from players` → `players[0]`
- `last player from players` → `players[players.length - 1]`
- `player one from players` … `player twenty from players` → `players[0]` … `players[19]`
- Item expressions work as values, assignment targets (`becomes`), conditions, and arguments

**Collections**
- `players length` → `players.length` (also `length of players`)
- `add(item to players)` → `players.push(item)`
- `remove(item from players)` → `players.splice(players.indexOf(item), 1)`
- `players contains item` (existing v0.6 `contains`) pairs with the new operations

**Properties**
- `name of user` → `user.name`
- `city of address of customer` → `customer.address.city` (right-associative)
- `name of user becomes "Ayo"` → `user.name = "Ayo"`

**Files**
- `read("users.txt")` → `fs.readFileSync("users.txt", 'utf8')` (new stdlib alias)
- `write(data to "users.txt")` → `fs.writeFileSync(data, "users.txt", 'utf8')`
- Existing `readFile()` / `writeFile()` remain unchanged

### Compiler

- `parser.js`: item expressions (`first`/`last`/numbered), `of` property access, `length` postfix, and `to`/`from` special call forms (`add`, `remove`, `write`); friendly diagnostics for missing nouns and non-number words
- `generator.js`: new AST node generation for all Plain Expressions; `read` added to the stdlib; item expressions supported as assignment targets
- No lexer or formatter changes — new words remain identifiers for full backward compatibility

### CLI

- Version bumped to **1.1.0**
- `plain help` lists the v1.1 Plain Expressions feature set

### Testing

- 300+ tests now covering all Plain Expressions, their interactions, backward compatibility, and diagnostics

### Documentation

- `README.md` and `docs/index.html` updated with the Plain Expressions guide
- `examples/expressions.pln` and `samples/expressions.pln` added

---

## [1.0.0] — 2026

### Milestone

First stable release of Plain. Language syntax is now frozen.

This release is a quality and polish milestone — no new syntax was added.

### Compiler

- Final audit of lexer, parser, generator, bundler, and formatter
- Removed dead code (`cmdWarn_example` placeholder)
- Switched `plain run` internal execution from `execSync` string interpolation to `execFileSync` with argument array
- Improved comments throughout all compiler modules

### CLI

- Updated `plain help` to list all v1.0 stdlib functions
- Output message on `plain run` simplified to `Done.`
- Version bumped to **1.0.0**

### Testing

- 250+ tests covering all language features, CLI, formatter, bundler, and runtime stdlib

### VS Code Extension

- Version bumped to **1.0.0**

### Documentation

- `PLAIN_SPEC.md` updated to v1.0.0 (stable status, complete keyword list, all features documented)
- Website updated to v1.0
- `RELEASE_NOTES.md` and `UPGRADE_GUIDE.md` added

### GitHub Linguist

- `samples/` directory added with representative Plain programs

---

## [0.6.0] — 2026

### Language

**Extended comparisons**
- `is above` → `>` (alias for `is greater than`)
- `is below` → `<` (alias for `is less than`)
- `is at least` → `>=`
- `is at most` → `<=`
- `is not` → `!==`
- `is empty` → `.length === 0`
- `is not empty` → `.length > 0`
- `contains` → `.includes()`
- `starts with` → `.startsWith()`
- `ends with` → `.endsWith()`
- `between X and Y` → `>= X && <= Y`

**Aliases**
- `for every X in Y` — identical to `for each X in Y`

### Runtime Standard Library

New built-in functions (no imports required):

| Plain              | Compiles to                                    |
|--------------------|------------------------------------------------|
| `print(x)`         | `console.log(x)`                               |
| `readFile(path)`   | `require('fs').readFileSync(path, 'utf8')`     |
| `writeFile(p, c)`  | `require('fs').writeFileSync(p, c, 'utf8')`    |
| `fileExists(path)` | `require('fs').existsSync(path)`               |
| `sleep(ms)`        | Synchronous sleep via `Atomics.wait`           |
| `time()`           | `Date.now()`                                   |
| `date()`           | `new Date().toISOString()`                     |
| `jsonEncode(x)`    | `JSON.stringify(x)`                            |
| `jsonDecode(s)`    | `JSON.parse(s)`                                |
| `env(key)`         | `process.env[key]`                             |
| `exit(code)`       | `process.exit(code)`                           |
| `uuid()`           | `require('crypto').randomUUID()`               |

### Express Developer Experience

Cleaner web-app syntax alongside existing `use express` / `when someone visits`:

```plain
web app

route "/"
    reply "Hello"
done

start 3000
```

### SQLite Developer Experience

Simplified database syntax alongside existing `use sqlite`:

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
    INSERT INTO users (name) VALUES ('Alice')
done

query
    SELECT * FROM users
done
```

### CLI

- Coloured terminal output (✓ green, ✗ red, ⚠ yellow) when stdout is a TTY
- Compilation timing shown for slow stages
- `plain fmt` reports "already formatted" instead of rewriting an identical file
- `plain help` updated with v0.6 feature summary
- Version bumped to **0.6.0**

### VS Code Extension

- Grammar updated with all v0.6 keywords
- Snippets added for common patterns
- `CHANGELOG.md` and `LICENSE` included

### Documentation

- Full documentation website in `docs/website/index.html`
- New examples: `examples/stdlib.pln`, `examples/web-app.pln`

### Tests

- 200+ compiler tests covering all language features

---

## [0.5.0] — 2026

### Tools (RFC-0006 Part 1)

- `plain check <file.pln>` — syntax check without compiling or running
- `plain fmt <file.pln>` — format a Plain file in-place
- Formatter: 4-space indentation, blank lines between top-level blocks, array formatting
- Diagnostics: errors now include `filename — Line N, Column N:`
- VS Code extension scaffolded in `plain-vscode/`

---

## [0.4.2] — 2025

- Package manager: `plain init`, `plain install`, `plain add`, `plain remove`, `plain update`
- Dependency validation before compilation
- Multi-file imports: `import "./math.pln"`

## [0.4.1] — 2025

- Multi-file package system and bundler

## [0.3.0] — 2025

- Express runtime: `use express`, `when someone visits`, `listen on`, `reply`, `serve folder`
- SQLite runtime: `use sqlite`

## [0.2.0] — 2025

- Arrays, objects, `becomes`, `for each`, `while`
- Standard library: `length()`, `uppercase()`, `lowercase()`, `random()`, `round()`

## [0.1.0] — 2025

- `remember`, `show`, `if`/`otherwise`/`done`, `make`/`give`
- Lexer, parser, AST generator, CLI (`plain run`, `plain build`, `plain new`)
