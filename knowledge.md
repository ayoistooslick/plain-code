# knowledge.md — Teach any AI how to code in PlainScript

> **Purpose:** This file is a coding guide. If you are an AI (or a human) asked
> to write PlainScript source, read this file — it teaches you **how to code in
> PlainScript**. It documents the language, the CLI, and the project model
> **exactly as implemented in the `plainscript-lang` npm package v1.0.2**. Every
> example below was verified against the real compiler.
>
> **Resources:**
> - Repository: https://github.com/ayoistooslick/plainscript
> - Documentation site: https://ayoistooslick.github.io/plainscript
>
> **How to use:**
> 1. Paste this entire file into your AI chat before asking it to write PlainScript.
> 2. Or save it as `AGENTS.md` / `knowledge.md` in your project root so coding
>    agents pick it up automatically.
>
> Conventions: valid programs appear in ```plainscript fences. Invalid snippets that
> illustrate mistakes appear in ```text fences — never copy those.

---

## 1. Reading PlainScript source (the mental model)

Every PlainScript program is a sequence of English-like **statements**. You read
a line, it does what it says; blocks open on a phrase and end with `end`.
Variables and functions are declared in plain words, and the compiler turns the
whole file into deterministic JavaScript.

The most important thing to absorb before writing code:

- **`let x is V`** declares a variable; **`x is now V`** reassigns it.
- **`print X`** (or **`print(X)`**) prints a value to the console.
- **`define name(args)` ... `end`** declares a function; **`give back V`** returns a value.
- Every block — `if`, `for`, `define`, `web app`, `try`, `database`, ... — closes
  with **`end`**. No braces, no semicolons.

Install PlainScript **per project** as a devDependency (never globally), and
drive it with npm scripts or `npx`:

```bash
npm install --save-dev plainscript-lang
```

```plainscript
// app.pln — a complete program
let name is "World"
let greeting is `Hello ${name}!`
print greeting
```

```bash
npx plainscript run app.pln     # installs missing deps, compiles, runs (from a scratch dir)
npx plainscript build app.pln   # writes dist/app.js — read it to see exactly what happens
```

---

## 2. Project structure and configuration

A PlainScript project is a plain npm package. Typical layout:

```
my-app/
├── package.json          # normal npm semantics; plainscript-lang is a devDependency
├── src/                  # sources (.pln) — the default source root
└── dist/                 # generated JavaScript (never edited, safe to gitignore)
```

`plainscript build` follows a TypeScript-style model with zero configuration:

- `plainscript build` (no argument) discovers every `.pln` file under `src/` and
  compiles each to `dist/` preserving file names and folder structure.
- `plainscript build <file.pln>` compiles a single file into `dist/`.
- When no `src/` directory exists, the project root is scanned instead.

Source discovery skips `node_modules`, hidden directories, and the `dist/`
output directory.

### Optional `plainscript.config.json`

For projects that need custom output or source directories, add a
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

| Key         | Default                          | Meaning                                      |
|-------------|----------------------------------|----------------------------------------------|
| `outDir`    | `"dist"`                         | Build output directory                       |
| `rootDir`   | `"src"` if it exists, else `"."` | Root that `plainscript build` scans for sources   |
| `exclude`   | `["node_modules"]`               | Directories to skip during source discovery   |

---

## 3. The CLI

All commands also work through `npx` and npm scripts.

| Command                 | Behaviour                                                        |
|-------------------------|------------------------------------------------------------------|
| `plainscript new <name>`       | Scaffold a complete npm project (`src/app.pln`, Express starter)  |
| `plainscript build [file]`     | Compile `src/` to `dist/`; no argument builds all source files    |
| `plainscript run <file.pln>`   | Install missing deps → compile → execute from a scratch directory |
| `plainscript start [args...]`  | Build `src/app.pln` into `dist/`, then run that file              |
| `plainscript check <file.pln>` | Syntax/compile check only — no execution                          |
| `plainscript fmt <file.pln>`   | Rewrite the file in canonical style, in place                     |
| `plainscript install`          | Detect every dependency in source files and install what is missing|
| `plainscript add <pkg>`        | Install a package into the project                                |
| `plainscript remove <pkg>`     | Uninstall a package from the project                              |
| `plainscript update`           | `npm update` for all installed packages                           |
| `plainscript doctor`           | Environment + project health report                               |
| `plainscript version`          | Print `PlainScript v1.0.2`                                               |
| `plainscript help`             | Command reference                                                 |

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
  file next to the source; `plainscript run` works from an external scratch
  directory while still resolving packages from your `node_modules`.

---

## 4. Hard rules — where AI-generated code usually breaks

1. **Every block ends with `end`.** No braces, no semicolons anywhere.
2. **Variables:** declare `let x is V`; reassign `x is now V`.
3. **Conditions MUST contain a comparison.** No truthy checks. Use `same as`, `different from`, `more than`, `fewer than`, `is at least`, `is at most`, `made of`, `starts as`, `ends as`, or `between A and B`:

```text
if name                      // INVALID — truthy check
if finished same as true     // correct (English syntax)
if finished is true          // correct
```

4. **No `otherwise if`.** Nest a second `if` inside the `otherwise` branch,
5. **Never write `await`.** Use `wait for <expr>` for raw promises, or
   statements that await themselves (`ask`, requests, `ocr`, queries, mail).
6. **No method calls on values.** `list.push(1)` is invalid — use builtins
   (`add(1 to list)`, `length(list)`), user functions, or inline JS.
7. **Packages come from `use`, never `import`.** `import` is only for local
   `.pln` files.
8. **One WhatsApp bot per program.** `when nothing matches` goes last inside
   its `web app` block.
9. **Route-only helpers** (`param`, `query`, `header`, cookies, sessions,
   `upload`) work only inside routes; the compiler rejects them elsewhere
   with teaching errors.
10. SQL placeholders are `{likeThis}` and bind to PlainScript variables.

---

## 5. Language crash course

### Variables and printing

```plainscript
let name is "Ayokunle"
let age is 16
age is now 17
print name
print(age)                  // same as print
```

### Arithmetic

`+ - * / % **` with standard precedence, parentheses, unary minus.

```plainscript
let sum is (3 + 4) * 2
let rest is 10 % 3
print sum + rest
```

### Strings and templates

Double quotes decode `\n`, `\t`, `\\`, `\"`. Backticks are multiline and
interpolate `${expression}` at runtime.

```plainscript
let who is "World"
let greeting is `Hello ${who}!
Second line, whitespace preserved.`
print greeting
```

### Comparisons

| PlainScript                           | English syntax              | JavaScript         |
|--------------------------------|-----------------------------|--------------------|
| `is` / `is equal to`           | `same as`                   | `===`              |
| `is not`                       | `different from`            | `!==`              |
| `is greater than` / `is above` | `more than`                 | `>`                |
| `is less than` / `is below`    | `fewer than`                | `<`                |
| `is at least` / `is at most`   |                             | `>=` / `<=`        |
| `is empty` / `is not empty`    |                             | `.length === 0 / > 0` |
| `contains "x"`                 | `made of "x"`               | `.includes("x")`   |
| `starts with "x"` / `ends with "x"` | `starts as "x"` / `ends as "x"` | `.startsWith / .endsWith` |
| `between A and B`              |                             | `>= A && <= B`     |
| `is true` / `is false`         |                             | `=== true/false`   |

Combine with `and`, `or`, `not`. The English syntax forms (`same as`, `different from`, `more than`, `fewer than`, `made of`, `starts as`, `ends as`) are all valid alternatives.

```plainscript
let age is 21
if age is at least 18 and age fewer than 65
    print "working age"
otherwise
    print "not working age"
end

let score is 95
if score between 90 and 100
    print "A grade"
end
```

### Loops

```plainscript
let players is list with "Haaland", "Foden", "Rodri"
for each player in players
    print player
end

for every item in players        // "for every" is an alias
    print item
end

let n is 3
while n is greater than 0
    n is now n - 1
end
print n
```

### Functions

```plainscript
define add(a, b)
    give back a + b
end

define greet(who)
    print `Hi ${who}`
end

function multiply(x, y)
    return x * y
end

print add(2, 3)
greet("Ada")
```

`give back` returns a value; early `give back` inside nested blocks is fine.
Top-level `define`/`function` are the module's public API: the compiler emits a
CommonJS `module.exports` for them, so built files work with `require()`.

### Collections and objects

```plainscript
let players is list with "Haaland", "Foden", "Rodri"

print first player from players        // players[0]
print last player from players         // players[length - 1]
print player two from players          // players[1]
first player from players is now "Palmer"

print players length                   // .length
add("Marmoush" to players)            // push
remove("Rodri" from players)          // remove by value
if players made of "Foden"
    print "found"
end

let user is record with name "Ayo", age 17 done
print name of user                     // property chains read right-to-left
user.age is now 18

let config is record with
    host "localhost"
    port 3000
done
print host of config
```

Destructuring:

```plainscript
let nums is list with 1, 2, 3
let [a, b, c] is nums
let obj is record with x 10, y 20 done
let {x, y} is obj
```

Number words `one`…`twenty` are one-based positions: `player one` is first.

### Files

```plainscript
let data is read("users.txt")
write(data to "copy.txt")
if fileExists("users.txt") is true
    print "present"
end
```

Conditions need a comparison even for boolean calls — use `is true`.

### Console input

```plainscript
ask "What is your name? " as name
print `Hello ${name}`
```

`ask` reads one line via readline; the async handling is automatic.

### Errors and retries

```plainscript
try
    let n is jsonDecode("{ bad json")
recover as err
    print "failed: " + message of err
end

retry 3 times every 5 seconds
    wait for fetch("https://flaky.example")
end
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

```plainscript
let stamp is date()
let id is uuid()
print stamp + " " + id
```

---

## 7. Packages

```plainscript
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

Method routes live inside a `web app` block; every block closes with `end`.

```plainscript
web app
allow cors

group "/api"

route get "/teams"
    let rows is query
        select id, name from teams order by name
    end
    print rows
end

route post "/players"
    let missing is validate(body of request, list with "name", "email")
    if length of missing more than 0
        status 400
        print missing
    otherwise
        print "created"
    end
end

when nothing matches
    status 404
    print "no such road"
end

start 3000
```

- Request data: `param("id")`, `query("page")`, `header("x-token")`,
  `body of request`.
- `group "/api"` prefixes following route paths; `status <n>` sets the code;
  `reply json ... end` sends structured JSON.
- `when nothing matches` registers the 404 catch-all and must come last.
- `start <port>` accepts literals or expressions (`start env("PORT")`).

Classic Express style also exists:

```plainscript
use express

let app is express()

serve folder "public"

when someone visits "/"
    print "Hello!"
end

listen on 3000
    print "running"
end
```

### Sessions

In-memory store behind an HMAC-signed `HttpOnly` cookie (`plainscript.sid`);
restarting the server signs everyone out.

```plainscript
web app
enable sessions "a-long-random-secret"

route post "/login"
    user of session of request is username of body of request
    print "welcome"
end

route post "/logout"
    destroy session
    print "bye"
end

start 3000
```

### File uploads

```plainscript
web app
accept uploads limit "5 MB" allow list with "image/png", "image/jpeg" folder "uploads"

route post "/scan"
    let file is upload("doc")
    print `got ${file.name} (${file.size} bytes)`
end

start 3000
```

Files arrive as records: `name`, `type`, `size`, `data` (buffer), `path`
(string when `folder` is set). Oversized files get HTTP 413, wrong types
415. `uploads("docs")` returns every file under a field name.

### Cookies

```plainscript
web app

route get "/theme"
    set cookie "theme" to "dark" expires in 7 days
    print cookie("theme")
    clear cookie "theme"
    print "ok"
end

start 3000
```

### Rate limiting and API keys

```plainscript
web app
limit requests to 100 per minute
require api key from env("API_KEY")

route get "/data"
    print "secure"
end

start 3000
```

Sliding window per client IP; exceeding it answers HTTP 429.

### Google OAuth

Registers `/auth/google` and `/auth/google/callback`; after login the session
holds the user and the browser lands on `landing`.

```plainscript
web app
google oauth
    id is env("GOOGLE_ID")
    secret is env("GOOGLE_SECRET")
    callback is "https://myapp.dev/auth/google/callback"
    landing is "/dashboard"
end

route get "/dashboard"
    print "private area"
end

start 3000
```

---

## 9. Databases

Portable SQLite: probes the native driver, falls back to pure-WebAssembly
(`sql.js`) transparently; both persist to disk.

```plainscript
database "app.db"

execute
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
end

insert
    INSERT INTO users (name) VALUES ({who})
end

let who is "Ada"
insert
    INSERT INTO users (name) VALUES ({who})
end

let rows is query
    SELECT * FROM users
end
print rows length
```

- Pin an engine: `database "app.db" using "native"` or `using "wasm"`.
- PostgreSQL: `postgres env("DATABASE_URL")` — placeholders become `$n` and
  queries are awaited.
- `{placeholders}` bind to PlainScript variables in `execute`/`insert`/`query`.
- Wrap writes atomically:

```plainscript
database "app.db"

transaction
    insert
        INSERT INTO users (name) VALUES ('Grace')
    end
end
```

### Auth helpers

```plainscript
let hash is hashPassword("correct horse battery")
if checkPassword("correct horse battery", hash) is true
    let token is createToken("user-1", env("TOKEN_SECRET"), 3600)
    print token
end
```

scrypt password hashing; HMAC-signed expiring tokens that fail closed.

---

## 10. HTTP client

```plainscript
let r is get "https://api.example.com/users"
if ok of r is true
    print status of r
    print data of r
end

let body is record with name "Ada" done
let created is post "https://api.example.com/users" with body
    headers record with accept "application/json" done
    timeout 5000
end

delete "https://api.example.com/users/9"
```

Methods: `get`, `post … with <body>`, `put`, `patch`, `delete "<url>"`.
Responses are records: `ok`, `status`, `headers`, `data` (JSON parsed
automatically). Default timeout 30 s. Note: `get(...)` with parentheses is a
normal function call, not a request.

---

## 11. Email, schedules, background jobs

```plainscript
mail transport
    host is "smtp.gmail.com"
    port is 587
    user is env("EMAIL_USER")
    pass is env("EMAIL_PASS")
end

send mail
    from is "hello@example.dev"
    to is "you@example.com"
    subject is "Hello"
    text is "Sent from PlainScript."
end
```

```plainscript
every 5 minutes
    print "heartbeat"
end

schedule "0 2 * * *"
    print "nightly cleanup"
end

define resize(name)
    print `resizing ${name}`
end

run background resize("photo.png")
```

`every <n> <unit>` uses croner; `run background` is fire-and-forget.

---

## 12. Realtime and cache

```plainscript
websocket server on 8080
    when socket connects
        send socket "Welcome!"
    end
    when socket sends message
        broadcast message
    end
    when socket disconnects
        print "socket left"
    end
end

cache env("REDIS_URL")
cacheSet("greeting", "hi", 60)
print cacheGet("greeting")
cacheDelete("greeting")
```

---

## 13. Telegram bots

The bot is created with a `bot <token-expr>` statement (bound for you — no
`let`), handlers register by command or callback data, and
`start telegram bot` boots long polling.

```plainscript
bot env("BOT_TOKEN")

when someone sends "/start"
    print "Welcome!" with buttons
        "Help" -> "help"
        "About" -> "about"
    end
end

when someone sends "/help"
    print "Commands: /help /status"
end

when someone sends matching "^/echo .+"
    print "matched pattern"
end

when someone clicks "Help"
    print "Buttons demo"
end

start telegram bot
```

---

## 14. WhatsApp bots

Real WhatsApp connectivity (Baileys under the hood). Link once by QR scan or
pairing code; credentials persist in the auth folder.

```plainscript
whatsapp bot
    auth "session"                       // credential folder, persists
    login qr                             // or login pairing "2348012345678"

    on message
        log message                       // normalized message record

        if message.text is "/start"
            print "Welcome!"
        end

        if message.text made of "help"
            print `Commands: /start /help`
        end
    end
end
```

- `login pairing "<number>"` takes 8–15 digits (validated at compile time).
- Pairing numbers may come from any value — typically typed at runtime:

```plainscript
ask "WhatsApp number: " as phone

whatsapp bot
    auth "session"
    login pairing phone

    on message
        if message.text is "/ping"
            print "pong"
        end
    end
end
```

- Inside `on message`, `message` holds `record with text, chat, sender, name, id,
  time, isGroup done`; `print` answers the current chat; `log message` prints it.
- Own messages and status broadcasts are ignored; groups work; transient
  disconnects reconnect after 3 seconds.

---

## 15. OCR

```plainscript
ocr "scan.png" as text
print text

ocr "scan.png" as german using "deu"
```

Async handled automatically — inside a route, listener, or function the
enclosing handler is made `async`, and at the very top of a program the whole
program is wrapped (nested awaits never wrap the program). This is not
OCR-specific: every keyword that compiles to an `await` (`ask`, `send mail`,
`database`/`postgres`, `transaction`, `stream`, `cache`, `get`/`post`,
`wait for`, `retry`, `run in parallel`, …) is derived from actual generation
output, so it works anywhere a statement is allowed — at any nesting level.

---

## 16. Multi-file projects

```plainscript
// index.pln
import "./math.pln"
import "./utils/plural.pln"

print double(21)
```

```plainscript
// math.pln
define double(n)
    give back n * 2
end
```

- Paths are relative (`./`, `../`); directories need a trailing file name.
- Compilation is dependency-ordered; duplicate imports de-duplicate;
  circular imports and missing files produce friendly errors.
- Each entry bundles its imports: `plainscript build` gives every source file its
  own standalone module under `dist/`.

---

## 17. Building and publishing an npm package written in PlainScript

PlainScript libraries ship like any Node package: you publish the generated
`dist/` output; consumers never see `.pln` files or the compiler. Every
top-level `define`/`function` function is exported automatically from the built file —
`require('./dist/index.js')` returns an object with those functions.

Complete walkthrough for a package called `greet-pkg`:

```bash
mkdir greet-pkg && cd greet-pkg
npm init -y
npm install --save-dev plainscript-lang
```

`package.json` — note `main` points at the built output and `prepare` builds
before publishing:

```json
{
    "name": "greet-pkg",
    "version": "1.0.2",
    "main": "dist/index.js",
    "scripts": {
        "build": "plainscript build",
        "prepare": "plainscript build"
    },
    "devDependencies": {
        "plainscript-lang": "^1.0.2"
    }
}
```

`src/index.pln`:

```plainscript
define greet(who)
    give back `Hello, ${who}!`
end

define farewell(who)
    give back `Goodbye, ${who}.`
end
```

Build and inspect:

```bash
npx plainscript build          # src/index.pln -> dist/index.js
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

There is no PlainScript-specific registry or format — standard `package.json`
semantics (`main`, `exports`) apply, and any deployment target that runs
Node can use the result without knowing PlainScript was involved.

---

## 18. Verification workflow (do this after generating code)

```bash
npx plainscript check app.pln   # fast syntax gate — run this before anything else
npx plainscript run app.pln     # full pipeline
```

If `check` reports `Line N, Column M: ...`, fix that exact spot. Errors
include suggestions ("Did you mean ...") — trust them.

---

## 19. 1.0.2: TypeScript-parity capabilities

These complete the capability-gap audit (`docs/CAPABILITY_GAP_AUDIT.md`). They are
IOPL-native — PlainScript grammar, not TypeScript syntax.

- **Record kinds (classes):** declare a schema, then build instances.
  ```plainscript
  define a kind called "Person" with
      name is ""
      age is 0
  end
  let ada is create a Person with name "Ada" and age 17
  print name of ada          // "Ada"
  ```
  `create` passes any value; unknown fields throw at runtime. Kinds are plain
  objects — `jsonEncode`, `send mail`, DB rows all work unchanged. For different
  shapes, compose with `merge(a, b)` instead of `extends`.

- **Concurrency:** `all of list with e1, e2 done`, `any of list with e1, e2 done`, `settled of list with e1, e2 done`
  (returns `record with status, value | reason done` records), and `withTimeout(promise, ms)`.
  Example: `let both is all of list with fetchPage(), fetchApi() done`.

- **Generators:** use `yield` inside `define ... end`; the function becomes a
  generator. Consume with `for each` or `spread of`.
  ```plainscript
  define countUp(n)
      let i is 0
      while i fewer than n
        i is now i + 1
        yield i
      end
  end
  print spread of countUp(3)   // [ 1, 2, 3 ]
  ```

- **Reflection:** `typeOf(x)` → `text|number|boolean|array|record|null|function|undefined`;
  `fieldsOf(x)`, `valueOf(x, key, fallback)`, `hasField(x, key)`, `sizeOf(x)`.

- **Binary:** `base64Encode(s)`, `base64Decode(s)`, `textToBytes(s)`,
  `bytesToText(b)`, `sha256(s)`, `sha1(s)`, `md5(s)`.

- **Serialization / config:**
  ```plainscript
  let cfg is yamlDecode("name: Ada\nport: 3000\n")
  print cfg.name                       // "Ada"
  load env file ".env"                // applies KEY=value to process.env
  print env("PORT")
  ```

- **CLI & processes:** `args()` returns `process.argv.slice(2)`;
  `let r is runCommand("node", list with "-v" done)` → `r.ok`, `r.code`, `r.stdout`, `r.stderr`.

- **Filesystem & paths:** `fileSize(p)`, `fileType(p)` (`file`/`directory`),
  `lastModified(p)`, `walkFolder(dir)` (recursive file list); `joinPath(a, b)`,
  `baseName(p)`, `folderOf(p)`, `extensionOf(p)`.

- **Streams:** `writeLine(file, text)` / `appendLine(file, text)` (newline-appended).

- **Collections:** `keyMap()` + `mapSet(m,k,v)`/`mapGet`/`mapHas`/`mapDelete`;
  `newSet()` + `addToSet`/`removeFromSet`/`setHas`, or `unique(list)`.
  `spread of x` makes a fresh array from any iterable.

- **Dynamic modules:** `loadModule("./util")` requires a module at runtime.

- **Native tests** (run the whole file — a built-in runner prints results):
  ```plainscript
  test "addition"
      check add(2, 3) equals 5
      check "hello" made of "ell"
      check jsonDecode("nope") raises "JSON"
  end
  ```
  A failing `check` prints `FAIL`, shows the line, and exits `1`.

- **Exports:** `export <name>` marks a top-level symbol for `module.exports`
  (use when you control the module surface; overrides auto-export of functions).

---

## 20. Copy-paste prompt for your AI

> You are writing PlainScript (`.pln`) source that compiles with the `plainscript`
> compiler v1.0.2. Follow these rules strictly:
>
> - Every block ends with `end`. No braces, no semicolons.
> - Variables: `let x is V`, reassign `x is now V`. Print with
>   `print X` or `print(X)`.
> - Conditions MUST contain a comparison; combine with `and/or/not`; use
>   `is true`/`is false` or English forms `same as`, `different from`,
>   `more than`, `fewer than`; no truthy checks; no `otherwise if` — nest.
> - Never write `await`: use `wait for <expr>` or self-awaiting statements.
> - No method calls on values: use `length(x)`, `add(v to list)`,
>   `remove(v from list)`, `x made of y`, `first x from xs`, `name of rec`.
> - Collections: use `list with a, b, c` for arrays and `record with key val done` for objects. Access array elements with `x at position i` or `item i from xs`.
> - String checks: use `x starts as "prefix"` and `x ends as "suffix"`.
> - Functions: `define f(a, b) ... end`, return with `give back`, call `f(1, 2)`.
>   Top-level functions are auto-exported from built files (CommonJS).
> - Raw JS: not needed anymore — everything is natively supported.
> - Input: `ask "prompt" as name`.
> - Errors: `try ... recover as err ... end`; retries: `retry 3 times
>   every 5 seconds ... end`.
> - Packages: `use pkg`, `use pkg as alias`, `use pkg@^1.2.0`; never import
>   implementation packages (express/pg/better-sqlite3/sql.js/nodemailer/
>   croner/ws/redis/multer/tesseract.js/baileys/qrcode-terminal).
> - Local modules: `import "./util.pln"` only.
> - Web: `web app ... end` containing `allow cors`, `enable sessions`,
>   `accept uploads ...`, `limit requests to N per minute`,
>   `require api key from env(...)`, `google oauth ... end`,
>   `group "/api"`, method `route get|post|put|patch|delete "/p" ... end`,
>   and `when nothing matches ... end` last. Read requests with
>   `param/query/header/body of request/session of request/upload("f")`;
>   answer with `reply`, `reply json ... end`, `status <n>`;
>   `start <port>` boots the server.
> - Databases: `database "f.db"` [`using "native"|"wasm"`] or
>   `postgres env("URL")`; `execute|insert|query ... end` blocks with
>   `{var}` placeholders; `transaction ... end` for atomic writes;
>   capture with `let rows is query ... end`.
> - Auth helpers: `hashPassword(pw)`, `checkPassword(pw, hash)`,
>   `createToken(payload, secret, ttl)`, `readToken(token, secret)`.
> - Cookies inside routes: `set cookie "t" to "v" expires in 7 days`,
>   `cookie("t")`, `clear cookie "t"`.
> - Email: `mail transport ... end` then `send mail ... end` (fields via
>   `key is value`).
> - Schedules: `every 5 minutes ... end`, `schedule "* * * * *" ... end`,
>   `run background fn(args)`.
> - Realtime: `websocket server on PORT ... end` with `when socket
>   connects / sends message / disconnects ... end`, `send socket x`,
>   `broadcast x`.
> - Cache: `cache "redis://..."` then `cacheGet/cacheSet(k, v, ttl)/
>   cacheDelete(k)`.
> - Telegram: `bot <token-expr>` creates the polling bot, handlers
>   `when someone sends "..."` / `when someone sends matching "<regex>"` /
>   `when someone clicks "<data>"`, optional `print "..." with buttons`
>   (rows of `"Label" -> "data"`), boot with `start telegram bot`.
> - WhatsApp: exactly one `whatsapp bot ... end` per program with
>   `auth "<folder>"`, `login qr` or `login pairing "<digits>"` (8–15) or
>   `login pairing <value>`, and `on message ... end` handlers using
>   `message.text` and `print "..."`.
> - OCR: `ocr "img.png" as text` (optional `using "deu"`).
> - After writing code, run `npx plainscript check app.pln` and fix reported lines.

---

*Every claim in this file reflects the deterministic `plainscript` compiler v1.0.2.
When in doubt: `plainscript check` is ground truth.*