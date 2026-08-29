# PlainScript Language Specification (v1.0.02)

Version: 1.0.02
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

    let name is "Ayokunle"
    let age is 16

Reassign:

    age is now 17
    age is now 20
    age is now 21

---

## Printing

    print "Hello"
    print("Hello")
    print age
    print(players[0])
    print user.name

Both keyword form (`print expr`) and call form (`print(expr)`) are valid and produce identical output.

---

## Conditions

    if age is 18
        print "Adult"
    otherwise
        print "Minor"
    end

    if age is 18
        print "Adult"
    else
        print "Minor"
    end

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

    define greet()
        print "Hello"
    end

    define add(a, b)
        give back a + b
    end

    function multiply(x, y)
        return x * y
    end

    greet()
    print add(5, 7)

---

## Loops

For each:

    for each player in players
        print player
    end

For every (alias for for each):

    for every item in basket
        print item
    end

For index:

    for index i from 0 to 9
        print i
    end

    for index i from 10 to 1
        print i
    end

While:

    while age is less than 18
        age is now age + 1
    end

---

## Collections

Arrays:

    let players is ["Haaland", "Foden", "Rodri"]
    let first is players[0]
    players[1] is now "Palmer"

Destructuring:

    let nums is [1, 2, 3]
    let [a, b, c] is nums
    let obj is {x: 10, y: 20}
    let {x, y} is obj

Objects:

    let user is
        name is "Ayokunle"
        age is 17
    end

    print name of user
    user.age is now 18

Spread:

    let more is [...nums, 4]

---

## Record Kinds (Classes)

    define a kind called "Person" with
        name is ""
        age is 0
    end

    let ada is create a Person with name "Ada" and age 17
    print name of ada
    print ada.age

---

## Logical Assignment

    let flag is false
    flag or is true
    print flag

    let val is null
    val nullish is "default"
    print val

---

## Web Servers

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
                let missing is validate(body of request, ["name", "email"])
                if length of missing is greater than 0
                    status 400
                    print missing
                otherwise
                    print "created"
                end
            end
        end

        start 3000
    end

Classic Express style also works:

    use express
    let app is express()
    serve folder "public"

    when someone visits "/"
        print "Hello!"
    end

    listen on 3000
        print "running"
    end

---

## Databases

    database "app.db"

    execute
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)
    end

    insert
        INSERT INTO users (name) VALUES ('Alice')
    end

    query
        SELECT * FROM users
    end

Placeholders:

    database "app.db"
    let who is "ana"
    insert
        INSERT INTO users (name) VALUES ({who})
    end

    let adults is query
        SELECT * FROM users WHERE age >= {minAge}
    end

Transactions:

    database "app.db"
    transaction
        insert
            INSERT INTO users (name) VALUES ('bob')
        end
    end

PostgreSQL:

    postgres env("DATABASE_URL")

---

## HTTP Client

    let r is get "https://api.example.com/users"
    if ok of r is true
        print status of r
        print data of r
    end

    let body is { name: "Ada" }
    let created is post "https://api.example.com/users" with body
        headers { accept: "application/json" }
        timeout 5000
    end

    delete "https://api.example.com/users/9"

---

## Error Handling

    try
        let data is jsonDecode(raw)
    recover as err
        print "bad json: " + message of err
    end

    retry 3 times every 5 seconds
        wait for fetch("https://flaky.api")
    end

---

## Testing

    test "addition"
        check add(2, 3) equals 5
        check "hello" contains "ell"
        check jsonDecode("not json") raises "JSON"
    end

---

## Exports

    let configVersion is 3
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

This document is the single source of truth for PlainScript v1.0.02.
Every compiler implementation must follow this specification.