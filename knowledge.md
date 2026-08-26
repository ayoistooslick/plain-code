# knowledge.md — Teach any AI to write PLINJS

> **Purpose:** PLINJS is a small language with sharp edges that trip up code
> generators (LLMs included). This file documents the language, the CLI, and
> the project model **exactly as implemented in the `plinjs` npm package
> v0.1.7**. Every example below was verified against the real compiler.
>
> **How to use:**
> 1. Paste this entire file into your AI chat before asking it to write PLINJS.
> 2. Or save it as `AGENTS.md` / `knowledge.md` in your project root so coding
>    agents pick it up automatically.
>
> Conventions: valid programs appear in ```plinjs fences. Invalid snippets that
> illustrate mistakes appear in ```text fences — never copy those.

---

## 1. What PLINJS is and how it installs

PLINJS is an Intent-Oriented Programming Language (IOPL). You describe **what**
you want; a fully deterministic compiler decides **how** to implement it in
JavaScript. There is no AI step, no rules engine, no hidden code generation:
the same source always produces the same JavaScript.

PLINJS is an npm package used **per project**, never globally:

```bash
npm install --save-dev plinjs
```

Everything runs through npm scripts or `npx`. A deployed application needs
only its generated `dist/` output and normal npm dependencies — the `plinjs`
compiler itself is a devDependency and does not ship to production.

```plinjs
// app.pln — a complete program
remember name as "World"
remember greeting as `Hello ${name}!`
show greeting
```

```bash
npx plinjs run app.pln     # installs missing deps, compiles, runs (from a scratch dir)
npx plinjs build app.pln   # writes dist/app.js — read it to see exactly what happens
```

---

## 2. Project structure and configuration

A PLINJS project is a plain npm package. Typical layout:

```
my-app/
├── package.json          # normal npm semantics; plinjs is a devDependency
├── src/                  # sources (.pln) — the default source root
└── dist/                 # generated JavaScript (never edited, safe to gitignore)
```

`plinjs build` follows a TypeScript-style model with zero configuration:

- `plinjs build` (no argument) discovers every `.pln` file under `src/` and
  compiles each to `dist/` preserving file names and folder structure.
- `plinjs build <file.pln>` compiles a single file into `dist/`.
- When no `src/` directory exists, the project root is scanned instead.

Source discovery skips `node_modules`, hidden directories, and the `dist/`
output directory.

### Optional `plinjs.config.json`

For projects that need custom output or source directories, add a
`plinjs.config.json` with a `compilerOptions` block:

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
| `rootDir`   | `"src"` if it exists, else `"."` | Root that `plinjs build` scans for sources   |
| `exclude`   | `["node_modules"]`               | Directories to skip during source discovery   |

---

## 3. The CLI

All commands also work through `npx` and npm scripts.

| Command                 | Behaviour                                                        |
|-------------------------|------------------------------------------------------------------|
| `plinjs new <name>`       | Scaffold a complete npm project (`src/app.pln`, Express starter)  |
| `plinjs build [file]`     | Compile `src/` to `dist/`; no argument builds all source files    |
| `plinjs run <file.pln>`   | Install missing deps → compile → execute from a scratch directory |
| `plinjs start [args...]`  | Build `src/app.pln` into `dist/`, then run that file              |
| `plinjs check <file.pln>` | Syntax/compile check only — no execution                          |
| `plinjs fmt <file.pln>`   | Rewrite the file in canonical style, in place                     |
| `plinjs install`          | Detect every dependency in source files and install what is missing|
| `plinjs add <pkg>`        | Install a package into the project                                |
| `plinjs remove <pkg>`     | Uninstall a package from the project                              |
| `plinjs update`           | `npm update` for all installed packages                           |
| `plinjs doctor`           | Environment + project health report                               |
| `plinjs version`          | Print `PLINJS v0.1.7`                                               |
| `plinjs help`             | Command reference                                                 |

### Build semantics (the important one)

- Output goes to `outDir` (default `dist/`) and **source names and folder
  structure are preserved relative to the source root**:
  - `messi.pln` (project root) → `dist/messi.js`
  - `src/index.pln` → `dist/index.js`
  - `src/helpers/math.pln` → `dist/helpers/math.js`
- Imports are bundled into each output: every file in `dist/` runs standalone
  under Node.
- Compilation is deterministic: identical sources produce byte-identical
  output, so builds can be diffed and cached.
- Running a program never writes into your project. There is no temp output
  file next to the source; `plinjs run` works from an external scratch
  directory while still resolving packages from your `node_modules`.

---

## 4. Hard rules — where AI-generated code usually breaks

1. **Every block ends with `done`.** No braces, no semicolons anywhere.
2. **Variables:** declare `remember x as V`; reassign `x becomes V`.
3. **Conditions MUST contain a comparison.** No truthy checks:

```text
if name                      // INVALID — truthy check
if finished is true          // correct
```

4. **No `otherwise if`.** Nest a second `if` inside the `otherwise` branch,

5. **Never write `await`.** Use `wait for <expr>` for raw promises, or
   statements that await themselves (`ask`, requests, `ocr`, queries, mail).
6. **No method calls on values.** `list.push(1)` is invalid — use builtins
   (`add(1 to list)`, `length(list)`), user functions, or a JavaScript block.
7. **Packages come from `use`, never `import`.** `import` is only for local
   `.pln` files.
8. **One WhatsApp bot per program.** `when nothing matches` goes last inside
   its `web app` block.
9. **Route-only helpers** (`param`, `query`, `header`, cookies, sessions,
   `upload`) work only inside routes; the compiler rejects them elsewhere
   with teaching errors.
10. SQL placeholders are `{likeThis}` and bind to PLINJS variables.

---

## 5. Language crash course

### Variables and printing

```plinjs
remember name as "Ayokunle"
remember age as 16
age becomes age + 1
show name
print(age)                  // same as show
```

### Arithmetic

`+ - * / %` with standard precedence, parentheses, unary minus. No `**`.

```plinjs
remember total as (3 + 4) * 2
remember rest as 10 % 3
show total + rest
```

### Strings and templates

Double quotes decode `\n`, `\t`, `\\`, `\"`. Backticks are multiline and
interpolate `${expression}` at runtime.

```plinjs
remember who as "World"
remember greeting as `Hello ${who}!
Second line, whitespace preserved.`
show greeting
```

### Comparisons

| PLINJS                           | JavaScript         |
|--------------------------------|--------------------|
| `is` / `is equal to`           | `===`              |
| `is not`                       | `!==`              |
| `is greater than` / `is above` | `>`                |
| `is less than` / `is below`    | `<`                |
| `is at least` / `is at most`   | `>=` / `<=`        |
| `is empty` / `is not empty`    | `.length === 0 / > 0` |
| `contains "x"`                 | `.includes("x")`   |
| `starts with "x"` / `ends with "x"` | `.startsWith / .endsWith` |
| `between A and B`              | `>= A && <= B`     |
| `is true` / `is false`         | `=== true/false`   |

Combine with `and`, `or`, `not`.

```plinjs
remember age as 21
if age is at least 18 and age is below 65
    show "working age"
otherwise
    show "not working age"
done

remember score as 95
if score between 90 and 100
    show "A grade"
done
```

### Loops

```plinjs
remember players as ["Haaland", "Foden", "Rodri"]
for each player in players
    show player
done

for every item in players        // "for every" is an alias
    show item
done

remember n as 3
while n is greater than 0
    n becomes n - 1
done
show n
```

### Functions

```plinjs
make add(a, b)
    give a + b
done

make greet(who)
    show `Hi ${who}`
done

show add(2, 3)
greet("Ada")
```

`give` returns a value; early `give` inside nested blocks is fine.
Top-level `make` functions are the module's public API: the compiler emits a
CommonJS `module.exports` for them, so built files work with `require()`.

### Collections and objects

```plinjs
remember players as ["Haaland", "Foden", "Rodri"]

show first player from players        // players[0]
show last player from players         // players[length - 1]
show player two from players          // players[1]
first player from players becomes "Palmer"

show players length                   // .length
add("Marmoush" to players)            // push
remove("Rodri" from players)          // remove by value
if players contains "Foden"
    show "found"
done

remember user as { name: "Ayo", age: 17 }
show name of user                     // property chains read right-to-left
user.age becomes 18

remember config as
    host is "localhost"
    port is 3000
done
show host of config
```

Number words `one`…`twenty` are one-based positions: `player one` is first.

### Files

```plinjs
remember data as read("users.txt")
write(data to "copy.txt")
if fileExists("users.txt") is true
    show "present"
done
```

Conditions need a comparison even for boolean calls — use `is true`.

### The JavaScript Gateway

Raw JS with full async support; the block becomes one awaited expression.

```plinjs
remember doubled as javascript
    const xs = [1, 2, 3].map(x => x * 2)
    return xs
done
show doubled

wait for fetch("https://example.com")     // await a raw promise
```

### Console input

```plinjs
ask "What is your name? " as name
show `Hello ${name}`
```

`ask` reads one line via readline; the async handling is automatic.

### Errors and retries

```plinjs
try
    remember n as jsonDecode("{ bad json")
recover as err
    show "failed: " + message of err
done

retry 3 times every 5 seconds
    wait for fetch("https://flaky.example")
done
```

---

## 6. Standard library (no import needed)

| Call                     | Meaning                              |
|--------------------------|--------------------------------------|
| `print(x)`               | Print a value                        |
| `read("p")` / `readFile("p")` | Read file as UTF-8 text         |
| `write(data, "p")` / `writeFile("p", data)` | Write text        |
| `fileExists("p")`        | Does the path exist                  |
| `sleep(ms)`              | Sleep synchronously                  |
| `time()` / `date()`      | Unix ms / ISO date string            |
| `jsonEncode(v)` / `jsonDecode(s)` | JSON stringify / parse      |
| `env("KEY")`             | Environment variable                 |
| `exit(code)`             | Exit the process                     |
| `uuid()`                 | UUID v4                              |
| `length(x)`              | Length of array/string               |
| `uppercase(x)` / `lowercase(x)` | Case conversion               |
| `random()` / `round(x)`  | 0–1 float / nearest integer          |

```plinjs
remember stamp as date()
remember id as uuid()
show stamp + " " + id
```

---

## 7. Packages

```plinjs
use axios
use node-fetch as fetcher
use left-pad@^1.3.0
use @scope/package-name
```

- Missing packages install automatically during `run`, `build`, and
  `install`.
- Version ranges install through npm; `require()` always uses the bare name.
- Known packages bind their canonical names (`sqlite` binds `Database`);
  aliasing those is a friendly compile-time error.
- Built-in Node modules (`fs`, `path`) are detected but never installed.
- Implementation packages behind language features (`express`, `pg`,
  `better-sqlite3`, `sql.js`, `nodemailer`, `croner`, `ws`, `redis`,
  `multer`, `tesseract.js`, `@whiskeysockets/baileys`, `qrcode-terminal`)
  are generated and installed by the compiler — never import them yourself.

---

## 8. Web servers

Method routes live inside a `web app` block; every block closes with `done`.

```plinjs
web app
allow cors

group "/api"

route get "/teams"
remember rows as query
select id, name from teams order by name
done
reply rows
done

route post "/players"
remember missing as validate(body of request, ["name", "email"])
if length(missing) is greater than 0
status 400
reply missing
otherwise
reply "created"
done
done

route get "/players/:id"
show param("id")
reply query("verbose")
done

done

when nothing matches
status 404
reply "no such road"
done

start 3000
```

- Request data: `param("id")`, `query("page")`, `header("x-token")`,
  `body of request`.
- `group "/api"` prefixes following route paths; `status <n>` sets the code;
  `reply json ... done` sends structured JSON.
- `when nothing matches` registers the 404 catch-all and must come last.
- `start <port>` accepts literals or expressions (`start env("PORT")`).

Classic Express style also exists:

```plinjs
use express

remember app as express()

serve folder "public"

when someone visits "/"
reply "Hello!"
done

listen on 3000
show "running"
done
```

### Sessions

In-memory store behind an HMAC-signed `HttpOnly` cookie (`plinjs.sid`);
restarting the server signs everyone out.

```plinjs
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

start 3000
```

### File uploads

```plinjs
web app
accept uploads limit "5 MB" allow ["image/png", "image/jpeg"] folder "uploads"

route post "/scan"
remember file as upload("doc")
reply `got ${name of file} (${size of file} bytes)`
done

start 3000
```

Files arrive as records: `name`, `type`, `size`, `data` (buffer), `path`
(string when `folder` is set). Oversized files get HTTP 413, wrong types
415. `uploads("docs")` returns every file under a field name.

### Cookies

```plinjs
web app

route get "/theme"
set cookie "theme" to "dark" expires in 7 days
show cookie("theme")
clear cookie "theme"
reply "ok"
done

start 3000
```

### Rate limiting and API keys

```plinjs
web app
limit requests to 100 per minute
require api key from env("API_KEY")

route get "/data"
reply "secure"
done

start 3000
```

Sliding window per client IP; exceeding it answers HTTP 429.

### Google OAuth

Registers `/auth/google` and `/auth/google/callback`; after login the session
holds the user and the browser lands on `landing`.

```plinjs
web app
google oauth
id is env("GOOGLE_ID")
secret is env("GOOGLE_SECRET")
callback is "https://myapp.dev/auth/google/callback"
landing is "/dashboard"
done

route get "/dashboard"
reply "private area"
done

start 3000
```

---

## 9. Databases

Portable SQLite: probes the native driver, falls back to pure-WebAssembly
(`sql.js`) transparently; both persist to disk.

```plinjs
database "app.db"

execute
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
done

insert
INSERT INTO users (name) VALUES ({who})
done

remember who as "Ada"
insert
INSERT INTO users (name) VALUES ({who})
done

remember rows as query
SELECT * FROM users
done
show rows length
```

- Pin an engine: `database "app.db" using "native"` or `using "wasm"`.
- PostgreSQL: `postgres env("DATABASE_URL")` — placeholders become `$n` and
  queries are awaited.
- `{placeholders}` bind to PLINJS variables in `execute`/`insert`/`query`.
- Wrap writes atomically:

```plinjs
database "app.db"

transaction
insert
INSERT INTO users (name) VALUES ('Grace')
done
done
```

### Auth helpers

```plinjs
remember hash as hashPassword("correct horse battery")
if checkPassword("correct horse battery", hash) is true
    remember token as createToken("user-1", env("TOKEN_SECRET"), 3600)
    show token
done
```

scrypt password hashing; HMAC-signed expiring tokens that fail closed.

---

## 10. HTTP client

```plinjs
remember r as get "https://api.example.com/users"
if ok of r is true
    show status of r
    show data of r
done

remember body as { name: "Ada" }
remember created as post "https://api.example.com/users" with body
    headers { accept: "application/json" }
    timeout 5000
show status of created

delete "https://api.example.com/users/9"
```

Methods: `get`, `post … with <body>`, `put`, `patch`, `delete "<url>"`.
Responses are records: `ok`, `status`, `headers`, `data` (JSON parsed
automatically). Default timeout 30 s. Note: `get(...)` with parentheses is a
normal function call, not a request.

---

## 11. Email, schedules, background jobs

```plinjs
mail transport
host is "smtp.gmail.com"
port is 587
user is env("EMAIL_USER")
pass is env("EMAIL_PASS")
done

send mail
from is "hello@example.dev"
to is "you@example.com"
subject is "Hello"
text is "Sent from PLINJS."
done
```

```plinjs
every 5 minutes
show "heartbeat"
done

schedule "0 2 * * *"
show "nightly cleanup"
done

make resize(name)
show `resizing ${name}`
done

run background resize("photo.png")
```

`every <n> <unit>` uses croner; `run background` is fire-and-forget.

---

## 12. Realtime and cache

```plinjs
websocket server on 8080
when socket connects
send socket "Welcome!"
done
when socket sends message
broadcast message
done
when socket disconnects
show "socket left"
done
done
```

```plinjs
cache env("REDIS_URL")
cacheSet("greeting", "hi", 60)
show cacheGet("greeting")
cacheDelete("greeting")
```

---

## 13. Telegram bots

The bot is created with a `bot <token-expr>` statement (bound for you — no
`remember`), handlers register by command or callback data, and
`start telegram bot` boots long polling.

```plinjs
bot env("BOT_TOKEN")

when someone sends "/start"
    reply "Welcome!" with buttons
        "Help" -> "help"
        "About" -> "about"
    done
done

when someone sends "/help"
    reply "Commands: /help /status"
done

when someone sends matching "^/echo .+"
    reply "matched pattern"
done

when someone clicks "Help"
    reply "Buttons demo"
done

start telegram bot
```

---

## 14. WhatsApp bots

Real WhatsApp connectivity (Baileys under the hood). Link once by QR scan or
pairing code; credentials persist in the auth folder.

```plinjs
whatsapp bot
auth "session"                       // credential folder, persists
login qr                             // or login pairing "2348012345678"

on message
log message                       // normalized message record

if message.text is "/start"
reply "Welcome!"
done

if message.text contains "help"
reply `Commands: /start /help`
done
done
done
```

- `login pairing "<number>"` takes 8–15 digits (validated at compile time).
- Pairing numbers may come from any value — typically typed at runtime:

```plinjs
ask "WhatsApp number: " as phone

whatsapp bot
auth "session"
login pairing phone

on message
if message.text is "/ping"
reply "pong"
done
done
done
```

- Inside `on message`, `message` holds `{ text, chat, sender, name, id,
  time, isGroup }`; `reply` answers the current chat; `log message` prints it.
- Own messages and status broadcasts are ignored; groups work; transient
  disconnects reconnect after 3 seconds.

---

## 15. OCR

```plinjs
ocr "scan.png" as text
show text

ocr "scan.png" as german using "deu"
```

Async handled automatically; top-level use wraps the whole program.

---

## 16. Multi-file projects

```plinjs
// index.pln
import "./math.pln"
import "./utils/plural.pln"

show double(21)
```

```plinjs
// math.pln
make double(n)
give n * 2
done
```

- Paths are relative (`./`, `../`); directories need a trailing file name.
- Compilation is dependency-ordered; duplicate imports de-duplicate;
  circular imports and missing files produce friendly errors.
- Each entry bundles its imports: `plinjs build` gives every source file its
  own standalone module under `dist/`.

---

## 17. Building and publishing an npm package written in PLINJS

PLINJS libraries ship like any Node package: you publish the generated
`dist/` output; consumers never see `.pln` files or the compiler. Every
top-level `make` function is exported automatically from the built file —
`require('./dist/index.js')` returns an object with those functions.

Complete walkthrough for a package called `greet-pkg`:

```bash
mkdir greet-pkg && cd greet-pkg
npm init -y
npm install --save-dev plinjs
```

`package.json` — note `main` points at the built output and `prepare` builds
before publishing:

```json
{
    "name": "greet-pkg",
    "version": "1.0.0",
    "main": "dist/index.js",
    "scripts": {
        "build": "plinjs build",
        "prepare": "plinjs build"
    },
    "devDependencies": {
        "plinjs": "^0.1.7"
    }
}
```

`src/index.pln`:

```plinjs
make greet(who)
give `Hello, ${who}!`
done

make farewell(who)
give `Goodbye, ${who}.`
done
```

Build and inspect:

```bash
npx plinjs build          # src/index.pln -> dist/index.js
node -e "console.log(require('./dist/index.js').greet('Ada'))"
```

Publish and consume anywhere:

```bash
npm publish             # prepare script runs the build first
```

```js
// consumer
const { greet } = require('greet-pkg');
console.log(greet('World'));
```

There is no PLINJS-specific registry or format — standard `package.json`
semantics (`main`, `exports`) apply, and any deployment target that runs
Node can use the result without knowing PLINJS was involved.

---

## 18. Verification workflow (do this after generating code)

```bash
npx plinjs check app.pln   # fast syntax gate — run this before anything else
npx plinjs run app.pln     # full pipeline
```

If `check` reports `Line N, Column M: ...`, fix that exact spot. Errors
include suggestions ("Did you mean ...") — trust them.

---

## 19. Copy-paste prompt for your AI

> You are writing PLINJS (`.pln`) source that compiles with the `plinjs`
> compiler v0.1.7. Follow these rules strictly:
>
> - Every block ends with `done`. No braces, no semicolons.
> - Variables: `remember x as V`, reassign `x becomes V`. Print with
>   `show X` or `print(X)`.
> - Conditions MUST contain a comparison; combine with `and/or/not`; use
>   `is true`/`is false`; no truthy checks; no `otherwise if` — nest.
> - Never write `await`: use `wait for <expr>` or self-awaiting statements.
> - No method calls on values: use `length(x)`, `add(v to list)`,
>   `remove(v from list)`, `x contains y`, `first x from xs`, `name of rec`.
> - Functions: `make f(a, b) ... done`, return with `give`, call `f(1, 2)`.
>   Top-level functions are auto-exported from built files (CommonJS).
> - Raw JS: `remember r as javascript ... return v ... done`; await with
>   `wait for`.
> - Input: `ask "prompt" as name`.
> - Errors: `try ... recover as err ... done`; retries: `retry 3 times
>   every 5 seconds ... done`.
> - Packages: `use pkg`, `use pkg as alias`, `use pkg@^1.2.0`; never import
>   implementation packages (express/pg/better-sqlite3/sql.js/nodemailer/
>   croner/ws/redis/multer/tesseract.js/baileys/qrcode-terminal).
> - Local modules: `import "./util.pln"` only.
> - Web: `web app ... done` containing `allow cors`, `enable sessions`,
>   `accept uploads ...`, `limit requests to N per minute`,
>   `require api key from env(...)`, `google oauth ... done`,
>   `group "/api"`, method `route get|post|put|patch|delete "/p" ... done`,
>   and `when nothing matches ... done` last. Read requests with
>   `param/query/header/body of request/session of request/upload("f")`;
>   answer with `reply`, `reply json ... done`, `status <n>`;
>   `start <port>` boots the server.
> - Databases: `database "f.db"` [`using "native"|"wasm"`] or
>   `postgres env("URL")`; `execute|insert|query ... done` blocks with
>   `{var}` placeholders; `transaction ... done` for atomic writes;
>   capture with `remember rows as query ... done`.
> - Auth helpers: `hashPassword(pw)`, `checkPassword(pw, hash)`,
>   `createToken(payload, secret, ttl)`, `readToken(token, secret)`.
> - Cookies inside routes: `set cookie "t" to "v" expires in 7 days`,
>   `cookie("t")`, `clear cookie "t"`.
> - Email: `mail transport ... done` then `send mail ... done` (fields via
>   `key is value`).
> - Schedules: `every 5 minutes ... done`, `schedule "* * * * *" ... done`,
>   `run background fn(args)`.
> - Realtime: `websocket server on PORT ... done` with `when socket
>   connects / sends message / disconnects ... done`, `send socket x`,
>   `broadcast x`.
> - Cache: `cache "redis://..."` then `cacheGet/cacheSet(k, v, ttl)/
>   cacheDelete(k)`.
> - Telegram: `bot <token-expr>` creates the polling bot, handlers
>   `when someone sends "..."` / `when someone sends matching "<regex>"` /
>   `when someone clicks "<data>"`, optional `reply "..." with buttons`
>   (rows of `"Label" -> "data"`), boot with `start telegram bot`.
> - WhatsApp: exactly one `whatsapp bot ... done` per program with
>   `auth "<folder>"`, `login qr` or `login pairing "<digits>"` (8–15) or
>   `login pairing <value>`, and `on message ... done` handlers using
>   `message.text` and `reply "..."`.
> - OCR: `ocr "img.png" as text` (optional `using "deu"`).
> - After writing code, run `npx plinjs check app.pln` and fix reported lines.

---

*Every claim in this file reflects the deterministic `plinjs` compiler v0.1.7.
When in doubt: `plinjs check` is ground truth.*
