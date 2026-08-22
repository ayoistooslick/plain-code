# Plain

<p align="center">
  <img src="docs/og.svg" alt="Plain Logo" width="200" />
</p>

> "When even a simple sentence can be code."
> Don't forget to star the repo

Plain is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

**Current version:** v2.1.0 — Backend capabilities as first-class language features.

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

## CLI

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
plain cc status          Show the Complex Compilation layer status
plain cc rules           List the installed Plain rules
plain cc cache           List / clear the local Complex Compilation cache
plain cc cache clear     Clear the local Complex Compilation cache
plain version            Print the compiler version
plain help               Print help text
```

`plain ai` is accepted as an alias for `plain cc`.

---

## Language features

### Variables

```plain
remember name as "Ayokunle"
remember age as 16
age becomes 17
```

### String Templates

Backtick-delimited strings preserve whitespace and support `${expression}` interpolation:

```plain
remember name as "World"
remember greeting as `Hello ${name}!`
show greeting

remember email as `Dear ${customer},

Thank you for your order #${orderId}.

Best regards,
The Team`
```

Interpolation compiles directly to JavaScript template literals — it is not evaluated at compile time. Literal dollar signs without `{` are preserved as-is.

### Conditions (v0.6 comparisons)

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

| Plain                  | JavaScript         |
|------------------------|--------------------|
| `is` / `is equal to`  | `===`              |
| `is not`               | `!==`              |
| `is greater than` / `is above` | `>`       |
| `is less than` / `is below`    | `<`       |
| `is at least`          | `>=`               |
| `is at most`           | `<=`               |
| `is empty`             | `.length === 0`    |
| `is not empty`         | `.length > 0`      |
| `contains "x"`         | `.includes("x")`   |
| `starts with "x"`      | `.startsWith("x")` |
| `ends with "x"`        | `.endsWith("x")`   |
| `between A and B`      | `>= A && <= B`     |

### Functions

```plain
make add(a, b)
    give a + b
done
show add(5, 7)
```

### Arrays & Objects

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

### Loops

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

### Plain Expressions (v1.1)

Collections, properties, and files read like sentences.

**Items**

```plain
remember players as ["Haaland", "Foden", "Rodri"]

show first player from players   // players[0]
show last player from players    // players[players.length - 1]
show player two from players     // players[1]
first player from players becomes "Haaland"  // players[0] = "Haaland"
```

Number words from `one` to `twenty` map to one-based positions: `player one` is the first item.

**Collections**

```plain
show players length              // players.length
add("Palmer" to players)         // players.push("Palmer")
remove("Rodri" from players)     // players.splice(players.indexOf("Rodri"), 1)

if players contains "Foden"      // players.includes("Foden")
    show "Found"
done
```

**Properties**

```plain
show name of user                // user.name
show city of address of customer // customer.address.city
name of user becomes "Ayo"       // user.name = "Ayo"
```

`of` chains right-to-left: `city of address of customer` reads the city of the address of the customer.

**Files**

```plain
remember data as read("users.txt")   // fs.readFileSync("users.txt", 'utf8')
write(data to "users.txt")           // fs.writeFileSync(data, "users.txt", 'utf8')
```

The older `readFile()` / `writeFile()` forms still work and are unchanged.

### JavaScript Gateway (v1.1.1)

JavaScript blocks run raw JavaScript with full async support:

```plain
remember response as javascript
    const res = await fetch("https://api.example.com")
    const data = await res.json()
    return data
done
show response
```

`ask` reads a line of input from the terminal:

```plain
ask "What is your name?" as name
show "Hello, " + name
```

Any npm package can be declared with `use`:

```plain
use axios
use node-fetch
use @scope/package-name
```

---

## Complex Compilation (v2.0)

Plain 2.0 keeps the deterministic compiler authoritative and adds a
**Complex Compilation layer** for capabilities that are not yet hard-coded
into the compiler. This is a compiler extension, not a chatbot and not a
replacement for the deterministic path (RFC-0020).

### How it works

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
        Complex translation
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

### Rules

Each rule is a versioned pair: a human-readable Markdown file (syntax, meaning,
JavaScript target, examples, security notes) and machine-readable JSON metadata
(name, category, version, keywords, triggers, dependencies) used for
deterministic matching and cache keys.

Shipped rules: Telegram bots (`bots/telegram`), HTTP fetch (`http/fetch`),
REST APIs (`web/rest-api`), WebSocket (`websocket/ws`),
Cron scheduling (`automation/cron`), and Email (`communication/email`).

**Telegram example**

```plain
remember token as env("BOT_TOKEN")

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done
```

**HTTP example**

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

### Configuration

**Plain users do not need an API key.** By default, unsupported Plain syntax is
sent to the hosted compiler service at `https://plain-code-compiler.onrender.com`,
which owns the provider credential.

```bash
plain cc status     # shows the active Complex Compilation path
```

Provider-specific configuration (API keys, model selection) is optional and
environment-based only — see `docs/AI_COMPILATION.md` for details.

---

## Runtime Standard Library (v0.6)

No imports needed. These functions are built into the compiler:

| Plain                    | Description                        |
|--------------------------|------------------------------------|
| `print(x)`              | Print a value (`console.log`)      |
| `readFile("path")`      | Read a file as UTF-8 text          |
| `writeFile("path", data)` | Write text to a file            |
| `read("path")`          | Read a file as UTF-8 text (v1.1)   |
| `fileExists("path")`    | Check if a file exists             |
| `sleep(ms)`             | Sleep synchronously                |
| `time()`                | Current Unix timestamp (`Date.now()`) |
| `date()`                | ISO date string                    |
| `jsonEncode(value)`     | `JSON.stringify`                   |
| `jsonDecode(string)`    | `JSON.parse`                       |
| `env("KEY")`            | Read environment variable          |
| `exit(code)`            | Exit the process                   |
| `uuid()`                | Generate a UUID v4                 |
| `length(x)`             | Length of array/string             |
| `uppercase(x)`          | Convert to uppercase               |
| `lowercase(x)`          | Convert to lowercase               |
| `random()`              | Random number 0–1                  |
| `round(x)`              | Round to nearest integer           |

---

## Web Apps (v0.6)

```plain
web app

route "/"
    reply "Hello from Plain!"
done

route "/api/status"
    reply json
        status is "ok"
        version is "2.0"
    done
done

start 3000
```

---

## SQLite Database (v0.6)

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

---

## Backend Capabilities (v2.1.0)

Everything a backend needs, as first-class deterministic language features —
no rules, no AI, no hidden codegen.

### HTTP routing

```plain
web app
allow cors

group "/api"

    route get "/users"
        remember users as query
            SELECT * FROM users
        done
        reply users
    done

    route post "/users"
        remember missing as validate(body of request, ["name", "email"])
        if length(missing) is greater than 0
            status 400
            reply missing
        otherwise
            reply "created"
        done
    done

done

start env("PORT")
```

`param("id")`, `query("page")` and `header("x-token")` read request data;
`group` composes path prefixes; `status <n>` sets the response code.

### Databases with parameters and transactions

```plain
database "app.db"                    // or: postgres env("DATABASE_URL")

transaction
    insert
        INSERT INTO users (name) VALUES ({who})
    done
done
```

Placeholders `{likeThis}` bind to Plain variables. `postgres "..."` switches
every SQL statement to node-postgres pool queries (`$n`, awaited).

### Email

```plain
mail transport
    host is "smtp.gmail.com"
    port is 587
    user is env("EMAIL_USER")
    pass is env("EMAIL_PASS")
done

send mail
    from is "hello@plain.dev"
    to is "you@example.com"
    subject is "Hello from Plain"
    text is "Sent from a Plain program."
done
```

### Cron and background jobs

```plain
every 5 minutes
    show "heartbeat"
done

schedule "0 2 * * *"
    show "nightly cleanup"
done

run background resizeImage("photo.png")
```

### WebSocket servers

```plain
websocket server on 8080
    when socket connects
        send socket "Welcome!"
    done
    when socket sends message
        broadcast message
    done
done
```

### Cache (Redis)

```plain
cache env("REDIS_URL")
remember token as cacheGet("token")
cacheSet("greeting", "hi", 60)
cacheDelete("greeting")
```

---

## Multi-file projects (v0.4.1)

```plain
import "./math.pln"
import "./utils.pln"

show PI

show double(5)
```

---

## Express server (v0.3)

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

---

## Project management (v0.4.2)

```bash
plain init              # Create plain.json
plain install           # Install all project dependencies
plain add express       # Add a package
plain remove express    # Remove a package
plain update            # Update all packages
plain start             # Run the entry file from plain.json
plain doctor            # Check project environment
```

---

## Supported packages

| Plain                     | Compiles to                          |
|---------------------------|--------------------------------------|
| `use express`            | `const express = require('express');` |
| `use sqlite`             | `const Database = require('better-sqlite3');` |
| `use fs`                 | `const fs = require('fs');`          |
| `use path`               | `const path = require('path');`      |

Any npm package can be used, including hyphenated names like `node-fetch` and
scoped packages like `@scope/package-name`.

---

## Running the tests

```bash
npm test
```

---

## Project structure

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
│   ├── ai/                   — Complex Compilation layer (RFC-0020)
│   │   ├── resolver.js       — deterministic rule matching
│   │   ├── translator.js     — rule → cache → provider → validation
│   │   ├── validator.js      — Complex output validation
│   │   ├── agent.js          — provider-facing translate() interface
│   │   ├── client.js         — OpenAI-compatible HTTP client
│   │   ├── prompt.js         — strict compile prompt builder
│   │   ├── cache.js          — local translation cache
│   │   ├── remote.js         — hosted service client
│   │   ├── server.js         — hosted compiler HTTP service
│   │   └── index.js          — public API + diagnostics
│   ├── rules/                — versioned capability rules
│   │   ├── README.md         — rule authoring specification
│   │   ├── bots/telegram.*   — Telegram bot rule
│   │   ├── http/fetch.*      — HTTP fetch rule
│   │   ├── web/rest-api.*    — REST API rule
│   │   ├── websocket/ws.*    — WebSocket rule
│   │   ├── automation/cron.* — Cron scheduling rule
│   │   └── communication/email.* — Email rule
│   └── cli.js                — command-line entry point
│
├── examples/
│   ├── hello.pln
│   ├── day2.pln
│   ├── day3.pln
│   ├── arrays.pln
│   ├── objects.pln
│   ├── loops.pln
│   ├── expressions.pln
│   ├── stdlib.pln
│   ├── server.pln
│   ├── web-app.pln
│   ├── start.pln
│   ├── database.pln
│   └── deployment.pln
│
├── tests/
│   ├── compiler.test.js
│   ├── telegram.test.js
│   └── ai.test.js
│
├── docs/
│   ├── PLAIN_SPEC.md
│   └── AI_COMPILATION.md
│
├── .env.example
├── render.yaml
├── package.json
└── README.md
```
