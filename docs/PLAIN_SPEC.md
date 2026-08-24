# Plain Language Specification (v2.1.1)

Version: 2.1.1
Status: Stable
File Extension: .pln

Tagline: "When even a simple sentence can be code."

---

## Mission

Plain is an Intent-Oriented Programming Language (IOPL).

Its goal is to let developers describe WHAT they want while the compiler decides HOW JavaScript should implement it.

Plain is designed to be: beginner-friendly, readable, predictable, consistent, and easy to teach.

Every keyword should be understandable by a 12-year-old.

---

## Core Principles

1. One way to do everything.
2. Readability over fewer characters.
3. Keywords never have aliases.
4. Error messages should teach.
5. JavaScript is an implementation detail.
6. Code should read like documentation.

---

## Comments

    // This is a comment

---

## Variables

Declare:

    remember name as "Ayokunle"
    remember age as 16

Reassign:

    age becomes 17

---

## Printing

    show "Hello"
    show("Hello")
    show age
    show(players[0])
    show user.name

Both keyword form (`show expr`) and call form (`show(expr)`) are valid and produce identical output.

---

## Conditions

    if age is 18
        show "Adult"
    otherwise
        show "Minor"
    done

### Comparison Operators

| Plain                        | JavaScript         |
|------------------------------|--------------------|
| `is` / `is equal to`         | `===`              |
| `is not`                     | `!==`              |
| `is greater than`            | `>`                |
| `is above`                   | `>`                |
| `is less than`               | `<`                |
| `is below`                   | `<`                |
| `is at least`                | `>=`               |
| `is at most`                 | `<=`               |
| `is empty`                   | `.length === 0`    |
| `is not empty`               | `.length > 0`      |
| `contains "x"`               | `.includes("x")`   |
| `starts with "x"`            | `.startsWith("x")` |
| `ends with "x"`              | `.endsWith("x")`   |
| `between A and B`            | `>= A && <= B`     |

---

## Functions

    make greet()
        show "Hello"
    done

    greet()

    make add(a, b)
        give a + b
    done

    show add(5, 7)

---

## Arrays

    remember players as [
        "Haaland",
        "Foden",
        "Rodri"
    ]

    show players[0]
    players[1] becomes "Palmer"

---

## Objects

    remember user as
        name is "Ayokunle"
        age is 17
        country is "Nigeria"
    done

    show user.name
    user.age becomes 18

---

## Loops

For each:

    for each player in players
        show player
    done

For every (alias for for each):

    for every item in basket
        show item
    done

While:

    while age is less than 18
        age becomes age + 1
    done

---

## Standard Library

All built-in functions are available without any `use` or `import` statement.

### Strings & Numbers

| Plain           | JavaScript equivalent   |
|-----------------|-------------------------|
| `length(x)`     | `(x).length`            |
| `uppercase(x)`  | `(x).toUpperCase()`     |
| `lowercase(x)`  | `(x).toLowerCase()`     |
| `random()`      | `Math.random()`         |
| `round(x)`      | `Math.round(x)`         |

### String Templates

Backtick-delimited strings preserve whitespace and support `${expression}` interpolation. They compile to JavaScript template literals.

    remember name as "World"
    remember greeting as `Hello ${name}!`
    show greeting

    remember body as `{"key": "value"}`
    remember response as await fetch "https://api.example.com" with
      method is "POST"
      body is body
      headers is { "Content-Type": "application/json" }
    done

Multiline templates preserve line breaks:

    remember email as `Dear ${customer},

    Thank you for your order #${orderId}.

    Best regards,
    The Team`

Notes:
- Interpolation `${expr}` compiles directly to JavaScript `${expr}` — it is not evaluated at compile time.
- Literal dollar signs that are not followed by `{` are preserved as-is (e.g. `` `$5` ``).
- Embedded backtick characters within the template content are escaped in the output.

### I/O & Files

| Plain                        | JavaScript equivalent                            |
|------------------------------|--------------------------------------------------|
| `print(x)`                   | `console.log(x)`                                 |
| `readFile(path)`             | `require('fs').readFileSync(path, 'utf8')`       |
| `writeFile(path, content)`   | `require('fs').writeFileSync(path, content, 'utf8')` |
| `fileExists(path)`           | `require('fs').existsSync(path)`                 |

### Time & System

| Plain          | JavaScript equivalent                  |
|----------------|----------------------------------------|
| `time()`       | `Date.now()`                           |
| `date()`       | `new Date().toISOString()`             |
| `sleep(ms)`    | `Atomics.wait(...)` (synchronous)      |
| `uuid()`       | `require('crypto').randomUUID()`       |
| `env(key)`     | `process.env[key]`                     |
| `exit(code)`   | `process.exit(code)`                   |

### JSON

| Plain              | JavaScript equivalent       |
|--------------------|-----------------------------|
| `jsonEncode(x)`    | `JSON.stringify(x)`         |
| `jsonDecode(s)`    | `JSON.parse(s)`             |

---

## Plain Imports (v0.4.1)

Split a project across multiple `.pln` files:

    import "./math.pln"
    import "./utils.pln"

Rules:

- Paths must be relative (start with `./` or `../`).
- Files are compiled in dependency order (deepest first).
- Duplicate imports are silently de-duplicated.
- Circular imports produce a friendly compiler error.
- Missing files produce a friendly compiler error.

Example project layout:

    app.pln
    math.pln
    utils.pln

`math.pln`:

    remember PI as 3.14

`app.pln`:

    import "./math.pln"
    show PI

Output: one combined JavaScript file with `math.pln` code before `app.pln` code.

---

## Runtime Packages

Supported packages:

    use express    → const express = require('express');
    use sqlite     → const Database = require('better-sqlite3');
    use fs         → const fs = require('fs');
    use path       → const path = require('path');

Any npm package can be declared, including hyphenated and scoped names
(RFC-0011 §5.1):

    use axios                → const axios = require('axios');
    use node-fetch           → require('node-fetch');        // side effect only
    use @scope/package-name  → require('@scope/package-name');

### Aliases and version ranges (v2.0.1)

A package that is not a valid JavaScript identifier gets no binding by
default — declare an alias to bind it to a variable:

    use node-fetch as fetch      → const fetch = require('node-fetch');
    use left-pad as pad          → const pad = require('left-pad');
    use @scope/pkg as scoped     → const scoped = require('@scope/pkg');

Rules:

- The alias must be a valid JavaScript identifier; anything else fails with a
  clear error.
- Built-in runtime packages (`express`, `sqlite`, `fs`, `path`, `axios`,
  `chalk`) keep their canonical bindings; aliasing them is an error.
- A package can be required once per alias; the plain form and an aliased
  form of the same package may coexist.

Version ranges are part of the specifier and flow through to installation;
`require()` always uses the bare name:

    use left-pad@^1.3.0          → require('left-pad');   // npm install left-pad@^1.3.0
    use sqlite@7                 → const Database = require('better-sqlite3');
    use dotenv@16 as env         → const env = require('dotenv');

`plain install`, `plain run`, and `plain build` check installed-ness by bare
package name but install with the full `name@range` specifier.

### Runtime dependency detection and installation

The compiler exposes a reusable dependency detector that reads Plain source
without duplicate results. It scans every `use` statement and runtime
shorthand, returning a unique list of npm package names in first-seen order.

Plain module names are mapped to npm packages:

| Plain module | npm package |
|--------------|-------------|
| `express`    | `express`   |
| `sqlite`     | `better-sqlite3` |
| `web app`    | `express`   |
| `axios`      | `axios`     |
| `chalk`      | `chalk`     |
| `ocr`        | `tesseract.js` |

Node built-in modules, including `fs` and `path`, are ignored because they do
not need to be installed. A source file with no runtime package uses returns
an empty list.

Version ranges survive detection: `use left-pad@^1.3.0` is reported as
`left-pad@^1.3.0`, and friendly names map through the range (`use sqlite@7`
is reported as `better-sqlite3@7`).

Built-in modules are never installed. Missing npm packages are installed by
`plain install`, `plain run`, and `plain build`; package checks are cached for
the duration of one CLI command so repeated imports do not rescan the
filesystem.

### Deployment workflow

```bash
plain init
plain install
plain build app.pln
plain run app.pln
```

`plain start` uses the `entry` value in `plain.json` and performs the complete
install, compile, and run workflow. `plain doctor` reports missing tools,
configuration, or dependencies. Generated JavaScript remains standard
Node.js-compatible JavaScript and runtime `require()` declarations are emitted
once in deterministic order.

---

## Express Server

Classic style:

    use express

    remember app as express()

    serve folder "public"

    when someone visits "/"
        reply "Hello from Plain!"
    done

    when someone visits "/api/status"
        reply json
            status is "ok"
            version is "1.0"
        done
    done

    listen on 3000
        show "Server running at http://localhost:3000"
    done

Shorthand style:

    web app

    route "/"
        reply "Hello from Plain!"
    done

    start 3000

### Routes

    when someone visits "<path>"
        ...
    done

    route "<path>"
        ...
    done

Both compile to: `app.get(path, (req, res) => { ... })`

Inside route bodies:

- `request` → `req`
- `response` → `res`

### Sending Responses

    reply "Hello"          → res.send("Hello")
    reply user             → res.send(user)

### JSON Responses

    reply json
        name is "Plain"
        version is "1.0"
    done

Compiles to: `res.json({ "name": "Plain", "version": "1.0" })`

### Static Files

    serve folder "public"

Compiles to: `app.use(express.static("public"))`

### Listening

    listen on 3000
        show "Running"
    done

Compiles to: `app.listen(3000, () => { ... })`

### Start (shorthand)

    start 3000

Compiles to: `app.listen(3000)`

---

## SQLite

Classic style:

    use sqlite

    remember db as sqlite("database.db")

Compiles to: `new Database("database.db")`

Shorthand style:

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

### SQL Block Commands

| Plain              | Compiles to                      |
|--------------------|----------------------------------|
| `database "f.db"`  | `const db = new Database("f.db")`|
| `query ... done`   | `db.prepare(...).all()`          |
| `insert ... done`  | `db.prepare(...).run()`          |
| `update ... done`  | `db.prepare(...).run()`          |
| `delete ... done`  | `db.prepare(...).run()`          |
| `execute ... done` | `db.exec(...)`                   |

---

## HTTP Routing (v2.1.0)

Method routes extend the v0.6 route shorthand. The plain form stays GET.

    route get|post|put|patch|delete "<path>" ... done
    group "<prefix>" ... done

Groups compose: a route inside two groups accumulates both prefixes.
`param("id")`, `query("page")` and `header("x-token")` read request data and
are compile-time errors outside routes. `status <expr>` sets the response
code; `status becomes n` keeps its ordinary variable meaning. `allow cors`
enables permissive CORS middleware (including OPTIONS preflight). Inside a
`web app` block the body is parsed as JSON automatically.

    remember missing as validate(body of request, ["name", "email"])

returns the list of missing field names.

## Databases (v2.1.0)

SQL placeholders are written `{likeThis}` and bind to Plain variables of the
same name. Results are captured with `remember`:

    database "app.db"
    remember who as "ana"
    insert
        INSERT INTO users (name) VALUES ({who})
    done
    remember adults as query
        SELECT * FROM users WHERE age >= {minAge}
    done
    transaction
        insert
            INSERT INTO users (name) VALUES ('bo')
        done
    done

A `transaction ... done` block runs all enclosed writes atomically.

PostgreSQL swaps the driver for every later SQL statement:

    postgres env("DATABASE_URL")

compiles to `new Pool({ connectionString })`; queries become awaited pool
queries with `$n` markers, and `remember x as query` captures `.rows`.

## Filesystem and Helpers (v2.1.0)

Filesystem: `copyFile`, `moveFile`, `deleteFile`, `makeFolder`,
`deleteFolder`, `listFolder`, `appendFile`, `readBytes`, `writeBytes`.

Text/numbers: `trim`, `replace`, `split`, `join`, `number`, `text`, `floor`,
`ceiling`. Collections: `sort` (unified ordering across types), `reverse`,
`unique`, `sum`, `smallest`, `largest`, `keys`, `values`, `hasKey`, `merge`.

## Email (v2.1.0)

    mail transport
        host is "smtp.gmail.com"
        port is 587
        user is env("EMAIL_USER")
        pass is env("EMAIL_PASS")
    done

    send mail
        from is "hello@plain.dev"
        to is "you@example.com"
        subject is "Hello"
        text is "Body"
    done

Uses nodemailer; `user`/`pass` become the SMTP `auth`.

## Scheduling and Background Jobs (v2.1.0)

    every 5 minutes
        show "tick"
    done

    schedule "0 2 * * *"
        show "nightly cleanup"
    done

    run background resizeImage("photo.png")

`every` accepts seconds/minutes/hours/days (plural or singular). `schedule`
accepts any standard cron expression (powered by croner). `run background`
fires the call without blocking; errors are logged, never raised.

## WebSocket Servers (v2.1.0)

    websocket server on 8080
        when socket connects
            send socket "Welcome!"
        done
        when socket sends message
            broadcast message
        done
        when socket disconnects
        done
    done

Handlers are optional. `send socket <value>` replies to one client,
`broadcast <value>` to all connected clients. Uses the ws package.

## Cache (v2.1.0)

    cache "redis://localhost:6379"

connects Redis once. Then:

| Plain                        | Compiles to                    |
|------------------------------|--------------------------------|
| `cacheGet("k")`              | `client.get(k)`                |
| `cacheSet("k", v)`           | `client.set(k, v)`             |
| `cacheSet("k", v, 60)`       | `client.set(k, v, { EX: 60 })` |
| `cacheDelete("k")`           | `client.del(k)`                |

All three are async and require a configured cache first.

---

## Backend Services (v2.1.1)

All statements below compile deterministically. Implementation packages
(`better-sqlite3`, `sql.js`, `multer`) are detected and installed
automatically; they never appear in Plain source.

### Portable databases

    database "app.db"                    // probe native, fall back to WebAssembly
    database "app.db" using "native"     // require better-sqlite3
    database "app.db" using "wasm"       // require sql.js

- The default probes the native driver (`better-sqlite3`) by opening an
  in-memory database; if that fails, the program continues on the pure-
  JavaScript WebAssembly engine (`sql.js`).
- `using "native"` / `using "wasm"` pin the engine; anything else fails at
  compile time.
- The WebAssembly engine writes the whole database file after every mutating
  statement, so data survives restarts. In-memory databases (`":memory:"`)
  are never persisted.
- Transactions run their body exactly once on both engines.

### HTTP client

    get "<url>"
    post <url> with <body>
    put <url> with <body>
    patch <url> with <body>
    delete "<url>"

Optional clauses on any method: `headers { key is "value" ... }` (inline
object or block form) and `timeout <milliseconds>`. Requests are values, so
they compose:

    remember r as get "https://api.example.com/users"

The response is a record:

| Field      | Meaning                                              |
|------------|------------------------------------------------------|
| `ok of r`  | `true` for 2xx status codes                          |
| `status`   | HTTP status number                                   |
| `headers`  | response headers as a record                         |
| `data`     | parsed JSON body when the content type says `json`, otherwise the raw text |

Bodies sent to `post`/`put`/`patch`: records and arrays are serialised as
JSON; strings and buffers are sent verbatim. The default timeout is 30
seconds; a timeout aborts the request and rejects. `wait for fetch(...)`
awaits a raw promise.

### Passwords and tokens

| Plain                                  | Behaviour                                    |
|----------------------------------------|----------------------------------------------|
| `hashPassword(pw)`                     | scrypt hash with per-password salt           |
| `checkPassword(pw, storedHash)`        | constant-time verification, returns boolean  |
| `createToken(payload, secret [, ttl])` | HMAC-signed token, default TTL 3600 seconds  |
| `readToken(token, secret)`             | verified payload or null (tamper/expiry)     |

### Sessions

    web app
    enable sessions "a-long-random-secret"
    route post "/login"
        user of session of request becomes username of body of request
        reply "welcome"
    done
    route post "/logout"
        destroy session
        reply "bye"
    done

- The session rides an HMAC-signed cookie named `plain.sid`
  (`HttpOnly`, `SameSite=Lax`).
- `session of request` is the session record; assign fields onto it with
  `becomes`.
- Reading `session of request` outside a route, or without
  `enable sessions`, is a teaching error.
- The store lives in memory: restarting the process signs everyone out.

### File uploads

    accept uploads limit "5 MB" allow ["image/png", "image/jpeg"] folder "uploads"

All clauses are optional; the statement must appear before the routes it
protects. Inside routes:

| Plain               | Result                                                |
|---------------------|-------------------------------------------------------|
| `upload("field")`   | first file under the field, or null                   |
| `uploads("field")`  | array of files under the field                        |

Each file is a record: `name` (original name), `type` (MIME), `size` (bytes),
`data` (buffer, memory storage) and `path` (string, folder storage). A file
over the limit is rejected with HTTP **413**; a disallowed MIME type with
HTTP **415**. With `folder`, uploaded files are written to disk (the folder
is created if needed).

### Cookies

    set cookie "theme" to "dark" expires in 7 days
    show cookie("theme")
    clear cookie "theme"

`expires in` accepts seconds/minutes/hours/days. Cookie accessors are
route-only.

### Rate limiting

    limit requests to 100 per minute

Sliding window keyed by client IP; requests past the quota receive HTTP 429.
Units: seconds, minutes, hours.

### API-key protection

    require api key from env("API_KEY")

Requests must carry the expected value in the `x-api-key` header; everything
else receives HTTP 401. When the configured key is unset, every request is
rejected (fail closed). Middleware applies to routes registered after it.

### Google OAuth

    google oauth
        id is env("GOOGLE_ID")
        secret is env("GOOGLE_SECRET")
        callback is "https://myapp.dev/auth/google/callback"
        landing is "/dashboard"
    done

Registers two endpoints: `/auth/google` redirects to Google's consent screen
with a signed `state`; `/auth/google/callback` validates the state, swaps the
code for tokens, fetches the profile and stores the user on the session
before redirecting to `landing`.

### Custom 404

    when nothing matches
        status 404
        reply json
            error is "No such road"
        done
    done

Registers the final handler at its source position — place it after your
routes.

### Error handling

    try
        remember data as jsonDecode(raw)
    recover as err
        show "bad json: " + message of err
    done

`recover` is optional; without it errors are swallowed. `err` is the thrown
value (use `message of err` for Error objects).

### Retries

    retry 3 times every 5 seconds
        wait for fetch("https://flaky.api")
    done

`every` is optional (default delay one second); zero seconds retries
immediately. The body runs until it succeeds or attempts run out; failures
are logged with the last error.

---

## OCR (v2.0.1)

Extract text from an image file with Tesseract.js:

    ocr "scan.png" as text
    show text

With a language pack:

    ocr "brief.png" as inhalt using "deu"

Semantics:

- `ocr "<image>" as <variable>` mirrors `ask "<prompt>" as <name>`: the
  extracted text is bound to `<variable>`.
- The image may be any expression that evaluates to an image path, buffer,
  or URL accepted by Tesseract.js.
- `using "<lang>"` selects the Tesseract language pack (`"eng"` by default;
  combinations like `"deu+eng"` are allowed).
- The statement is async — top-level use wraps the program in the async
  runtime, and using it inside a function makes that function async.
- `tesseract.js` is an implementation dependency: it never appears in Plain
  source, but `plain install`, `plain run`, and `plain build` fetch it
  automatically through dependency detection.

Generated JavaScript shape:

```js
const { createWorker } = require('tesseract.js');

async function __ocr(imagePath, lang) {
  const worker = await createWorker(lang || 'eng');
  try {
    const { data } = await worker.recognize(imagePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

let text = await __ocr("scan.png");
```

---

## Developer Experience

### Formatter

Format a Plain file in-place:

    plain fmt app.pln

Formatting rules:

- 4-space consistent indentation
- Trailing whitespace removed from every line
- One blank line between top-level blocks
- Multiple consecutive blank lines collapsed into one
- Multi-line array elements indented relative to their enclosing block

### Syntax Checker

Check syntax without generating JavaScript or running anything:

    plain check app.pln

Exits with code 0 if no errors are found. Exits with code 1 and prints a
friendly error (with line, column, and suggestion where possible) if the
file contains a syntax error.

### VS Code Extension

Install `plain-vscode` for:

- Syntax highlighting
- File icon for `.pln` files
- Auto-closing pairs: `()` `[]` `{}` `""`
- Comment toggling (`//`)
- Bracket matching
- Code folding
- Snippets for common patterns

See `plain-vscode/README.md` for installation instructions.

### Acode Editor

Acode support (`plain-acode/`) provides syntax highlighting and `.pln` file
recognition in the [Acode](https://acode.app) Android editor, using Acode's
modern CodeMirror 6 `editorLanguages` API.

Install it by zipping the `plain-acode/` folder contents (`plugin.json`,
`main.js`, `stream-spec.js`, `README.md`) and selecting the zip in Acode:
Settings → Plugins → "+".

Acode support highlights keywords, comparisons, strings, numbers, comments,
route paths, `use` package names, stdlib calls, v1.1 expressions, number
words, and JavaScript/SQL blocks. It does **not** provide LSP diagnostics,
autocomplete, or compiler execution. The tokenizer in `stream-spec.js` is
pure CommonJS and is exercised by the test suite (`tests/compiler.test.js`).

See `plain-acode/README.md` for details.

---

## Project Management

Plain manages project configuration through `plain.json`.

### plain.json format

    {
        "name": "my-app",
        "version": "0.1.0",
        "entry": "app.pln",
        "dependencies": {
            "express": "^4.18.2"
        }
    }

### Commands

| Command                 | Behaviour                                            |
|-------------------------|------------------------------------------------------|
| `plain run <file.pln>`  | Install dependencies, compile and execute            |
| `plain build <file.pln>`| Install dependencies and compile to JavaScript       |
| `plain check <file.pln>`| Check syntax only (no output, no execution)          |
| `plain fmt <file.pln>`  | Format a Plain file in-place                         |
| `plain new [name]`      | Create a new Plain project                           |
| `plain init`            | Creates `plain.json` in the current directory        |
| `plain install`         | Install dependencies required by source files        |
| `plain start`           | Start the entry file from plain.json                 |
| `plain doctor`          | Check the Plain project environment                  |
| `plain add <pkg>`       | Installs package, adds it to `plain.json`            |
| `plain remove <pkg>`    | Uninstalls package, removes it from `plain.json`     |
| `plain update`          | Runs `npm update` for all installed packages         |
| `plain version`         | Print the compiler version                           |
| `plain help`            | Print help text                                      |

### Dependency Validation

Before compiling, Plain checks that every package referenced by `use` is installed.
If a package is missing, the compiler prints a friendly error and stops:

    Package "express" is not installed.
    Run: plain add express

---

## Reserved Keywords

    remember  becomes  show
    make      give
    if        otherwise  done
    for       each       every   in
    while
    use       import
    when      someone   visits
    listen    on
    reply     json
    serve     folder
    is        greater    less    than
    above     below      at      least   most
    not       empty      contains
    starts    ends       with
    between   and
    web       route      start
    database  query      insert  update  delete  execute
    ask       ocr        using
    true      false      null
    try       recover    retry   times   wait
    accept    uploads    session sessions destroy
    cookie    expires    limit   allow   folder
    rate      requests   enable  oauth   google
    require   api        key     matches nothing
    note

---

This document is the single source of truth for Plain v2.1.1.
Every compiler implementation must follow this specification.
