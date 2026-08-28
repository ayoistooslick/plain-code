# PlainScript Language Specification (v1.0.1)

Version: 2.1.1
Status: Stable
File Extension: .ps

Tagline: "When even a simple sentence can be code."

---

## Mission

PlainScript is an Intent-Oriented Programming Language (IOPL).

Its goal is to let developers describe WHAT they want while the compiler decides HOW JavaScript should implement it.

PlainScript is designed to be: beginner-friendly, readable, predictable, consistent, and easy to teach.

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

| PlainScript                        | JavaScript         |
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

## Record Kinds, Classes & Concurrency (v1.0.1)

These features close the capability-gap audit (`docs/CAPABILITY_GAP_AUDIT.md`) in
PlainScript's own intent-oriented grammar.

### Record kinds (classes)

Declare a schema with defaults, then build instances.

    define a kind called "Person" with
        name is ""
        age is 0
    done

    remember ada as create a Person with name "Ada" and age 17
    show name of ada          # "Ada"
    show ada.age              # 17

- `create a <Kind> with <field> <value> and <field> <value> ...` builds an
  instance. `and` separates field pairs.
- Unknown constructor fields throw at runtime (`"Person" has no field named "x"`).
- Instances are plain objects: they serialize with `jsonEncode`, pass unchanged
  to `send mail`, DB statements, routes, etc.
- For optional extensions, compose with `merge(a, b)` instead of `extends`.
  Methods are plain `make` functions receiving the record.

### Concurrency combinators

    remember both as all of [pageFetch(), apiFetch()]
    remember winner as any of [slow(), fast()]
    remember results as settled of [maybeFails(), other()]

- `all of [...]` → `Promise.all` (all must resolve).
- `any of [...]` → `Promise.race` (first to settle).
- `settled of [...]` → `Promise.allSettled`; each item is a record with
  `status` (`fulfilled`/`rejected`), `value`, and `reason`.
- `withTimeout(promise, ms)` rejects the promise after `ms` if it has not settled.

### Generators

    make countUp(n)
        remember i as 0
        while i is less than n
            i becomes i + 1
            yield i
        done
    done

    show spread of countUp(3)   # [ 1, 2, 3 ]

A `make ... done` containing `yield` compiles to a generator (`function*`).
Sequences are consumed lazily with `for each` or eagerly with `spread of`.

### Reflection, binary & configuration (stdlib)

| PlainScript                               | Behaviour                                |
|-------------------------------------------|------------------------------------------|
| `typeOf(x)`                                | `text\|number\|boolean\|array\|record\|null\|function\|undefined` |
| `fieldsOf(x)` / `sizeOf(x)`                | record keys / length                     |
| `valueOf(x, key, fallback)` / `hasField`   | safe access / key check                  |
| `base64Encode(s)` / `base64Decode(s)`      | base64 round-trip                        |
| `textToBytes(s)` / `bytesToText(b)`        | UTF-8 bytes round-trip                   |
| `sha256(s)` / `sha1(s)` / `md5(s)`         | hex digests (`crypto`)                   |
| `yamlDecode(s)` / `yamlEncode(v)`          | dependency-free YAML subset              |
| `load env file "path"` (statement)         | applies `KEY=value` to `process.env`     |
| `args()`                                   | `process.argv.slice(2)`                  |
| `runCommand(cmd, [args])`                  | awaits `{ ok, code, stdout, stderr }`    |
| `withTimeout(promise, ms)`                 | rejects on timeout                       |
| `loadModule("./m")`                        | dynamic `require` at runtime             |
| `walkFolder(dir)`                          | recursive list of file paths             |
| `fileSize(p)` / `fileType(p)` / `lastModified(p)` | fs metadata                       |
| `joinPath` / `baseName` / `folderOf` / `extensionOf` | path helpers                    |
| `writeLine(f, t)` / `appendLine(f, t)`     | newline-terminated appends               |
| `keyMap()` + `mapSet/mapGet/mapHas/mapDelete` | JS `Map` helpers                      |
| `newSet()` + `addToSet/removeFromSet/setHas`  | JS `Set` helpers                      |

### Native test DSL

    test "addition"
        check add(2, 3) equals 5
        check "hello" contains "ell"
        check typeOf({}) equals "record"
        check jsonDecode("not json") raises "JSON"
    done

A built-in runner registers every `test "name" ... done` block, prints
`PASS`/`FAIL`, reports a count, and exits `1` if any assertion fails. `check`
is only valid inside a `test` block.

### Exports

    remember configVersion as 3
    export configVersion

`export <name>` marks a top-level symbol for `module.exports`. When any explicit
`export` exists, the automatic top-level function export is suppressed so the
author controls the module surface.

---

## Standard Library

All built-in functions are available without any `use` or `import` statement.

### Strings & Numbers

| PlainScript           | JavaScript equivalent   |
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
- Escape sequences work in both string forms: double-quoted strings decode `\n`, `\t`, `\r`, `\0`, `\\`, `\"`, and `\'` (an unknown escape keeps the escaped character itself); inside backtick templates an escaped backtick stays literal instead of closing the string.
- Embedded backtick characters within the template content are escaped in the output.

### I/O & Files

| PlainScript                        | JavaScript equivalent                            |
|------------------------------|--------------------------------------------------|
| `print(x)`                   | `console.log(x)`                                 |
| `readFile(path)`             | `require('fs').readFileSync(path, 'utf8')`       |
| `writeFile(path, content)`   | `require('fs').writeFileSync(path, content, 'utf8')` |
| `fileExists(path)`           | `require('fs').existsSync(path)`                 |

### Time & System

| PlainScript          | JavaScript equivalent                  |
|----------------|----------------------------------------|
| `time()`       | `Date.now()`                           |
| `date()`       | `new Date().toISOString()`             |
| `sleep(ms)`    | `Atomics.wait(...)` (synchronous)      |
| `uuid()`       | `require('crypto').randomUUID()`       |
| `env(key)`     | `process.env[key]`                     |
| `exit(code)`   | `process.exit(code)`                   |

### JSON

| PlainScript              | JavaScript equivalent       |
|--------------------|-----------------------------|
| `jsonEncode(x)`    | `JSON.stringify(x)`         |
| `jsonDecode(s)`    | `JSON.parse(s)`             |

---

## PlainScript Imports

Split a project across multiple `.ps` files:

    import "./math.ps"
    import "./utils.ps"

Rules:

- Paths must be relative (start with `./` or `../`).
- Files are compiled in dependency order (deepest first).
- Duplicate imports are silently de-duplicated.
- Circular imports produce a friendly compiler error.
- Missing files produce a friendly compiler error.

Example project layout:

    app.ps
    math.ps
    utils.ps

`math.ps`:

    remember PI as 3.14

`app.ps`:

    import "./math.ps"
    show PI

Output: one combined JavaScript file with `math.ps` code before `app.ps` code.

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

### Aliases and version ranges

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

`plainscript install`, `plainscript run`, and `plainscript build` check installed-ness by bare
package name but install with the full `name@range` specifier.

### Runtime dependency detection and installation

The compiler exposes a reusable dependency detector that reads PlainScript source
without duplicate results. It scans every `use` statement and runtime
shorthand, returning a unique list of npm package names in first-seen order.

PlainScript module names are mapped to npm packages:

| PlainScript module | npm package |
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
`plainscript install`, `plainscript run`, and `plainscript build`; package checks are cached for
the duration of one CLI command so repeated imports do not rescan the
filesystem.

### Deployment workflow

```bash
npm install --save-dev plainscript-lang
plainscript install
plainscript build app.ps
plainscript run app.ps
```

`plainscript start` builds `src/app.ps` (or `src/index.ps`) into the output
directory and runs it. `plainscript doctor` reports missing tools, source files,
or dependencies. Generated JavaScript remains standard
Node.js-compatible JavaScript and runtime `require()` declarations are emitted
once in deterministic order.

---

## Express Server

Classic style:

    use express

    remember app as express()

    serve folder "public"

    when someone visits "/"
        reply "Hello from PlainScript!"
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
        reply "Hello from PlainScript!"
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
        name is "PlainScript"
        version is "1.0"
    done

Compiles to: `res.json({ "name": "PlainScript", "version": "1.0" })`

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

| PlainScript              | Compiles to                      |
|--------------------|----------------------------------|
| `database "f.db"`  | `const db = new Database("f.db")`|
| `query ... done`   | `db.prepare(...).all()`          |
| `insert ... done`  | `db.prepare(...).run()`          |
| `update ... done`  | `db.prepare(...).run()`          |
| `delete ... done`  | `db.prepare(...).run()`          |
| `execute ... done` | `db.exec(...)`                   |

---

## HTTP Routing

Method routes extend the basic route shorthand. The plain form stays GET.

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

## Databases

SQL placeholders are written `{likeThis}` and bind to PlainScript variables of the
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

## Filesystem and Helpers

Filesystem: `copyFile`, `moveFile`, `deleteFile`, `makeFolder`,
`deleteFolder`, `listFolder`, `appendFile`, `readBytes`, `writeBytes`.

Text/numbers: `trim`, `replace`, `split`, `join`, `number`, `text`, `floor`,
`ceiling`. Collections: `sort` (unified ordering across types), `reverse`,
`unique`, `sum`, `smallest`, `largest`, `keys`, `values`, `hasKey`, `merge`.

## Email

    mail transport
        host is "smtp.gmail.com"
        port is 587
        user is env("EMAIL_USER")
        pass is env("EMAIL_PASS")
    done

    send mail
        from is "hello@plainscript.dev"
        to is "you@example.com"
        subject is "Hello"
        text is "Body"
    done

Uses nodemailer; `user`/`pass` become the SMTP `auth`.

## Scheduling and Background Jobs

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

## WebSocket Servers

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

## Cache

    cache "redis://localhost:6379"

connects Redis once. Then:

| PlainScript                        | Compiles to                    |
|------------------------------|--------------------------------|
| `cacheGet("k")`              | `client.get(k)`                |
| `cacheSet("k", v)`           | `client.set(k, v)`             |
| `cacheSet("k", v, 60)`       | `client.set(k, v, { EX: 60 })` |
| `cacheDelete("k")`           | `client.del(k)`                |

All three are async and require a configured cache first.

---

## Backend Services

All statements below compile deterministically. Implementation packages
(`better-sqlite3`, `sql.js`, `multer`) are detected and installed
automatically; they never appear in PlainScript source.

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

| PlainScript                                  | Behaviour                                    |
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

- The session rides an HMAC-signed cookie named `plainscript.sid`
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

| PlainScript               | Result                                                |
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

## OCR

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
- `tesseract.js` is an implementation dependency: it never appears in PlainScript
  source, but `plainscript install`, `plainscript run`, and `plainscript build` fetch it
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

## WhatsApp Bots

A `whatsapp bot` block declares one WhatsApp connection and its message
handlers. The implementation package (`@whiskeysockets/baileys`, with
`qrcode-terminal` for QR rendering) is detected, installed, and hidden —
it never appears in PlainScript source.

    whatsapp bot
        auth "session"                      // credential folder
        login pairing "2348012345678"       // or: login qr
                                            // or: login pairing phone

        on message
            log message

            if message.text is "/start"
                reply "Welcome!"
            done

            if message.text is "/help"
                reply `Available commands:
/start /help`
            done
        done
    done

Interactive linking — the number may come from any value:

    ask "WhatsApp number: " as phone

    whatsapp bot
        auth "session"
        login pairing phone
    done

Syntax:

- The block opens with `whatsapp bot` and closes with `done`. It may contain
  at most one `auth`, one `login`, and any number of `on message` handlers;
  anything else is a teaching error.
- `auth "<folder>"` selects the credential folder created by
  `useMultiFileAuthState` and reused across restarts. Optional; defaults to
  `"plainscript-whatsapp-auth"`.
- `login qr` links by scanning a terminal QR code; it is the default when the
  clause is omitted. `login pairing "<number>"` requests an enter-on-phone
  pairing code instead. Pairing numbers are validated at compile time: after
  stripping separators and a leading plus (`+234 801-234-5678`) they must be
  8–15 digits.
- `login pairing` also accepts any PlainScript value
  (`login pairing phone`) — typically a variable filled by `ask`. Values are
  normalized and validated when the bot starts; invalid input fails with the
  same teaching message before any connection attempt.
- `on message ... done` registers one handler for incoming messages. Inside:
  - `message` refers to the normalized record `{ text, chat, sender, name,
    id, time, isGroup }` of the current delivery.
  - `log message` prints the record to the console; using it outside an
    `on message` body is a compile-time teaching error.
  - `reply <value>` answers the current chat — strings verbatim, other values
    as JSON.

Runtime semantics:

- Only `messages.upsert` events of type `notify` are delivered; the bot's own
  outgoing messages (`fromMe`) and `status@broadcast` are filtered out before
  handlers run.
- Ephemeral and view-once wrappers are unwrapped; text falls back through
  caption fields for media messages.
- Group chats set `sender` to the participant JID and `isGroup` to true;
  replies go to the group chat.
- Handler errors are logged and never crash the process.
- On transient disconnects the socket reconnects after 3 seconds; a remote
  sign-out stops cleanly instead of looping.

Generated JavaScript shape (abridged):

```js
const { __whatsappStart, __whatsappOnMessage, __whatsappReply } = (() => {
  // makeWASocket + useMultiFileAuthState + fetchLatestBaileysVersion live in
  // here, behind require('@whiskeysockets/baileys')
})();
await __whatsappStart({ folder: "session", login: { mode: 'pairing', phone: "2348012345678" } });
// value form: login: { mode: 'pairing', phone: (phone) }
__whatsappOnMessage(async (__waCtx) => {
  console.log(__waCtx.message);
  if (__waCtx.message.text === "/start") {
    await __whatsappReply(__waCtx.chat, "Welcome!");
  }
});
```

---

## Developer Experience

### Formatter

Format a PlainScript file in-place:

    plainscript fmt app.ps

Formatting rules:

- 4-space consistent indentation
- Trailing whitespace removed from every line
- One blank line between top-level blocks
- Multiple consecutive blank lines collapsed into one
- Multi-line array elements indented relative to their enclosing block

### Syntax Checker

Check syntax without generating JavaScript or running anything:

    plainscript check app.ps

Exits with code 0 if no errors are found. Exits with code 1 and prints a
friendly error (with line, column, and suggestion where possible) if the
file contains a syntax error.

### VS Code Extension

Install `plainscript-vscode` for:

- Syntax highlighting
- File icon for `.ps` files
- Auto-closing pairs: `()` `[]` `{}` `""`
- Comment toggling (`//`)
- Bracket matching
- Code folding
- Snippets for common patterns

See `plainscript-vscode/README.md` for installation instructions.

### Acode Editor

Acode support (`plainscript-acode/`) provides syntax highlighting and `.ps` file
recognition in the [Acode](https://acode.app) Android editor, using Acode's
modern CodeMirror 6 `editorLanguages` API.

Install it by zipping the `plainscript-acode/` folder contents (`plugin.json`,
`main.js`, `stream-spec.js`, `README.md`) and selecting the zip in Acode:
Settings → Plugins → "+".

Acode support highlights keywords, comparisons, strings, numbers, comments,
route paths, `use` package names, stdlib calls, expression words, number
words, and JavaScript/SQL blocks. It does **not** provide LSP diagnostics,
autocomplete, or compiler execution. The tokenizer in `stream-spec.js` is
pure CommonJS and is exercised by the test suite (`tests/compiler.test.js`).

See `plainscript-acode/README.md` for details.

---

## Project Management

PlainScript follows a zero-configuration model. Source files live in `src/` (or the
project root when `src/` doesn't exist) and `plainscript build` discovers them
automatically, preserving file names and directory structure into `dist/`.

For projects that need custom output or source directories, add an optional
`plainscript.config.json` with a `compilerOptions` block:

```json
{
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./lib",
    "exclude": ["vendor"]
  }
}
```

### Commands

| Command                 | Behaviour                                            |
|-------------------------|------------------------------------------------------|
| `plainscript run <file.ps>`   | Install dependencies, compile and execute            |
| `plainscript build [file]`     | Compile to dist/ preserving names; no arg builds all|
| `plainscript check <file.ps>` | Check syntax only (no output, no execution)          |
| `plainscript fmt <file.ps>`   | Format a PlainScript file in-place                          |
| `plainscript new [name]`       | Create a new PlainScript project                            |
| `plainscript install`          | Detect and install dependencies from source files     |
| `plainscript start`            | Build src/app.ps and run its dist/ output            |
| `plainscript doctor`           | Check the PlainScript project environment                   |
| `plainscript add <pkg>`        | Install a package into the project                     |
| `plainscript remove <pkg>`     | Uninstall a package from the project                   |
| `plainscript update`           | Runs `npm update` for all installed packages         |
| `plainscript version`          | Print the compiler version                           |
| `plainscript help`             | Print help text                                      |

### Dependency Validation

Before compiling, PlainScript checks that every package referenced by `use` is installed.
If a package is missing, the compiler prints a friendly error and stops:

    Package "express" is not installed.
    Run: plainscript add express

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

This document is the single source of truth for PlainScript v1.0.1.
Every compiler implementation must follow this specification.
