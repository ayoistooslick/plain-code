# knowledge.md — Teach any AI to write Plain in one file

> **Purpose:** Plain is a small language, but it has sharp edges that trip up
> code generators (LLMs included). This file is the fastest way to teach an AI
> — ChatGPT, Claude, Cursor, Copilot — to write Plain code that actually
> compiles with `@ayoxx/plain-code` v2.1.1.
>
> **How to use:**
> 1. Paste this entire file into your AI chat before asking it to write Plain.
> 2. Or save it as `AGENTS.md` / `knowledge.md` in your project root so coding
>    agents pick it up automatically.
> 3. Everything below was verified against the real compiler — every example
>    compiles, every "don't" was tested and fails.

---

## 1. The mental model

Plain source files (`.pln`) compile to readable Node.js JavaScript.

- Statements are near-English sentences.
- Blocks open with a keyword and **always close with `done`** — no braces.
- Indentation is optional but recommended (4 spaces).
- The compiler auto-wraps programs in an async runtime when needed, so
  top-level async statements just work.
- Backend plumbing (express, pg, better-sqlite3, sql.js, nodemailer, croner,
  ws, redis, multer) is generated for you — implementation packages never
  appear in your source and are installed automatically on `plain run`.

```plain
// app.pln
remember name as "World"
remember greeting as `Hello ${name}!`
show greeting
```

```bash
plain run app.pln        # installs missing deps, compiles, runs
plain build app.pln      # writes app.js — read it to see exactly what happens
```

---

## 2. Hard rules — where AI-generated code usually breaks

These are verified compiler behaviors. Do not generate code that violates them.

1. **Blocks close with `done`.** `if`, `for`, `while`, `make`, route, group,
   transaction, mail, schedule and handler bodies, object literals, SQL blocks,
   JavaScript blocks, `try`, `retry`, `google oauth`, `when nothing matches`
   — all end with `done`.

2. **Arithmetic uses `+ - * / %` with standard precedence.** Parenthesised
   groups and unary minus work: `(a + b) * -c`, `n % 2`. There is no exponent
   operator and no `Math.*` surface — need more math? Use a JavaScript block:

   ```plain
   remember total as javascript
       return Math.sqrt(price * quantity - discount)
   done
   ```

3. **Conditions must contain a comparison.** `if x is 1`, `if list contains
   item`, `if name starts with "A"` work; `if running()` does not compile.
   There is no truthy check — compare booleans explicitly with
   `if ready is true`.

4. **Combine comparisons with `and` / `or` / `not`.** `and` binds tighter than
   `or`; `not` negates one comparison:

   ```plain
   if age is at least 13 and age is at most 19
       show "teenager"
   done

   if not name is empty and logged in is true
       show name
   done
   ```

5. **No `otherwise if`.** Nest inside `otherwise` instead (each level gets its
   own `done`):

   ```plain
   if x is 1
       show "one"
   otherwise
       if x is 2
           show "two"
       otherwise
           show "many"
       done
   done
   ```

6. **No method calls on values.** `list.push(x)`, `text.trim()`,
   `response.json()` do not compile. Calls only work as bare identifiers:
   builtins (`length(x)`), user functions (`add(1, 2)`), known packages
   (`sqlite("app.db")`), and the route-only web accessors (`param("id")`,
   `cookie("theme")`, `upload("file")`). Record fields use `of` or a dot:
   `data of response`, `response.status`. Anything else → JavaScript block.

7. **No `await` prefix in expressions.** Use **`wait for`** instead — it
   awaits a single operation and binds tighter than binary operators:

   ```plain
   remember user as wait for loadUser(id)      // (await loadUser(id))
   wait for saveUser(record)                   // statement form
   remember stats as wait for get "https://api.example.com/stats"
   ```

8. **Error handling is `try` / `recover`.** `try ... done` swallows errors;
   `recover [as err]` handles them:

   ```plain
   try
       remember data as jsonDecode(raw)
   recover as err
       show "bad json: " + message of err
   done
   ```

   There is no `finally`. For try/finally patterns, use a JavaScript block.

9. **Comments start with `//`.** There is no `note` keyword in the current
   deterministic parser.

10. **Keywords are reserved.** Don't name variables `show`, `is`, `make`,
    `use`, `when`, `start`, `bot`, `ocr`, `route`, `database`, `try`,
    `recover`, `retry`, `wait`, `accept`, `session`, `cookie`, etc. The
    literals `true`, `false`, and `null` are keywords too — don't shadow them.
    Contextual words (`status`, `query`, `send`, `broadcast`, `cache`) keep
    their ordinary meaning when followed by `becomes` or `(...)`.

11. **Strings use double quotes or backticks.** Double-quoted strings decode
    the usual escapes: `\n`, `\t`, `\\`, `\"`. Backticks support `${expr}`
    interpolation and multiline text, and an escaped backtick inside them
    stays literal instead of closing the string. Single quotes are not string
    delimiters in Plain source — except inside raw SQL blocks, where
    `'text literals'` are allowed and pass through verbatim.

12. **Reassignment uses `becomes`,** not `=`:

    ```plain
    remember score as 0
    score becomes score + 10
    ```

---

## 3. Core language crash course

### Variables & printing

```plain
remember name as "Ayokunle"
remember age as 16
age becomes 17

show "Hello"              // console.log("Hello")
show(name)                // identical output, call form also valid
show players[0]           // indexing works everywhere
show user.name            // dot access
```

### Arithmetic (v2.1.1)

```plain
remember price as 3 + 4 * 2          // 11 — * binds tighter than +
remember half as (price - 1) / 2     // parentheses group
remember odd as count % 2            // remainder
remember down as 0 - adjustment      // unary minus also works: -adjustment
```

### Conditions

| Plain | JavaScript |
|---|---|
| `is` | `===` |
| `is not` | `!==` |
| `is greater than` / `is above` | `>` |
| `is less than` / `is below` | `<` |
| `is at least` | `>=` |
| `is at most` | `<=` |
| `is empty` / `is not empty` | `.length === 0` / `.length > 0` |
| `contains "x"` (bare form also valid) | `.includes("x")` |
| `starts with "x"` | `.startsWith("x")` |
| `ends with "x"` | `.endsWith("x")` |

Combine any of these with `and`, `or`, `not` (rule 4 above). `between`
already implies `and`: `if age between 13 and 19`.

### Loops

```plain
for each player in players
    show player
done

// "for every item in basket" is an alias for "for each"

while lives is above 0
    show "playing"
done
```

There are no numeric range loops — build a list and loop over it, or count
with `while` and `x becomes x + 1`.
(`every 5 minutes … done` is scheduling, not a loop — see §11.)

### Functions

```plain
make add(a, b)
    give a + b
done

show add(2, 3)

make greet(name)
    show `Hi ${name}`
done

greet("Ada")
```

`give` returns a value; early `give` inside nested blocks is fine.

### Collections & objects

```plain
remember players as [
    "Haaland",
    "Foden",
    "Rodri"
]

players[1] becomes "Palmer"

remember user as { name: "Ayo", age: 17 }     // inline form uses ":"
show user.name
user.age becomes 18

// block form — keys use "is", closed by done
remember config as
    host is "localhost"
    port is 3000
done

// v1.1 expressions
remember who as first player from players      // players[0]
remember second as player two from players     // ordinal items
remember handle as name of user                // property chain
```

### String templates

```plain
remember email as `Dear ${customer},

Thank you for order #${orderId}.

Best regards`
```

`${expr}` passes straight through to JavaScript template literals.

---

## 4. Standard library (no import needed)

Text, numbers, time, system:

| Call | JavaScript |
|---|---|
| `length(x)` | `(x).length` |
| `uppercase(x)` / `lowercase(x)` | `.toUpperCase()` / `.toLowerCase()` |
| `trim(x)` | `.trim()` |
| `replace(s, from, to)` | `.replaceAll(from, to)` |
| `split(s, sep)` | `.split(sep)` |
| `join(list, sep)` | `.join(sep)` |
| `number(x)` / `text(x)` | `Number(x)` / `String(x)` |
| `floor(x)` / `ceiling(x)` / `round(x)` | `Math.floor` / `Math.ceil` / `Math.round` |
| `random()` | `Math.random()` |
| `readFile(path)` / `writeFile(path, c)` / `fileExists(p)` | sync `fs` calls |
| `appendFile(path, c)` | `fs.appendFileSync` |
| `copyFile(a, b)` / `moveFile(a, b)` / `deleteFile(p)` | sync `fs` calls |
| `makeFolder(p)` / `deleteFolder(p)` / `listFolder(p)` | sync `fs` calls |
| `readBytes(p)` / `writeBytes(p, data)` | Buffer read/write |
| `time()` / `date()` | `Date.now()` / ISO timestamp |
| `sleep(ms)` | blocking sleep |
| `uuid()` | crypto UUID |
| `env("KEY")` | `process.env["KEY"]` |
| `exit(code)` | `process.exit(code)` |
| `jsonEncode(x)` / `jsonDecode(s)` | `JSON.stringify` / `JSON.parse` |

Collections (all verified):

| Call | Result |
|---|---|
| `sort(x)` | sorted copy — unified ordering across mixed types |
| `reverse(x)` | reversed copy |
| `unique(x)` | de-duplicated copy |
| `sum(numbers)` | total |
| `smallest(x)` / `largest(x)` | min / max |
| `keys(obj)` / `values(obj)` | arrays of keys / values |
| `hasKey(obj, k)` | true/false |
| `merge(a, b)` | shallow merge, `b` wins |

---

## 5. Packages — `use`

Any npm package works. Aliases and version ranges are supported.

```plain
use express                    // const express = require('express')
use node-fetch                 // require('node-fetch')  — side effect only,
                               // because "-" isn't a valid JS identifier

use node-fetch as fetch        // const fetch = require('node-fetch')
use @scope/pkg as scoped       // scoped packages can be aliased too
use left-pad@^1.3.0            // version range flows through to installation
use dotenv@16 as env           // combine both
```

Rules:

- Known packages get canonical bindings you shouldn't fight:
  `express`, `fs`, `path`, `axios`, `chalk` bind their own names; `sqlite`
  binds as `Database` (better-sqlite3). Aliasing these is a friendly error.
- Version ranges install via npm; `require()` always uses the bare name.
- Missing packages are installed automatically by `plain run`, `plain build`,
  and `plain install` — including the packages behind v2.1/v2.1.1 features
  (`pg`, `better-sqlite3`, `sql.js`, `nodemailer`, `croner`, `ws`, `redis`,
  `multer`), which you never `use` yourself.
- Built-in Node modules (`fs`, `path`) are detected and never installed.

---

## 6. Web servers (Express)

Shorthand style:

```plain
web app

serve folder "public"

route "/"
    reply "Hello from Plain!"
done

route "/api/status"
    reply json
        status is "ok"
        version is "1.0"
    done
done

start 3000          // start env("PORT") also works
```

Classic style (same output):

```plain
use express

when someone visits "/"
    reply "hi"
done

listen on 3000
    show "Server running"
done
```

### Method routes, groups, request data (v2.1)

```plain
web app
allow cors                       // permissive CORS + OPTIONS preflight

group "/api"                     // composes prefixes; groups may nest

    route get "/users"           // get|post|put|patch|delete
        reply users
    done

    route post "/users"
        remember missing as validate(body of request, ["name", "email"])
        remember count as length(missing)
        if count is greater than 0
            status 400
            reply missing
        otherwise
            remember who as body of request.name
            reply "created"
        done
    done

    route get "/users/:id"
        remember id as param("id")            // req.params
        remember page as query("page")        // req.query
        remember token as header("x-token")   // req.headers
        if length(found) is greater than 0
            reply found[0]
        otherwise
            status 404
            reply "not found"
        done
    done

done

start env("PORT")
```

Sharp edges:

- A plain `route "/"` is GET — existing programs keep their meaning.
- `param(...)`, `query(...)`, `header(...)` are **compile errors outside a
  route**.
- `status <expr>` sets the response code, but `status becomes 404` is still a
  normal variable reassignment, and `status(x)` stays a function call.
- Route bodies are JSON-parsed automatically (`express.json()`).
- `validate(data, fields)` returns the list of missing field names.
- Reply objects/arrays become `res.json`; strings become `res.send`.
- Middleware statements (`allow cors`, `enable sessions`, `accept uploads`,
  `limit requests to`, `require api key from`) apply to the routes registered
  **after** them — put them before your routes.

---

## 7. Databases

### Portable engines (v2.1.1)

```plain
database "app.db"                    // probe native driver, fall back to WebAssembly
database "app.db" using "native"     // require better-sqlite3
database "app.db" using "wasm"       // require sql.js
database ":memory:"                  // in-memory, never persisted
```

- The default probes the native driver (`better-sqlite3`) by opening an
  in-memory database; if that fails, the program continues on the pure-
  JavaScript WebAssembly engine (`sql.js`). Same statements either way.
- The WebAssembly engine writes the whole database file after every mutating
  statement, so data survives restarts. In-memory databases never persist.
- An unknown driver string fails at compile time.
- PostgreSQL is separate: `postgres env("DATABASE_URL")` (below).

### SQLite

```plain
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)
done

insert
    INSERT INTO users (name, age) VALUES ('Ayo', 17)
done
```

Raw SQL goes verbatim into prepared statements. Files are created
automatically. Single quotes inside SQL blocks are fine (they are raw text,
not Plain strings).

### Parameters and captured results (v2.1)

Placeholders are written `{likeThis}` and bind to Plain variables of the same
name. Statements run immediately, in program order:

```plain
remember who as "ana"
insert
    INSERT INTO users (name, age) VALUES ({who}, 30)
done
// → info.changes === 1

remember minAge as 30
remember adults as query
    SELECT * FROM users WHERE age >= {minAge} ORDER BY name
done
for each row in adults
    show row.name
done
```

- `query` captures an **array of row objects**.
- `insert` / `update` / `delete` capture the run info (`changes`,
  `lastInsertRowid`).
- There is no "callable statement" form — define variables first, then use
  `{var}` in the block.

### Transactions (v2.1)

```plain
transaction
    insert
        INSERT INTO users (name) VALUES ('bo')
    done
    insert
        INSERT INTO users (name) VALUES ('cy')
    done
done
```

All enclosed writes commit together or roll back entirely — on both engines.

### PostgreSQL (v2.1)

```plain
postgres env("DATABASE_URL")

remember minAge as 21
remember rows as query
    SELECT * FROM people WHERE age > {minAge}
done
show length(rows)
```

Every later SQL statement compiles to awaited pool queries with `$n`
placeholders; `query` captures `.rows`. Transactions use `BEGIN`/`COMMIT`/
`ROLLBACK` on a dedicated client.

---

## 8. HTTP client (v2.1.1)

Requests are statements **and values**, built on global `fetch`
(Node.js 18+):

```plain
get "https://api.example.com/users"
post "https://api.example.com/users" with { name: "Ada", role: "admin" }
put url with payload
patch url with payload
delete "https://api.example.com/users/7"     // an HTTP request, not SQL
```

Optional clauses on any method — inline object or block form for headers:

```plain
remember r as post apiurl with payload headers { token: env("API_TOKEN") } timeout 5000

remember r as get "https://slow.api" headers
    accept is "application/json"
done timeout 10000
```

The response is a record:

| Field | Meaning |
|---|---|
| `ok of r` | `true` for 2xx status codes |
| `status of r` | HTTP status number |
| `headers of r` | response headers as a record |
| `data of r` | parsed JSON when the content type says `json`, otherwise the raw text |

```plain
remember r as get "https://api.example.com/users"
if ok of r is true
    show data of r
otherwise
    show status of r
done
```

Sharp edges:

- `get(...)`, `post(...)` **with parentheses are ordinary function calls** —
  the request form is the word followed directly by a URL value.
- Records and arrays sent with `with` are serialised as JSON; strings and
  buffers go verbatim.
- Default timeout is 30 seconds; timing out aborts the request and raises
  (catch it with `try`/`recover`).
- `get`/`post`/`put`/`patch`/`delete` requests are awaited automatically in
  assignments. To fire one as a statement or await a raw promise, use
  `wait for fetch(...)`.

---

## 9. Passwords, tokens, sessions, uploads, cookies (v2.1.1)

### Passwords and tokens

| Call | Behaviour |
|---|---|
| `hashPassword(pw)` | scrypt hash with a per-password salt |
| `checkPassword(pw, storedHash)` | constant-time verification, gives `true`/`false` |
| `createToken(payload, secret)` | HMAC-signed token, expires after 3600 s |
| `createToken(payload, secret, ttlSeconds)` | custom time-to-live |
| `readToken(token, secret)` | verified payload record, or `null` (tampered/expired) |

### Sessions

```plain
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
```

- The session rides an HMAC-signed cookie named `plain.sid`
  (`HttpOnly`, `SameSite=Lax`).
- `session of request` is the session record — assign fields onto it with
  `becomes`.
- Reading `session of request` outside a route, or without
  `enable sessions`, is a compile-time teaching error.
- The store lives in memory: restarting the process signs everyone out.

### File uploads

```plain
accept uploads limit "5 MB" allow ["image/png", "image/jpeg"] folder "uploads"
```

All clauses optional; the statement must appear **before** the routes it
protects. Inside routes:

| Call | Result |
|---|---|
| `upload("field")` | first file under the field, or `null` |
| `uploads("field")` | array of files under the field |

Each file is a record: `name` (original name), `type` (MIME), `size` (bytes),
`data` (buffer, memory storage), `path` (string, folder storage).

```plain
route post "/verify"
    remember file as upload("id")
    if file is null
        status 400
        reply "attach the id image"
    otherwise
        ocr path of file as scanned
        reply scanned
    done
done
```

A file over the limit is rejected with HTTP 413; a disallowed MIME type with
HTTP 415. With `folder`, files are written to disk (the folder is created).

### Cookies

All three are **route-only** — using them outside a route handler is a
compile-time teaching error.

```plain
route get "/theme"
    set cookie "theme" to "dark" expires in 7 days   // seconds|minutes|hours|days
    reply cookie("theme")
done

route get "/reset"
    clear cookie "theme"
    reply "cleared"
done
```

### Rate limiting, API keys, OAuth, 404s

```plain
limit requests to 100 per minute           // per-IP sliding window; unit:
                                           // second(s)|minute(s)|hour(s); over quota → 429

require api key from env("API_KEY")        // clients send header x-api-key;
                                           // wrong/missing key → 401; unset
                                           // configured key rejects everyone

google oauth
    id is env("GOOGLE_ID")
    secret is env("GOOGLE_SECRET")
    callback is "https://myapp.dev/auth/google/callback"
    landing is "/dashboard"
done                                       // registers /auth/google (redirect)
                                           // and the callback (signs the user
                                           // onto the session, then redirects)

when nothing matches                       // custom 404 — place AFTER your routes
    status 404
    reply json
        error is "No such road"
    done
done
```

---

## 10. Input, raw JS, and the escape hatch

`ask` reads a line from the terminal (async handled for you):

```plain
ask "What is your name?" as who
show `Hey ${who}`
```

JavaScript Gateway blocks remain the pressure valve for what Plain's surface
doesn't cover — method chains, `Math.*`, streams, `finally`. Since v2.1.1,
error handling (`try`/`recover`) and awaiting (`wait for`) are native, so you
should rarely need a block just for those:

```plain
// Named block: binds a value (always wrapped in async IIFE)
remember stats as javascript
    const res = await fetch("https://api.example.com")
    if (!res.ok) throw new Error("HTTP " + res.status)
    return await res.json()
done

show stats

// Statement-level block: emits the body verbatim
javascript
    console.error("something went wrong")
done
```

Inside a named block, plain JavaScript applies — including `try`, `catch`,
`finally`, all arithmetic operators, and `await`.

Prefer Plain statements when they exist: `try ... recover ... done` reads
better and formats itself.

---

## 11. Email, schedules, background jobs, WebSocket, cache (v2.1)

### Email (nodemailer under the hood)

```plain
mail transport
    host is "smtp.gmail.com"
    port is 587
    user is env("EMAIL_USER")        // becomes SMTP auth
    pass is env("EMAIL_PASS")
done

send mail
    from is "hello@plain.dev"
    to is "you@example.com"
    subject is "Hello from Plain"
    text is "Sent from a Plain program."
done
```

Send one transport per program, then send many mails. Sending without a
transport fails with a teaching error.

### Cron and intervals (croner)

```plain
every 5 minutes                    // seconds|minutes|hours|days, plural ok
    show "heartbeat"
done

schedule "0 2 * * *"               // any standard cron expression
    show "nightly cleanup"
done

run background resizeImage("photo.png")   // fire-and-forget; errors logged
```

Bodies run later in callbacks — they may contain `show`, database calls,
`send mail`, anything. Errors inside a scheduled body are logged, never crash
the process.

### WebSocket servers (ws)

```plain
websocket server on 8080
    when socket connects
        send socket "Welcome!"         // reply to this client
    done

    when socket sends message
        broadcast message              // `message` holds the payload text
        send socket "You said: " + message
    done

    when socket disconnects
    done
done
```

Handlers are optional; only those three exist. `broadcast <value>` reaches
every connected client. Objects are sent as JSON automatically.

### Cache (Redis)

```plain
cache env("REDIS_URL")             // or cache "redis://localhost:6379"

cacheSet("greeting", "hi", 60)     // third arg = TTL seconds (optional)
remember greeting as cacheGet("greeting")
cacheDelete("greeting")
```

All three accessors are async and fail with a teaching error if no `cache`
statement ran first.

---

## 12. Retries (v2.1.1)

Wrap flaky operations in `retry <n> times` — optionally with a delay between
attempts (default 1 second; `every 0 seconds` retries immediately). The body
runs until it succeeds or attempts run out; failures are logged with the last
error and the program continues:

```plain
retry 3 times every 5 seconds
    remember r as get "https://flaky.api/health"
    if ok of r is not true
        javascript
            throw new Error("health check failed")
        done
    done
done
```

---

## 13. Telegram bots

Zero dependencies — the generated runtime polls the Bot API with `fetch`.

```plain
bot env("BOT_TOKEN")             // or bot "123456:ABC..." literal;
                                 // TELEGRAM_BOT_TOKEN env works too

when someone sends "/start"
    reply "Hello from Plain!"
done

when someone sends "/menu"
    reply "Choose:" with buttons
        "About" -> "about", "Help" -> "help"
    done
done

when someone clicks "about"      // fired when the button is pressed
    reply "You clicked about!"
done

start telegram bot               // begins the polling loop
```

Notes: rendered inline buttons execute their Plain callbacks, and the token
given to `bot "…"` drives every API call.

---

## 14. WhatsApp bots

Full WhatsApp connectivity through Baileys — the package never appears in
your source and installs automatically.

```plain
whatsapp bot
    auth "session"                          // credential folder; created and
                                            // reused across restarts

    login qr                                // scan the printed QR code, or:
    // login pairing "2348012345678"        // type the printed XXXX-XXXX code
                                            // on the phone instead

    on message                              // every incoming text lands here
        log message                         // prints the normalized record

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

Sharp edges:

- One bot per program. Omit `auth` to use the default folder
  (`plain-whatsapp-auth`), omit `login` for QR linking. Pairing numbers are
  digits only after normalization (`+234 801-234-5678` works) and must be
  8–15 of them — anything else fails at compile time.
- Inside `on message`, `message` holds `{ text, chat, sender, name, id,
  time, isGroup }` (times in milliseconds). `reply "<value>"` answers the
  current chat; non-string values are sent as JSON.
- The bot never reacts to its own messages or to status broadcasts, and it
  keeps working in groups (the participant becomes the sender).
- Transient disconnects reconnect after 3 seconds; if the session is signed
  out from the phone, the runtime stops cleanly instead of looping.
- Link once per auth folder — sessions persist on disk.

---

## 15. OCR

Extract text from images with Tesseract.js — the package never appears in
your source; dependency detection installs it automatically.

```plain
ocr "scan.png" as text                       // English by default
show text

ocr "brief.png" as inhalt using "deu"        // Tesseract language pack
ocr shot as total using "deu+eng"            // image may be any expression
```

Async like `ask`: using it inside a function makes that function async
automatically.

---

## 16. Multi-file projects

```plain
// app.pln
import "./math.pln"
import "./utils.pln"

show add(3, 4)
```

- Paths are relative (`./`, `../`).
- Compilation is dependency-ordered; duplicate imports de-duplicate.
- Circular imports and missing files produce friendly errors.

---

## 17. CLI cheat sheet

| Command | What it does |
|---|---|
| `plain init` | Scaffold `plain.json` |
| `plain run app.pln` | Install missing deps → compile → execute |
| `plain build app.pln` | Compile to `app.js` |
| `plain check app.pln` | Syntax-check without compiling/running |
| `plain fmt app.pln` | Format in place |
| `plain install` | Install every detected dependency |
| `plain add <pkg>` / `plain remove <pkg>` | Manage `plain.json` deps |
| `plain doctor` | Environment + dependency health check |

---

## 18. Verification workflow (do this after generating code)

```bash
plain check app.pln     # fast syntax gate — run this before anything else
plain run app.pln       # full pipeline
```

If `check` reports `Line N, Column M: ...`, fix that exact spot. Errors
include suggestions ("Did you mean ...") — trust them.

---

## 19. Copy-paste prompt for your AI

> You are writing Plain (`.pln`) source that compiles with
> `@ayoxx/plain-code`. Follow these rules strictly:
>
> - Every block ends with `done`. No braces anywhere.
> - Variables: `remember x as V`, reassign `x becomes V`.
> - Print with `show X`.
> - Arithmetic: `+ - * / %` with standard precedence, parentheses and unary
>   minus allowed. No `**`.
> - Conditions MUST contain a comparison (`is`, `is not`, `is greater than`,
>   `is at least`, `contains`, `starts with`, `is empty`, ...). Combine with
>   `and` / `or` / `not`. No truthy checks; compare with `is true` /
>   `is false`. No `otherwise if` — nest `if` inside `otherwise` with its own
>   `done`.
> - No method calls on values (`list.push(1)` is invalid). Use builtins like
>   `length(x)`, user functions, or a JavaScript block. Record fields:
>   `data of response` or `response.data`.
> - Never write `await`. Use `wait for <expr>` to await, or statements that
>   await themselves (requests, `ask`, `ocr`, queries, mail).
> - Errors: `try ... recover as err ... done` (`recover` optional).
> - Retries: `retry 3 times every 5 seconds ... done`.
> - Packages: `use pkg`, `use pkg as alias`, `use pkg@^1.2.0`.
> - Web: `web app` + `route get|post|put|patch|delete "<path>" ... done` +
>   `group "/api"` + `param()/query()/header()` inside routes + `status 404` +
>   `allow cors` + `validate(body of request, ["f"])` + `when nothing matches
>   ... done` (place last).
> - HTTP client: `get "<url>"`, `post <url> with <body>`, optional
>   `headers {...}` and `timeout <ms>`; response record
>   `ok/status/headers/data` (read with `of`). `get(...)` with parens is a
>   normal function call, not a request.
> - Database: `database "app.db"` (auto native/wasm fallback; pin with
>   `using "native"` or `using "wasm"`) or `postgres env("URL")`. SQL
>   placeholders are `{varName}` bound to Plain variables;
>   `remember rows as query ... done` captures results;
>   `transaction ... done` wraps writes atomically.
> - Auth: `hashPassword(pw)`, `checkPassword(pw, hash)`,
>   `createToken(payload, secret)`, `readToken(token, secret)`.
> - Sessions: `enable sessions "<secret>"` before routes;
>   `session of request` / `destroy session` inside routes.
> - Uploads: `accept uploads limit "5 MB" allow [...] folder "..."` before
>   routes; `upload("field")` / `uploads("field")` inside routes.
> - Cookies: `set cookie "t" to "dark" expires in 7 days`, `cookie("t")`,
>   `clear cookie "t"` (route-only).
> - Middleware: `limit requests to 100 per minute`,
>   `require api key from env("API_KEY")`, `google oauth ... done` — register
>   before the routes they protect.
> - Email: `mail transport ... done` then `send mail ... done`.
> - Schedules: `every 5 minutes ... done`, `schedule "* * * * *" ... done`,
>   `run background someFn(args)`.
> - Realtime: `websocket server on 8080` with `when socket connects /
>   sends message / disconnects ... done`, `send socket x`, `broadcast x`.
> - Cache: `cache "redis://..."` then `cacheGet/cacheSet/cacheDelete`.
> - WhatsApp: `whatsapp bot ... done` with `auth "<folder>"`, `login qr` or
>   `login pairing "<digits>"` (8–15 digits), and `on message ... done`
>   handlers using `message.text`, `reply "..."`
>   (also `log message`). One bot per program.
> - Escape hatch: `remember result as javascript ... return value ... done`.
> - Never import or require express/pg/better-sqlite3/sql.js/nodemailer/
>   croner/ws/redis/multer/tesseract.js/@whiskeysockets/baileys/
>   qrcode-terminal — the compiler generates and installs them.
> - After writing code, run `plain check app.pln` and fix reported lines.
>
> Full reference follows in knowledge.md.

---

*Every claim in this file reflects the deterministic compiler as of v2.1.1.
When in doubt: `plain check` is ground truth.*
