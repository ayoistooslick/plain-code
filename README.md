# PLIN

<p align="center">
  <img src="docs/og.svg" alt="PLIN Logo" width="200" />
</p>

> "When even a simple sentence can be code."
> Don't forget to star the repo

PLIN is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

**Current version:** v0.1.7 — the `plin` npm package with a TypeScript-style production build (`plin build` → `dist/`, source names preserved).

---

## Quick start

```bash
npx plin new myapp     # scaffolds src/app.pln, plin.config.json, package.json
cd myapp
npm install            # installs plin as a devDependency plus runtime packages
npm run build          # compiles src/ -> dist/ (plin build)
node dist/app.js       # or: npm start
```

Adding PLIN to an existing project:

```bash
npm install --save-dev plin
npx plin init          # creates plin.config.json (+ index.pln if missing)
```

No global install is needed anywhere — everything runs through npm scripts
and `npx`.

---

## CLI

```
plin run    <file.pln>   Install missing dependencies, compile and execute
                         (executes from a scratch dir — nothing is written
                         into your project)
plin build  [file.pln]   Compile to dist/. With no argument, builds every
                         .pln file under the source root, preserving names
                         and folder structure
plin check  <file.pln>   Check syntax only (no output, no execution)
plin fmt    <file.pln>   Format a PLIN file in-place
plin new    [name]       Create a new PLIN project (npm-ready)
plin init                Create a plin.config.json in the current directory
plin install             Install dependencies required by the project's source files
plin start               Build the configured entry and run its dist/ output
plin doctor              Check the PLIN project environment
plin add    <package>    Install a package and add it to plin.config.json
plin remove <package>    Remove a package from plin.config.json and uninstall it
plin update              Update all installed npm packages
plin version             Print the compiler version
plin help                Print help text
```

---

## Building and configuration

`plin build` is a deterministic production build, TypeScript-style but for
`.pln` sources:

- Output goes to `dist/` (configurable via `outDir`) and **source file names
  are preserved**: `src/messi.pln` → `dist/messi.js`,
  `src/helpers/math.pln` → `dist/helpers/math.js`.
- Imports are bundled into each output, so every file in `dist/` runs
  standalone under Node.
- Rebuilds are byte-identical — safe to commit, diff, and cache.

Configuration lives in `plin.config.json`:

```json
{
    "name": "my-app",
    "version": "1.0.0",
    "entry": "index.pln",
    "srcDir": "src",
    "outDir": "dist"
}
```

| Key      | Default                          | Meaning                              |
|----------|----------------------------------|--------------------------------------|
| `outDir` | `"dist"`                         | Build output directory               |
| `srcDir` | `"src"` if it exists, else `"."` | Root that `plin build` scans         |
| `entry`  | auto-detected                    | File used by `plin start` / `install`|

Source discovery skips `node_modules`, hidden directories, and the output
directory itself.

### Publishing a library written in PLIN

```json
{
    "name": "my-plin-library",
    "main": "dist/index.js",
    "scripts": {
        "build": "plin build",
        "prepare": "plin build"
    },
    "devDependencies": { "plin": "^0.1.7" }
}
```

`src/index.pln` builds to `dist/index.js`; consumers install and `require()`
it like any Node package. There is no PLIN-specific registry or format —
standard `package.json` semantics apply.

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

## Backend Services (v2.1.1)

Everything below is compiled by the deterministic compiler — no rules, no AI,
no hidden codegen.

### Portable databases (SQLite native or WebAssembly)

```plain
database "app.db"                  // probes better-sqlite3, falls back to sql.js
```

`plin install` verifies that `better-sqlite3` actually loads; if the native
module cannot be used, PLIN warns and continues on the pure-JavaScript
WebAssembly engine (`sql.js`) — the same program runs unchanged. Force an
engine explicitly:

```plain
database "app.db" using "native"   // hard requirement: better-sqlite3
database "app.db" using "wasm"     // hard requirement: sql.js
```

The WebAssembly engine persists the whole database to disk after every write,
so data survives restarts either way.

### HTTP client

```plain
remember r as get "https://api.example.com/users"
if ok of r
    show status of r
    show data of r
done

remember created as post url with body
    headers { accept: "application/json" }
    timeout 5000
```

Methods: `get`, `post … with <body>`, `put`, `patch`, `delete "<url>"`.
Responses are records: `ok`, `status`, `headers`, `data` (JSON is parsed
automatically). The default timeout is 30 seconds. `wait for fetch(...)`
awaits raw promises when you need it.

### Passwords and tokens (built-in auth)

```plain
remember hash as hashPassword("correct horse")
if checkPassword(password of body of request, hash)
    remember token as createToken(user, env("TOKEN_SECRET"), 3600)
done

remember payload as readToken(token, env("TOKEN_SECRET"))
```

`hashPassword`/`checkPassword` use scrypt; tokens are HMAC-signed with an
expiry and fail closed on tampering or timeout.

### Sessions

```plain
web app
enable sessions "a-long-random-secret"

route post "/login"
    user of session of request becomes username of body of request
    reply "welcome"
done

route get "/me"
    reply user of session of request
done

route post "/logout"
    destroy session
    reply "bye"
done
```

Sessions ride an HMAC-signed `HttpOnly` cookie (`plain.sid`). The store is
in-memory: restarting the server signs everyone out.

### File uploads

```plain
accept uploads limit "5 MB" allow ["image/png", "image/jpeg"] folder "uploads"

route post "/scan"
    remember file as upload("doc")
    ocr path of file as text
    reply "scanned: " + text
done
```

Files arrive as records with `name`, `type`, `size`, `data` (buffer) and
`path` (string, when a folder is set). Oversized files get HTTP 413, wrong
types 415. `uploads("docs")` returns every file under a field name.

### Cookies

```plain
set cookie "theme" to "dark" expires in 7 days
show cookie("theme")
clear cookie "theme"
```

### Rate limiting

```plain
rate limit 100 requests per minute
```

Sliding window per client IP; the quota-exceeded response is HTTP 429.

### Google OAuth

```plain
google oauth
    id is env("GOOGLE_ID")
    secret is env("GOOGLE_SECRET")
    callback is "https://myapp.dev/auth/google/callback"
    landing is "/dashboard"
done
```

Registers `/auth/google` (redirect) and `/auth/google/callback`
(code-for-token exchange + profile fetch); after login the session holds the
user and the browser lands on `landing`.

### Custom 404

```plain
when nothing matches
    status 404
    reply json
        error is "No such road"
    done
done
```

### Error handling and retries

```plain
try
    remember data as jsonDecode(raw)
recover as err
    show "bad json: " + message of err
done

retry 3 times every 5 seconds
    wait for fetch("https://flaky.api")
done
```

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

Imports are bundled per entry: `plin build` gives every source file its own
standalone output under `dist/`, with imported code inlined.

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

## WhatsApp Bots (v2.1.1)

Full WhatsApp connectivity through Baileys — the implementation package is
installed automatically and never appears in your source:

```plain
whatsapp bot
    auth "session"                          // credential folder, persists
                                            // across restarts
    login qr                                // or: login pairing "2348012345678"

    on message
        log message                         // print the normalized record

        if message.text is "/start"
            reply "Welcome!"
        done

        if message.text is "/help"
            reply `Available commands:
/start /help`
        done
    done
done
```

- `login qr` prints a scannable QR code; `login pairing "<number>"` prints an
  enter-on-phone code instead. Pairing numbers are validated at compile time
  (digits only after normalization, 8–15).
- Since v2.1.2, `login pairing` also accepts any value — prompt for the number
  at runtime instead of hard-coding it:

  ```plain
  ask "WhatsApp number: " as phone

  whatsapp bot
      auth "session"
      login pairing phone
  done
  ```

- Inside `on message`, `message` holds `{ text, chat, sender, name, id,
  time, isGroup }`; `reply` answers the current chat.
- The bot ignores its own messages and status broadcasts and keeps working in
  groups; transient disconnects reconnect after 3 seconds.

See `examples/whatsapp-bot/` for ready-to-link programs.

---

## Project management (v0.4.2)

```bash
plin init              # Create plin.config.json
plin install           # Install all project dependencies
plin add express       # Add a package
plin remove express    # Remove a package
plin update            # Update all packages
plin start             # Build the entry and run its dist/ output
plin doctor            # Check project environment
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
plin/
├── compiler/
│   ├── lexer.js              — tokenises PLIN source into tokens
│   ├── parser.js             — builds an AST from tokens
│   ├── generator.js          — generates JavaScript from the AST
│   ├── bundler.js            — resolves imports and bundles files
│   ├── formatter.js          — normalises PLIN source style
│   ├── dependency-detector.js— detects npm packages from source
│   ├── version.js            — single compiler version constant
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
│   ├── deployment.pln
│   ├── football-backend/     — v2.1.1 acceptance example (SQLite + auth + sessions)
│   │   └── app.pln
│   ├── id-verification/      — v2.1.1 acceptance example (uploads + OCR matching)
│   │   ├── app.pln
│   │   └── make-sample-id.js
│   └── whatsapp-bot/         — v2.1.1 WhatsApp bots (QR and pairing linking)
│       ├── qr.pln
│       └── pairing.pln
│
├── tests/
│   ├── compiler.test.js      — language, CLI and formatter coverage
│   ├── build.test.js         — build model, config and packaging coverage
│   ├── backend.test.js       — web/database/email/cache runtime tests
│   ├── telegram.test.js      — Telegram bot runtime tests
│   ├── ocr.test.js           — OCR statement tests
│   ├── v211.test.js          — v2.1.1 feature suite
│   ├── whatsapp.test.js      — WhatsApp bot runtime tests
│   └── acceptance.test.js    — boots the example projects over live HTTP
│
├── docs/
│   ├── PLAIN_SPEC.md
│   └── index.html
│
├── package.json
└── README.md
```
