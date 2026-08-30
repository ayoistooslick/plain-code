# PlainScript Language Specification (v2.4)

Version: 2.4
Status: Stable
File Extension: .pln

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

    let name be "Ayokunle"
    let age be 16
    remember age as 16

Reassign:

    set age to 17
    set age to 20
    set age to 21

All three forms are valid; `let x be V` is the preferred form.

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

    when age is 18
        show "Adult"
    otherwise
        show "Minor"
    done

    when age is 18
        show "Adult"
    else
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
| `a more than b`              | `>`                |
| `a fewer than b`             | `<`                |
| `a same as b`                | `===`              |
| `a different from b`         | `!==`              |
| `name starts as "x"`         | `.startsWith("x")` |
| `name ends as "x"`           | `.endsWith("x")`   |
| `name made of "x"`           | `.includes("x")`   |

---

## v2.4 Near-English Syntax

PlainScript v2.4 introduces near-English syntax forms that make code read like natural sentences. These forms are fully interchangeable with their existing equivalents.

### Array Position Access

    let first be name at position 1 in list

Equivalent to `list[0]` (0-indexed). The phrase `at position N` provides readable array indexing.

### Property Existence Check

    when obj has field "name"
        show "exists"
    done

Equivalent to `"name" in obj`. The phrase `has field` reads naturally for property checks.

### String Matching

    when name starts as "Ay"
        show "starts with prefix"
    done

    when name ends as "le"
        show "ends with suffix"
    done

    when name made of "oku"
        show "contains substring"
    done

These are English alternatives to `starts with`, `ends with`, and `contains`.

### Comparison Operators

    when a more than b
        show "a is greater"
    done

    when a fewer than b
        show "a is smaller"
    done

    when a same as b
        show "equal"
    done

    when a different from b
        show "not equal"
    done

These replace `is greater than`, `is less than`, `is equal to`, and `is not`.

### Function Calls with `together`

    greet together
    add together 5, 7
    fill result with add together 5, 7

The `together` keyword marks a function call. The `fill ... with` form captures the return value.

### Throwing Errors

    raise "something went wrong"

Equivalent to `throw new Error("something went wrong")`.

### Recover Alternatives

    try
        riskyOperation()
    handled by
        show "fallback"
    done

The `handled by` clause is an alternative to `recover as` for simpler error recovery where the error value is not needed.

### Ternary Expressions

    let label be choosing age is more than 18 then "adult" otherwise "minor"

Equivalent to `age > 18 ? "adult" : "minor"`. Reads as a natural English decision.

---

## Functions

    to greet
        show "Hello"
    done

    to add a and b together
        give back a + b
    done

    to multiply x and y together
        give back x * y
    done

    greet()
    show add(5, 7)

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

For index:

    for index i from 0 to 9
        show i
    done

    for index i from 10 to 1
        show i
    done

While:

    while age is less than 18
        set age to age + 1
    done

---

## Collections

Arrays:

    let players be list with "Haaland", "Foden", "Rodri"
    let first be players[0]
    set players[1] to "Palmer"

Destructuring:

    let nums be list with 1, 2, 3
    let [a, b, c] be nums
    let obj be record with x 10 and y 20
    let {x, y} be obj

Objects:

    let user be record with
        name "Ayokunle"
        age 17
    done

    show name of user
    set user.age to 18

Spread:

    let more be [...nums, 4]

---

## Record Kinds (Classes)

    to define a kind called "Person" with
        name is ""
        age is 0
    done

    let ada be create a Person with name "Ada" and age 17
    show name of ada
    show ada.age

---

## Logical Assignment

    let flag be false
    flag or is true
    show flag

    let val be null
    val nullish is "default"
    show val

---

## Web Servers

    web app
        allow cors

        group "/api"
            route get "/teams"
                let rows be query
                    select id, name from teams order by name
                done
                show rows
            done

            route post "/players"
                let missing be validate(body of request, list with "name", "email")
                when length of missing is greater than 0
                    status 400
                    show missing
                otherwise
                    show "created"
                done
            done
        done

        start 3000
    done

Classic Express style also works:

    use express
    let app be express()
    serve folder "public"

    when someone visits "/"
        show "Hello!"
    done

    listen on 3000
        show "running"
    done

---

## Databases

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

Placeholders:

    database "app.db"
    let who be "ana"
    insert
        INSERT INTO users (name) VALUES ({who})
    done

    let adults be query
        SELECT * FROM users WHERE age >= {minAge}
    done

Transactions:

    database "app.db"
    transaction
        insert
            INSERT INTO users (name) VALUES ('bob')
        done
    done

PostgreSQL:

    postgres env("DATABASE_URL")

---

## HTTP Client

    let r be get "https://api.example.com/users"
    when ok of r is true
        show status of r
        show data of r
    done

    let body be record with name "Ada"
    let created be post "https://api.example.com/users" with body
        headers { accept: "application/json" }
        timeout 5000
    done

    delete "https://api.example.com/users/9"

---

## Error Handling

    try
        let data be jsonDecode(raw)
    recover as err
        show "bad json: " + message of err
    done

    retry 3 times every 5 seconds
        wait for fetch("https://flaky.api")
    done

---

## Testing

    test "addition"
        check add(2, 3) equals 5
        check "hello" contains "ell"
        check jsonDecode("not json") raises "JSON"
    done

---

## Exports

    let configVersion be 3
    export configVersion

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

## Imports

    import "./math.pln"
    import { helper } from "./util.pln"

---

## Packages

    use axios
    use node-fetch as fetch
    use left-pad@^1.3.0
    use @scope/package-name

---

## Reserved Keywords

let print
define function give return
if otherwise else end
for each every in
while
use import include load
when someone visits
listen start_on serve_on
reply respond send_back
serve serve_static serve_public
folder
is above below at least most
not empty contains
starts ends with between and or
web route start run_on
database connect_database use_database
query insert update delete execute
ask prompt
ocr
true false null
try recover retry
wait
accept limit allow
require api key
enable sessions
destroy session
cookie expires
limit requests
google oauth
define kind
test check export
debugger
symbol
at position has field
starts as ends as made of
more than fewer than same as different from
together fill with
raise handled by
choosing then

---

## Built-in Functions (stdlib)

### Concurrency
- `all of [...]` - Promise.all
- `any of [...]` - Promise.race  
- `settled of [...]` - Promise.allSettled
- `wait for <expr>` - await
- `retry N times every M seconds` - retry with backoff

### Collections
- `length(x)` - array/string length
- `first/last` - array access
- `spread of x` - [...x]
- `unique(x)` - deduplicate
- `sort/reverse` - ordering

### Files
- `read(path)` / `write(data, path)`
- `fileExists(path)`

### Crypto
- `sha256(text)` / `base64Encode` / `base64Decode`

### Network
- `get/post/put/patch/delete "<url>"` - HTTP requests

### Database
- `database "file"` / `query` / `insert` / `update` / `delete` / `execute`

### Web
- `web app` / `route` / `start` / `serve folder`

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `plainscript new <name>` | Scaffold a new project |
| `plainscript build [file]` | Compile to dist/ |
| `plainscript run <file.pln>` | Install deps, compile, run |
| `plainscript check <file.pln>` | Syntax check only |
| `plainscript fmt <file.pln>` | Format in-place |
| `plainscript install` | Install detected dependencies |
| `plainscript start` | Build and run |
| `plainscript doctor` | Environment health check |

---

This document is the single source of truth for PlainScript v2.4.
Every compiler implementation must follow this specification.