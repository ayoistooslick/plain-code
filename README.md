# Plain

> "When even a simple sentence can be code."
> Don't forget to star the repo 

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

**Current version:** v2.0.0-beta — AI-Assisted Compilation (RFC-0020).

---

## Quick start

```bash
npm install -g @ayoxx/plain-code
plain new myapp
cd myapp
plain install
plain run app.pln
```

---

CLI

```
plain run    <file.pln>   Install missing dependencies, compile and execute
plain build  <file.pln>   Install missing dependencies and compile
plain check  <file.pln>   Check syntax only (no output, no execution)
plain fmt    <file.pln>   Format a Plain file in-place
plain new    [name]       Create a new Plain project
plain init               Create a plain.json in the current directory
plain install            Install dependencies required by the project's source files
plain start              Start the entry file from plain.json
plain doctor             Check the Plain project environment
plain add    <package>   Install a package and add it to plain.json
plain remove <package>   Remove a package from plain.json and uninstall it
plain update             Update all installed npm packages
plain ai status          Show the AI compilation layer status
plain ai rules           List the installed Plain rules
plain ai cache           List / clear the local AI translation cache
plain version            Print the compiler version
plain help               Print help text
```

---

Language features

Variables

```plain
remember name as "Ayokunle"
remember age as 16
age becomes 17
```

Conditions (v0.6 comparisons)

```plain
if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done

if name contains "Plain"
    show "Found it"
done

if score between 90 and 100
    show "A grade"
done
```

All comparison operators:

Plain JavaScript
is / is equal to ===
is not !==
is greater than / is above >
is less than / is below <
is at least >=
is at most <=
is empty .length === 0
is not empty .length > 0
contains "x" .includes("x")
starts with "x" .startsWith("x")
ends with "x" .endsWith("x")
between A and B >= A && <= B
# =>
Functions

```plain
make add(a, b)
    give a + b
done
show add(5, 7)
```

Arrays & Objects

```plain
remember players as ["Haaland", "Foden", "Rodri"]
show players[0]
players[1] becomes "Palmer"

remember user as
    name is "Ayokunle"
    age is 17
done
show user.name
```

Loops

```plain
for each player in players
    show player
done

for every item in basket    // alias for "for each"
    show item
done

while age is less than 18
    age becomes age + 1
done
```

Plain Expressions (v1.1)

Collections, properties, and files read like sentences.

Items

```plain
remember players as ["Haaland", "Foden", "Rodri"]

show first player from players   // players[0]
show last player from players    // players[players.length - 1]
show player two from players     // players[1]
first player from players becomes "Haaland"  // players[0] = "Haaland"
```

Number words from `one` to `twenty` map to one-based positions: `player one` is the first item.

Collections

```plain
show players length              // players.length
add("Palmer" to players)         // players.push("Palmer")
remove("Rodri" from players)     // players.splice(players.indexOf("Rodri"), 1)

if players contains "Foden"      // players.includes("Foden")
    show "Found"
done
```

Properties

```plain
show name of user                // user.name
show city of address of customer // customer.address.city
name of user becomes "Ayo"       // user.name = "Ayo"
```

`of` chains right-to-left: `city of address of customer` reads the city of the address of the customer.

Files

```plain
remember data as read("users.txt")   // fs.readFileSync("users.txt", 'utf8')
write(data to "users.txt")           // fs.writeFileSync(data, "users.txt", 'utf8')
```

The older `readFile()` / `writeFile()` forms still work and are unchanged.

JavaScript Gateway (v1.1.1)

JavaScript blocks run raw JavaScript with full async support. The block body is
passed through verbatim and wrapped in an async function whose result becomes
the variable:

```plain
remember response as javascript
    const res = await fetch("https://api.example.com")
    const data = await res.json()
    return data
done
show response
```

`ask` reads a line of input from the terminal, optionally with a prompt:

```plain
ask "What is your name?" as name
show "Hello, " + name
```

Any npm package can be declared with `use` — including hyphenated names such as
`node-fetch` and scoped packages such as `@scope/package-name`:

```plain
use axios
use node-fetch
use @scope/package-name
```

Names that are not valid JavaScript identifiers (like `node-fetch` or
`@scope/package-name`) compile to a bare `require('...');`; simple names like
`axios` still become `const axios = require('axios');`.

AI-Assisted Compilation (v2.0)

Plain 2.0.0 keeps the deterministic compiler authoritative and adds an
**AI-assisted compilation layer** for capabilities that are not yet hard-coded
into the compiler. This is a compiler extension, not a chatbot and not a
replacement for the deterministic path (RFC-0020).

How it works

```text
app.pln
   │
   ▼
Existing Plain Lexer/Parser
   │
   deterministic support?
   │          │
   yes        no
   │          ▼
   ▼      Rule resolver
Existing     │
compiler     ▼
        AI translation
             │
             ▼
        validated JS/IR
             │
             ▼
   Existing generator/bundler/runtime
             │
             ▼
        executable JS
```

1. The deterministic compiler compiles everything it understands — always,
   first, offline, for free.
2. When it cannot compile a construct, the **rule resolver** matches the source
   against versioned rule files in `compiler/rules/`.
3. If a rule matches, a translation step turns the Plain construct into
   JavaScript following that rule exactly. Plain ships with a **hosted compiler
   service** (`https://plain-code-compiler.onrender.com`) that performs this
   step for you, so most users need no configuration or API key.
4. The generated JavaScript is **validated** (syntax check, forbidden patterns,
   require() allowlist) — locally as well as on the service — and flows
   through the normal bundler/runtime and dependency system.
5. Successful translations are cached locally; a cached result from an older
   rule version is never silently reused.

Rules

Each rule is a versioned pair: a human-readable Markdown file (syntax, meaning,
JavaScript target, examples, security notes) and machine-readable JSON metadata
(name, category, version, keywords, triggers, dependencies) used for
deterministic matching and cache keys.

Shipped rules: Telegram bots (`bots/telegram`), HTTP fetch (`http/fetch`), and
REST APIs (`web/rest-api`).

Telegram example

```plain
remember token as env("BOT_TOKEN")

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done
```

HTTP example

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

Configuration

**Plain users do not need an API key.** By default, unsupported Plain syntax is
sent to the hosted compiler service at `https://plain-code-compiler.onrender.com`,
which owns the provider credential. There is nothing to configure:

```bash
plain ai status     # shows the active AI path (hosted service by default)
```

To point Plain at a different hosted deployment, override the endpoint:

```bash
export PLAIN_AI_REMOTE_URL=https://plain-code-compiler.onrender.com
```

Self-hosting the provider (running your own service or calling a provider
directly) is optional and environment-based only. No secrets live in the
repository — see `.env.example`:

```bash
export MISTRAL_API_KEY=...
export PLAIN_AI_BASE_URL=https://api.mistral.ai
export PLAIN_AI_MODEL=mistral-small-latest
```

- Deterministic programs compile fine with no configuration.
- The AI layer is used only when the deterministic compiler cannot compile the
  source and a rule matches.
- Tokens, keys, and secret values are never sent to the provider — only the
  Plain source and the matching rule. The hosted service never returns, logs,
  or embeds the provider key in generated JavaScript.

Diagnostics

```bash
plain ai status     # provider, rules, cache
plain ai rules      # list rules
plain ai cache      # list cached translations
plain ai cache clear
```

When AI compilation fails, the error identifies the failing layer (Plain syntax
error, Plain rule error, AI compilation error, generated JavaScript validation
error, runtime dependency error).

Privacy and security

- AI-generated code is validated before it can run.
- Only relevant source and the matching rule are sent — never the whole project.
- The real `.env` is ignored by `.gitignore`; only `.env.example` is committed.
- The JavaScript Gateway remains the explicit escape hatch for advanced or
  unsupported JavaScript.

Runtime Standard Library (v0.6)

No imports needed. These functions are built into the compiler:

Plain Description
print(x) Print a value (console.log)
readFile("path") Read a file as UTF-8 text
writeFile("path", data) Write text to a file
read("path") Read a file as UTF-8 text (v1.1)
fileExists("path") Check if a file exists
sleep(ms) Sleep synchronously
time() Current Unix timestamp (Date.now())
date() ISO date string
jsonEncode(value) JSON.stringify
jsonDecode(string) JSON.parse
env("KEY") Read environment variable
exit(code) Exit the process
uuid() Generate a UUID v4
length(x) Length of array/string
uppercase(x) Convert to uppercase
lowercase(x) Convert to lowercase
random() Random number 0–1
round(x) Round to nearest integer

---

Project management (v0.4.2)

Plain can manage its own project configuration without relying on npm for everything.

plain init

Create a plain.json in the current directory:

```bash
plain init
```

Generates:

```json
{
    "name": "my-app",
    "version": "0.1.0",
    "entry": "app.pln"
}
```

If plain.json already exists, Plain prints Project already initialized. and does nothing.

plain install

Install all npm packages required by your project's source files. Plain scans all .pln files, detects use statements, and installs any missing packages.

```bash
plain install
```

If no external dependencies are found, it prints:

```
This project has no external dependencies.
```

If all dependencies are already installed, it prints:

```
All dependencies are already installed.
```

plain add

Install a package and record it in plain.json:

```bash
plain add express
plain add better-sqlite3
```

plain remove

Uninstall a package and remove it from plain.json:

```bash
plain remove express
```

plain update

Update all installed npm packages:

```bash
plain update
```

Automatic runtime dependencies

Plain detects dependencies from `use` statements and shorthand features such as
`web app` and `database`. Built-in Node modules are ignored. `plain run` and
`plain build` install missing npm packages automatically; `plain install` does
the same without compiling or running the project.

```
✓ express already installed
Installing axios...
✓ axios installed
Done.
```

Runtime dependency detection

Plain can inspect a source file and list the npm packages it needs. The
reusable detector scans use statements, maps Plain module names to their npm
packages, detects shorthand runtime features, ignores Node built-ins such as
fs and path, and removes duplicates.

The current mappings include:

Plain module npm package
express express
sqlite better-sqlite3
web app express
axios axios
chalk chalk

`plain start` reads the entry file from `plain.json`, installs missing runtime
packages, compiles, and runs the application. `plain doctor` checks Node, npm,
the Plain compiler, formatter, runtime, project configuration, and dependencies.

---

Web Apps (v0.6)

The web app shorthand sets up Express with less boilerplate:

```plain
web app

route "/"
    reply "Hello from Plain!"
done

route "/api/status"
    reply json
        status is "ok"
        version is "0.6"
    done
done

start 3000
```

The classic use express / when someone visits style still works alongside the new syntax.

---

SQLite Database (v0.6)

Inline SQL blocks compile directly to better-sqlite3 calls:

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
    INSERT INTO users (name) VALUES ('Alice')
done

remember rows as query
    SELECT * FROM users
done
```

Plain Compiles to
database "f" const db = new Database("f")
query … done db.prepare(\…`).all()`
insert … done db.prepare(\…`).run()`
update … done db.prepare(\…`).run()`
delete … done db.prepare(\…`).run()`
execute … done db.exec(\…`)`

---

Multi-file projects (v0.4.1)

Split your code across multiple .pln files using import:

```plain
import "./math.pln"
import "./utils.pln"

show PI
show double(5)
```

Rules:

· Paths must be relative (./ or ../)
· Files compile in dependency order (deepest dependency first)
· Duplicate imports are de-duplicated automatically
· Circular imports produce a friendly compiler error

---

Express server (v0.3)

```plain
use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from Plain!"
done

when someone visits "/api/status"
    reply json
        status is "ok"
        version is "0.3"
    done
done

listen on 3000
    show "Server running at http://localhost:3000"
done
```

Inside route bodies, request maps to req and response maps to res.

---

SQLite (v0.3)

```plain
use sqlite

remember db as sqlite("database.db")
```

---

Supported packages

Plain Compiles to
use express const express = require('express');
use sqlite const Database = require('better-sqlite3');
use fs const fs = require('fs');
use path const path = require('path');

Any npm package can be used, including hyphenated names like `node-fetch` and
scoped packages like `@scope/package-name`. Names that are not valid JavaScript
identifiers compile to a bare `require('...');` and are loaded for their side
effects, then used from JavaScript blocks or referenced by their real names.

---

Running the tests

```bash
npm test
```

Runs the main compiler suite (`tests/compiler.test.js`), the Telegram suite
(`tests/telegram.test.js`), and the AI layer suite (`tests/ai.test.js`). The AI
suite uses a mocked provider — it never needs a real API key or network access.
It also starts the AI service (`compiler/ai/server.js`) on an ephemeral port
and exercises the HTTP translate/health path against the shared pipeline.

Hosted compiler service

The repository ships with a minimal, deployable HTTP service
(`compiler/ai/server.js`) that serves the AI compilation pipeline over HTTP, so
the hosted deployment and the CLI share one implementation. Start it locally:

```bash
npm start          # or: node compiler/ai/server.js
```

It listens on `$PORT` (Render provides this) or `3000`:

- `GET  /health` — health check (`{ ok: true, service, version }`)
- `POST /translate` — `{ "source": "...", "rule": "bots/telegram"?, "options": { "noCache": true }? }`
  returns the same validated output contract the CLI consumes.

Deploy on Render with `render.yaml` (web service, `npm start`). Set
`MISTRAL_API_KEY` as a secret in the Render dashboard — it is read from the
environment at runtime and is never committed, logged, or embedded in
generated JavaScript. `plain-code-compiler.onrender.com` is the public
instance; the CLI reaches it via `compiler/ai/remote.js`.

---

Project structure

```
Plain/
├── compiler/
│   ├── lexer.js              — tokenises Plain source into tokens
│   ├── parser.js             — builds an AST from tokens
│   ├── generator.js          — generates JavaScript from the AST
│   ├── bundler.js            — resolves imports and bundles files
│   ├── formatter.js          — normalises Plain source style
│   ├── dependency-detector.js— detects npm packages from source
│   ├── version.js            — single compiler version constant
│   ├── ai/                   — AI-assisted compilation layer (RFC-0020)
│   │   ├── resolver.js       — deterministic rule matching
│   │   ├── translator.js     — rule → cache → provider → validation
│   │   ├── validator.js      — AI output validation
│   │   ├── agent.js          — provider-facing translate() interface
│   │   ├── client.js         — OpenAI-compatible HTTP client
│   │   ├── prompt.js         — strict compile prompt builder
│   │   ├── cache.js          — local translation cache
│   │   ├── remote.js         — hosted service client (plain-code-compiler.onrender.com)
│   │   ├── server.js         — hosted AI compiler HTTP service
│   │   └── index.js          — public AI API + diagnostics
│   ├── rules/                — versioned capability rules
│   │   ├── README.md         — rule authoring guide
│   │   ├── bots/telegram.*   — Telegram bot rule
│   │   ├── http/fetch.*      — HTTP fetch rule
│   │   └── web/rest-api.*    — REST API rule
│   └── cli.js                — command-line entry point
│
├── examples/
│   ├── hello.pln      — variables and printing
│   ├── day2.pln       — conditions
│   ├── day3.pln       — functions
│   ├── arrays.pln     — arrays and indexing
│   ├── objects.pln    — objects and property access
│   ├── loops.pln      — for each and while loops
│   ├── expressions.pln— Plain Expressions (v1.1)
│   ├── stdlib.pln     — runtime stdlib usage
│   ├── server.pln     — Express server (v0.3)
│   ├── web-app.pln    — Express web app shorthand (v0.6)
│   ├── start.pln      — entry file for `plain start`
│   ├── database.pln   — SQLite connection (v0.3)
│   └── deployment.pln — runtime dependency detection and deployment
│
├── tests/
│   ├── compiler.test.js
│   ├── telegram.test.js
│   └── ai.test.js
│
├── docs/
│   ├── PLAIN_SPEC.md  — language specification
│   └── AI_COMPILATION.md — AI-assisted compilation guide
│
├── .env.example       — AI provider configuration template (never a real .env)
├── render.yaml        — Render blueprint for the hosted AI compiler service
├── package.json
└── README.md
```