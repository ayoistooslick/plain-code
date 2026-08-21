# knowledge.md — Teach any AI to write Plain in one file

> **Purpose:** Plain is a small language, but it has sharp edges that trip up
> code generators (LLMs included). This file is the fastest way to teach an AI
> — ChatGPT, Claude, Cursor, Copilot — to write Plain code that actually
> compiles with `@ayoxx/plain-code` v2.0.1.
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

1. **Blocks close with `done`.** `if`, `for`, `while`, `make`, route and
   handler bodies, object literals, SQL blocks, JavaScript blocks — all end
   with `done`.

2. **Only `+` exists as an arithmetic operator.** `*`, `/`, `-`, parentheses
   grouping are lexer errors. There are no negative number literals.
   Need more math? Use a JavaScript block:

   ```plain
   remember total as javascript
       return price * quantity - discount
   done
   ```

3. **Conditions must use a comparison operator.** `if x is 1` works;
   `if running()` does not compile. There is no truthy check.

4. **No `and` / `or` in conditions.** One comparison per condition. Nest `if`s
   to combine:

   ```plain
   if age is at least 13
       if age is at most 19
           show "teenager"
       done
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
   builtins (`length(x)`), user functions (`add(1, 2)`), and known packages
   (`sqlite("app.db")`). Anything else → JavaScript block.

7. **No `await` prefix in expressions.** `remember r as await fetch("...")`
   silently produces broken JavaScript (`let r = await;`). Async work comes
   from dedicated statements (`ask`, `ocr`, telegram handlers) or JavaScript
   blocks, which handle awaiting for you.

8. **No try/catch statement.** Wrap risky code in a JavaScript block if you
   need error handling.

9. **Comments start with `//`.** There is no `note` keyword in the current
   deterministic parser.

10. **Keywords are reserved.** Don't name variables `show`, `is`, `make`,
    `use`, `when`, `start`, `bot`, `ocr`, etc.

11. **Strings use double quotes or backticks.** Backticks support `${expr}`
    interpolation and multiline text. Single quotes are not string delimiters
    in Plain source.

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

### Conditions

| Plain | JavaScript |
|---|---|
| `is` / `is equal to` | `===` |
| `is not` | `!==` |
| `is greater than` / `is above` | `>` |
| `is less than` / `is below` | `<` |
| `is at least` | `>=` |
| `is at most` | `<=` |
| `is empty` / `is not empty` | `.length === 0` / `.length > 0` |
| `contains "x"` | `.includes("x")` |
| `starts with "x"` | `.startsWith("x")` |
| `ends with "x"` | `.endsWith("x")` |

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

remember user as { name: "Ayo", age: 17 }     // inline form
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

| Call | JavaScript |
|---|---|
| `length(x)` | `(x).length` |
| `uppercase(x)` / `lowercase(x)` | `.toUpperCase()` / `.toLowerCase()` |
| `random()` | `Math.random()` |
| `round(x)` | `Math.round(x)` |
| `readFile(path)` / `writeFile(path, c)` / `fileExists(p)` | sync `fs` calls |
| `time()` / `date()` | `Date.now()` / ISO timestamp |
| `sleep(ms)` | blocking sleep |
| `uuid()` | crypto UUID |
| `env("KEY")` | `process.env["KEY"]` |
| `exit(code)` | `process.exit(code)` |
| `jsonEncode(x)` / `jsonDecode(s)` | `JSON.stringify` / `JSON.parse` |

---

## 5. Packages — `use`

Any npm package works. v2.0.1 adds aliases and version ranges.

```plain
use express                    // const express = require('express')
use node-fetch                 // require('node-fetch')  — side effect only,
                               // because "-" isn't a valid JS identifier

use node-fetch as fetch        // const fetch = require('node-fetch')  ← v2.0.1
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
  and `plain install`.
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

start 3000
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

---

## 7. SQLite

```plain
database "app.db"

insert
    INSERT INTO users (name, age) VALUES ('Ayo', 17)
done

query
    SELECT * FROM users
done

update
    UPDATE users SET age = 18 WHERE name = 'Ayo'
done

delete
    DELETE FROM users WHERE id = 1
done

execute
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)
done
```

Raw SQL goes verbatim into prepared statements. Files are created
automatically.

---

## 8. Input, raw JS, and the escape hatch

`ask` reads a line from the terminal (async handled for you):

```plain
ask "What is your name?" as who
show `Hey ${who}`
```

JavaScript Gateway blocks are the pressure valve. When Plain's surface doesn't
cover something (math beyond `+`, try/catch, method chains, HTTP with await),
drop to real JS — everything else around it stays Plain:

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
arithmetic operators, and `await`.

---

## 9. Telegram bots

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

Notes (fixed in v2.0.1): rendered inline buttons execute their Plain
callbacks, and the token given to `bot "…"` drives every API call.

---

## 10. OCR

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

## 11. Multi-file projects

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

## 12. CLI cheat sheet

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

## 13. Verification workflow (do this after generating code)

```bash
plain check app.pln     # fast syntax gate — run this before anything else
plain run app.pln       # full pipeline
```

If `check` reports `Line N, Column M: ...`, fix that exact spot. Errors
include suggestions ("Did you mean ...") — trust them.

---

## 14. Copy-paste prompt for your AI

> You are writing Plain (`.pln`) source that compiles with
> `@ayoxx/plain-code`. Follow these rules strictly:
>
> - Every block ends with `done`. No braces anywhere.
> - Variables: `remember x as V`, reassign `x becomes V`.
> - Print with `show X`.
> - Conditions MUST contain a comparison (`is`, `is not`, `is greater than`,
>   `is at least`, `contains`, `starts with`, `is empty`, ...). No `and`,
>   no `or`, no `otherwise if` — nest `if` inside `otherwise` with its own
>   `done`.
> - Only arithmetic operator is `+`. No `*`, `/`, `-`, no negative literals,
>   no parenthesized math groups.
> - No method calls on values (`list.push(1)` is invalid). Use builtins like
>   `length(x)`, user functions, or a JavaScript block.
> - No `await` prefix in expressions. No try/catch. Comments are `//`.
> - For anything beyond the surface (HTTP with await, complex math, error
>   handling), use:
>   `remember result as javascript ... return value ... done`
> - Packages: `use pkg`, `use pkg as alias`, `use pkg@^1.2.0`.
> - After writing code, run `plain check app.pln` and fix reported lines.
>
> Full reference follows in knowledge.md.

---

*Every claim in this file reflects the deterministic compiler as of v2.0.1.
When in doubt: `plain check` is ground truth.*
