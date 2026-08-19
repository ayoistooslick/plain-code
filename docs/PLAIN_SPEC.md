# Plain Language Specification (v1.0.1)

Version: 1.0.1
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
    show age
    show players[0]
    show user.name

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

Node built-in modules, including `fs` and `path`, are ignored because they do
not need to be installed. A source file with no runtime package uses returns
an empty list.

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
| `plain cc status`       | Show the Complex Compilation layer status            |
| `plain cc rules`        | List the installed Plain rules                       |
| `plain cc cache`        | List the local Complex Compilation cache             |
| `plain cc cache clear`  | Clear the local Complex Compilation cache            |
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
    true      false
    note

---

This document is the single source of truth for Plain v1.0.1.
Every compiler implementation must follow this specification.
