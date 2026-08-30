# PlainScript 1.0.2-rfc language specification

This reference describes the syntax implemented by `compiler/lexer.js` and
`compiler/parser.js`. The generated runtime is implemented in
`compiler/generator.js`. Examples in this document are checked from the
repository's maintained example set.

## Design

PlainScript is a line-oriented, intent-oriented language for Node.js. Source
files use `.pln`. Blocks close with `done` unless the syntax explicitly uses
`together`. Whitespace is not semantic.

The canonical declaration forms are:

```plainscript
remember name as "Ada"
let age be 36
name becomes "Grace"
show name
```

Comments begin with `//`. Double-quoted strings support escapes. Backtick
strings preserve content and support `${expression}` interpolation.

## Values and expressions

Values include strings, template strings, numbers, booleans, `null`,
`undefined`, BigInt, arrays, objects, identifiers, calls, member access,
optional member access, and indexed access.

```plainscript
remember names as ["Ada", "Grace"]
remember user as {name: "Ada", active: true}
show names[0]
show user?.name
```

English collection expressions:

```plainscript
remember items as list with "one", "two", "three"
remember profile as record with name "Ada" and role "admin" done
show first item from items
show last item from items
show item one from items
show items at position 1
```

Arithmetic supports `+`, `-`, `*`, `/`, `%`, and `**`, with normal
precedence. Word forms `plus`, `minus`, `times`, and `divided by` are also
recognized. `??` and unary `-`, `wait for`, `typeof`, `void`, and `delete`
are implemented.

## Conditions

```plainscript
if age is at least 18 and name contains "A"
    show "adult"
otherwise
    show "minor"
done
```

Operators:

| Syntax | Result |
| --- | --- |
| `is`, `same as` | `===` |
| `is not`, `different from` | `!==` |
| `more than`, `is greater than`, `is above` | `>` |
| `fewer than`, `is less than`, `is below` | `<` |
| `is at least` | `>=` |
| `is most` | `<=` |
| `contains`, `starts with`, `ends with`, `made of` | string predicates |
| `between low and high` | inclusive range |
| `has field field` | property existence |
| `instanceof Kind` | instance test |

Use `and`, `or`, and `not` to combine conditions. Inline conditionals use
`choosing condition then yesValue otherwise noValue`.

## Functions

```plainscript
make add(a, b)
    give a + b
done

show add(2, 3)
```

Function parameters can have simple defaults:

```plainscript
make greet(name as "friend")
    give `Hello, ${name}`
done
```

Aliases `define`, `function`, `return`, and `give back` are implemented. The
readable declaration form is:

```plainscript
to add a and b together
    give a + b
together
```

`yield` creates a generator function. Functions may use `wait for` and other
async operations.

## Control flow

```plainscript
for each item in items
    show item
done

for index i from 0 to 2
    show i
done

while count is less than 3
    count becomes count + 1
done
```

Use `break` and `continue` inside loops. `match value against` uses `->`
case arrows and `otherwise`. `switch value against` is an equivalent
discriminant form.

## Record kinds

```plainscript
define a kind called "Player" with
    name is ""
    goals is 0
done

remember player as create a Player with name "Ada" and goals 4
```

`define a kind called` creates a record kind. Fields use default expressions.
`create a Kind with field value and field value` constructs an instance.

## Modules and packages

```plainscript
import "./math.pln"
import { circleArea } from "./geometry.pln"
export circleArea
use express
```

Imports are bundled in dependency order. `use` declares an npm package.

## Web server syntax

```plainscript
web app
allow cors

route get "/health"
    reply json
        ok is true
    done
done

when nothing matches
    status 404
    reply "not found"
done

start 3000
```

Methods are `get`, `post`, `put`, `patch`, and `delete`. Request values use
`body of request`, `param("id")`, `query("name")`, `header("x-token")`,
`upload("file")`, and `uploads("file")`.

Server capabilities include:

```plainscript
enable sessions "secret"
set cookie "theme" to "dark" expires in 7 days
limit requests to 100 per minute
require api key from env("API_KEY")
accept uploads limit "5 MB" allow list with "image/png" folder "uploads"
```

## Database and HTTP

```plainscript
database "app.db" using "wasm"
execute
    CREATE TABLE users (name TEXT)
done
insert
    INSERT INTO users (name) VALUES ("Ada")
done
remember users as query
    SELECT name FROM users
done
```

SQL blocks are closed by `done`. `{variable}` placeholders are bound safely.
`transaction ... done` groups writes. `postgres connection` selects
PostgreSQL generation.

HTTP client expressions:

```plainscript
remember response as get "https://example.com" timeout 5000
remember created as post "https://example.com" with {name: "Ada"} headers {accept: "application/json"}
```

## Errors and async

```plainscript
try
    remember value as wait for load()
recover as error
    show message of error
finally
    show "finished"

retry 3 times every 1 second
    show "retry"
done
```

Concurrency helpers are `allOf`, `anyOf`, `settledOf`, and `withTimeout`.
Recurring blocks are `every 5 minutes ... done` and
`schedule "0 * * * *" ... done`.

## WebSockets, cache, bots, and OCR

```plainscript
websocket server on 8080
    when socket connects
        send socket "connected"
    done
    when socket sends message
        broadcast message
    done
done

cache env("REDIS_URL")
cacheSet("key", "value", 60)
remember value as cacheGet("key")
```

Telegram:

```plainscript
bot env("TELEGRAM_BOT_TOKEN")
when someone sends "/start"
    reply "Welcome"
done
start telegram bot
```

WhatsApp uses `whatsapp bot ... done`, with `auth`, `login qr`, `login
pairing`, and `on message` clauses. OCR uses:

```plainscript
ocr path of file as text
```

## Native tests

```plainscript
test "addition"
    check add(2, 3) equals 5
done
```

Assertions are `equals`, `is`, `contains`, and `raises`.

## CLI

```text
plainscript check [target]
plainscript build [file.pln]
plainscript run <file.pln>
plainscript start
plainscript fmt <file.pln>
plainscript install
plainscript doctor
plainscript version
```

`check` parses imports, generates JavaScript, and validates that output with
Node's parser without writing files.