# PlainScript

<p align="center">
  <img src="docs/logo.jpg" alt="PlainScript Logo" width="200" />
</p>

> "When even a simple sentence can be code."
> Don't forget to star the repo

PlainScript is an Intent-Oriented Programming Language (IOPL). You describe **what** you want; the compiler decides **how** to implement it in JavaScript.

**Current version:** v1.0.0-beta — the `plainscript` npm package with a TypeScript-style production build (`plainscript build` → `dist/`, source names preserved).

---

## Quick start

```bash
npx plainscript new myapp     # scaffolds src/app.ps and package.json
cd myapp
npm install            # installs plainscript as a devDependency plus runtime packages
npm run build          # compiles src/ -> dist/ (plainscript build)
node dist/app.js       # or: npm start
```

Adding PlainScript to an existing project:

```bash
npm install --save-dev plainscript
# start writing src/*.ps files — plainscript build auto-discovers them
```

No global install is needed anywhere — everything runs through npm scripts
and `npx`.

---

## CLI

```
plainscript run    <file.ps>   Install missing dependencies, compile and execute
                         (executes from a scratch dir — nothing is written
                         into your project)
plainscript build  [file.ps]   Compile to dist/. With no argument, builds every
                         .ps file under the source root, preserving names
                         and folder structure
plainscript check  <file.ps>   Check syntax only (no output, no execution)
plainscript fmt    <file.ps>   Format a PlainScript file in-place
plainscript new    [name]       Create a new PlainScript project (npm-ready)
plainscript install             Install dependencies detected in the project's sources
plainscript start               Build src/app.ps and run its dist/ output
plainscript doctor              Check the PlainScript project environment
plainscript add    <package>    Install a package into the project
plainscript remove <package>    Uninstall a package from the project
plainscript update              Update all installed npm packages
plainscript version             Print the compiler version
plainscript help                Print help text
```

---

## Building and configuration

`plainscript build` is a deterministic production build, TypeScript-style but for
`.ps` sources — **zero configuration required**:

- `plainscript build` (no argument) discovers every `.ps` file under `src/` and
  compiles each to `dist/` **preserving source file names and folder structure**:
  `src/messi.ps` → `dist/messi.js`,
  `src/helpers/math.ps` → `dist/helpers/math.js`.
- `plainscript build <file.ps>` compiles a single file into `dist/`.
- Imports are bundled into each output, so every file in `dist/` runs
  standalone under Node.
- Rebuilds are byte-identical — safe to commit, diff, and cache.

Source discovery skips `node_modules`, hidden directories, and the output
directory itself. When no `src/` directory exists, the project root is scanned
instead.

### Optional `plainscript.config.json`

For projects that need custom output or source directories, add a
`plainscript.config.json` with a `compilerOptions` block (like `tsconfig.json`):

```json
{
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./lib",
    "exclude": ["vendor"]
  }
}
```

| Key         | Default                          | Meaning                                      |
|-------------|----------------------------------|----------------------------------------------|
| `outDir`    | `"dist"`                         | Build output directory                       |
| `rootDir`   | `"src"` if it exists, else `"."` | Root that `plainscript build` scans for sources   |
| `exclude`   | `["node_modules"]`               | Directories to skip during source discovery   |

### Publishing a library written in PlainScript

```json
{
    "name": "my-plainscript-library",
    "main": "dist/index.js",
    "scripts": {
        "build": "plainscript build",
        "prepare": "plainscript build"
    },
    "devDependencies": { "plainscript": "^1.0.0-beta" }
}
```

`src/index.ps` builds to `dist/index.js`; consumers install and `require()`
it like any Node package. There is no PlainScript-specific registry or format —
standard `package.json` semantics apply.

---

## Language features

### Variables

```plainscript
remember name as "Ayokunle"
remember age as 16
age becomes 17
```

### String Templates

Backtick-delimited strings preserve whitespace and support `${expression}` interpolation:

```plainscript
remember name as "World"
remember greeting as `Hello ${name}!`
show greeting

remember email as `Dear ${customer},

Thank you for your order #${orderId}.

Best regards,
The Team`
```

Interpolation compiles directly to JavaScript template literals — it is not evaluated at compile time. Literal dollar signs without `{` are preserved as-is.

### Conditions

```plainscript
if age is at least 18
    show "Adult"
otherwise
    show "Teenager"
done

if name contains "PlainScript"
    show "Found it"
done

if score between 90 and 100
    show "A grade"
done
```

All comparison operators:

| PlainScript                  | JavaScript         |
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

```plainscript
make add(a, b)
    give a + b
done
show add(5, 7)
```

### Arrays & Objects

```plainscript
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

```plainscript
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

### PlainScript Expressions

Collections, properties, and files read like sentences.

**Items**

```plainscript
remember players as ["Haaland", "Foden", "Rodri"]

show first player from players   // players[0]
show last player from players    // players[players.length - 1]
show player two from players     // players[1]
first player from players becomes "Haaland"  // players[0] = "Haaland"
```

Number words from `one` to `twenty` map to one-based positions: `player one` is the first item.

**Collections**

```plainscript
show players length              // players.length
add("Palmer" to players)         // players.push("Palmer")
remove("Rodri" from players)     // players.splice(players.indexOf("Rodri"), 1)

if players contains "Foden"      // players.includes("Foden")
    show "Found"
done
```

**Properties**

```plainscript
show name of user                // user.name
show city of address of customer // customer.address.city
name of user becomes "Ayo"       // user.name = "Ayo"
```

`of` chains right-to-left: `city of address of customer` reads the city of the address of the customer.

**Files**

```plainscript
remember data as read("users.txt")   // fs.readFileSync("users.txt", 'utf8')
write(data to "users.txt")           // fs.writeFileSync(data, "users.txt", 'utf8')
```

The older `readFile()` / `writeFile()` forms still work and are unchanged.

### JavaScript Gateway

JavaScript blocks run raw JavaScript with full async support:

```plainscript
remember response as javascript
    const res = await fetch("https://api.example.com")
    const data = await res.json()
    return data
done
show response
```

`ask` reads a line of input from the terminal:

```plainscript
ask "What is your name?" as name
show "Hello, " + name
```

Any npm package can be declared with `use`:

```plainscript
use axios
use node-fetch
use @scope/package-name
```

### TypeScript-parity capabilities (1.0.0-beta)

The full capability-gap audit lives in [`docs/CAPABILITY_GAP_AUDIT.md`](docs/CAPABILITY_GAP_AUDIT.md).
These features close it in PlainScript's own grammar:

- **Record kinds (classes):** `define a kind called "Person" with name is "" done`
  + `create a Person with name "Ada" and age 17`. Plain-object instances; unknown
  fields throw.
- **Concurrency:** `all of [...]`, `any of [...]`, `settled of [...]`,
  `withTimeout(promise, ms)`.
- **Generators:** `yield` inside `make ... done`; consumed with `for each` or
  `spread of`.
- **Reflection:** `typeOf`, `fieldsOf`, `valueOf`, `hasField`, `sizeOf`.
- **Binary:** `base64Encode/Decode`, `textToBytes/bytesToText`, `sha256/sha1/md5`.
- **Config:** `yamlDecode/yamlEncode`, `load env file ".env"`.
- **CLI & processes:** `args()`, `runCommand(cmd, [args])`.
- **Filesystem & paths:** `fileSize`, `fileType`, `lastModified`, `walkFolder`,
  `joinPath`, `baseName`, `folderOf`, `extensionOf`.
- **Streams:** `writeLine`, `appendLine`.
- **Collections:** `keyMap/mapSet/mapGet/mapHas/mapDelete`, `newSet/addToSet`.
- **Dynamic modules:** `loadModule("./m")`.
- **Native tests:** `test "name" ... done` with `check a equals b`,
  `check a contains b`, `check a is b`, `check <expr> raises "msg"`.
- **Exports:** `export <name>`.

---

## Backend Services

Everything below is compiled by the deterministic compiler — no rules, no AI,
no hidden codegen.

### Portable databases (SQLite native or WebAssembly)

```plainscript
database "app.db"                  // probes better-sqlite3, falls back to sql.js
```

`plainscript install` verifies that `better-sqlite3` actually loads; if the native
module cannot be used, PlainScript warns and continues on the pure-JavaScript
WebAssembly engine (`sql.js`) — the same program runs unchanged. Force an
engine explicitly:

```plainscript
database "app.db" using "native"   // hard requirement: better-sqlite3
database "app.db" using "wasm"     // hard requirement: sql.js
```

The WebAssembly engine persists the whole database to disk after every write,
so data survives restarts either way.

### HTTP client

```plainscript
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

```plainscript
remember hash as hashPassword("correct horse")
if checkPassword(password of body of request, hash)
    remember token as createToken(user, env("TOKEN_SECRET"), 3600)
done

remember payload as readToken(token, env("TOKEN_SECRET"))
```

`hashPassword`/`checkPassword` use scrypt; tokens are HMAC-signed with an
expiry and fail closed on tampering or timeout.

### Sessions

```plainscript
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

Sessions ride an HMAC-signed `HttpOnly` cookie (`plainscript.sid`). The store is
in-memory: restarting the server signs everyone out.

### File uploads

```plainscript
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

```plainscript
set cookie "theme" to "dark" expires in 7 days
show cookie("theme")
clear cookie "theme"
```

### Rate limiting

```plainscript
rate limit 100 requests per minute
```

Sliding window per client IP; the quota-exceeded response is HTTP 429.

### Google OAuth

```plainscript
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

```plainscript
when nothing matches
    status 404
    reply json
        error is "No such road"
    done
done
```

### Error handling and retries

```plainscript
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

## Runtime Standard Library

No imports needed. These functions are built into the compiler:

| PlainScript                    | Description                        |
|--------------------------|------------------------------------|
| `print(x)`              | Print a value (`console.log`)      |
| `readFile("path")`      | Read a file as UTF-8 text          |
| `writeFile("path", data)` | Write text to a file            |
| `read("path")`          | Read a file as UTF-8 text   |
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

## Web Apps

```plainscript
web app

route "/"
    reply "Hello from PlainScript!"
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

## SQLite Database

```plainscript
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

## Backend Capabilities

Everything a backend needs, as first-class deterministic language features —
no rules, no AI, no hidden codegen.

### HTTP routing

```plainscript
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
`body()` / `body("field")` read the JSON request body; `group` composes path
prefixes; `status <n>` sets the response code and `redirect to "<url>"` issues a
redirect.

### Databases with parameters and transactions

```plainscript
database "app.db"                    // or: postgres env("DATABASE_URL")

transaction
    insert
        INSERT INTO users (name) VALUES ({who})
    done
done
```

Placeholders `{likeThis}` bind to PlainScript variables. `postgres "..."` switches
every SQL statement to node-postgres pool queries (`$n`, awaited).

### Email

```plainscript
mail transport
    host is "smtp.gmail.com"
    port is 587
    user is env("EMAIL_USER")
    pass is env("EMAIL_PASS")
done

send mail
    from is "hello@plainscript.dev"
    to is "you@example.com"
    subject is "Hello from PlainScript"
    text is "Sent from a PlainScript program."
done
```

### Cron and background jobs

```plainscript
every 5 minutes
    show "heartbeat"
done

schedule "0 2 * * *"
    show "nightly cleanup"
done

run background resizeImage("photo.png")
```

### WebSocket servers

```plainscript
websocket server on 8080
    when socket connects
        send socket "Welcome!"
    done
    when socket sends message
        broadcast message
    done
done
```

### Cache (Redis with in-memory fallback)

```plainscript
cache env("REDIS_URL")          // omit for an in-memory Map store with TTL
remember token as cacheGet("token")
cacheSet("greeting", "hi", 60)
cacheDelete("greeting")
```

Without a configured Redis, `cacheGet`/`cacheSet`/`cacheDelete` transparently fall
back to an in-memory store, so naive caching works out of the box.

### AI / ML

```plainscript
remember reply as chat("gpt-4o-mini", [
    { role: "user", content: "Say hello in two words" }
])

remember vec as embedText("text-embedding-3-small", "PlainScript rocks")
remember score as similarity(vec, embedText("text-embedding-3-small", "I love PlainScript"))

remember tags as ai_tags("PlainScript is an intent-oriented language")
remember article as ai_post("Welcome to PlainScript", ["why IOPL", "quick start"])
```

`chat` and `embedText` are async OpenAI-compatible calls (from `OPENAI_API_KEY`,
override with `options.apiKey`/`options.baseURL`); `similarity` returns -1..1.

### Pagination

```plainscript
remember page as paginate(allUsers, 2, 10)
show page.items          # second page of 10
show page.hasNext        # true if another page exists
```

`paginate(list, page, perPage)` returns
`{ items, count, page, pages, perPage, hasNext, hasPrev }`.

---

## Multi-file projects

```plainscript
import "./math.ps"
import "./utils.ps"

show PI

show double(5)
```

Imports are bundled per entry: `plainscript build` gives every source file its own
standalone output under `dist/`, with imported code inlined.

---

## Express server

```plainscript
use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from PlainScript!"
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

## WhatsApp Bots

Full WhatsApp connectivity through Baileys — the implementation package is
installed automatically and never appears in your source:

```plainscript
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
- `login pairing` also accepts any value — prompt for the number
  at runtime instead of hard-coding it:

  ```plainscript
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

## Project management

```bash
plainscript install           # Install all detected dependencies
plainscript add express       # Add a package
plainscript remove express    # Remove a package
plainscript update            # Update all packages
plainscript start             # Build src/app.ps and run its dist/ output
plainscript doctor            # Check project environment
```

---

## Supported packages

| PlainScript                     | Compiles to                          |
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
plainscript/
├── compiler/
│   ├── lexer.js              — tokenises PlainScript source into tokens
│   ├── parser.js             — builds an AST from tokens
│   ├── generator.js          — generates JavaScript from the AST
│   ├── bundler.js            — resolves imports and bundles files
│   ├── formatter.js          — normalises PlainScript source style
│   ├── dependency-detector.js— detects npm packages from source
│   ├── version.js            — single compiler version constant
│   └── cli.js                — command-line entry point
│
├── examples/
│   ├── hello.ps
│   ├── day2.ps
│   ├── day3.ps
│   ├── arrays.ps
│   ├── objects.ps
│   ├── loops.ps
│   ├── expressions.ps
│   ├── stdlib.ps
│   ├── server.ps
│   ├── web-app.ps
│   ├── start.ps
│   ├── database.ps
│   ├── deployment.ps
│   ├── football-backend/     — acceptance example (SQLite + auth + sessions)
│   │   └── app.ps
│   ├── id-verification/      — acceptance example (uploads + OCR matching)
│   │   ├── app.ps
│   │   └── make-sample-id.js
│   └── whatsapp-bot/         — WhatsApp bots (QR and pairing linking)
│       ├── qr.ps
│       └── pairing.ps
│
├── tests/
│   ├── compiler.test.js      — language, CLI and formatter coverage
│   ├── build.test.js         — build model, config and packaging coverage
│   ├── backend.test.js       — web/database/email/cache runtime tests
│   ├── telegram.test.js      — Telegram bot runtime tests
│   ├── ocr.test.js           — OCR statement tests
│   ├── runtime.test.js       — uploads, database and bot feature suite
│   ├── whatsapp.test.js      — WhatsApp bot runtime tests
│   └── acceptance.test.js    — boots the example projects over live HTTP
│
├── docs/
│   ├── PlainScript_SPEC.md
│   └── index.html
│
├── package.json
└── README.md
```
