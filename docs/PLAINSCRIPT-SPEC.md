# PlainScript 1.0.3 language specification

This reference covers the syntax implemented by `compiler/lexer.js` and
`compiler/parser.js`. The runtime it generates lives in
`compiler/generator.js`. Every example here is checked against the
repository's maintained example set.

## Design

PlainScript is a line-oriented, intent-oriented language made for Node.js.
Source files use `.pln`. Blocks end with `done` unless the syntax says
`together`. Whitespace does not matter.

The basic declaration forms are:

```plainscript
remember name as "Ada"
let age be 36
name becomes "Grace"
show name
```

Comments begin with `//`. Double-quoted strings support escapes. Backtick
strings keep their content as-is and support `${expression}` interpolation.

## Values and expressions

PlainScript has strings, template strings, numbers, booleans, `null`,
`undefined`, BigInt, arrays, objects, identifiers, function calls, member
access, optional member access, and indexed access.

```plainscript
remember names as ["Ada", "Grace"]
remember user as {name: "Ada", active: true}
show names[0]
show user?.name
```

English-style collection expressions:

```plainscript
remember items as list with "one", "two", "three"
remember profile as record with name "Ada" and role "admin" done
show first item from items
show last item from items
show item one from items
show items at position 1
```

Arithmetic uses `+`, `-`, `*`, `/`, `%`, and `**`, with normal
precedence. Word forms `plus`, `minus`, `times`, and `divided by` also work.
`??` plus unary `-`, `wait for`, `typeof`, `void`, and `delete` are
supported.

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

Write a function with `make` and return a value with `give`:

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

Aliases like `define`, `function`, `return`, and `give back` also work. Use
`make` and `give` for the readable form:

```plainscript
make add(a, b)
    give a + b
done
```

`yield` turns a function into a generator. Functions can use `wait for` and
other async operations.

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
case arrows and `otherwise`. `switch value against` works the same way and
is just another way to write it.

## Record kinds

```plainscript
define a kind called "Player" with
    name is ""
    goals is 0
done

remember player as create a Player with name "Ada" and goals 4
```

`define a kind called` makes a new record kind. Fields use default
expressions. `create a Kind with field value and field value` builds an
instance.

## Modules and packages

```plainscript
import "./math.pln"
import { circleArea } from "./geometry.pln"
export circleArea
use express
```

Imports get bundled in dependency order. `use` declares an npm package.

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

The server also supports:

```plainscript
enable sessions "secret"
route get "/preferences"
    set cookie "theme" to "dark" expires in 7 days
    reply "saved"
done
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
`transaction ... done` groups writes. `postgres connection` generates
PostgreSQL code instead.

HTTP client expressions:

```plainscript
remember response as get "https://example.com" timeout 5000
remember created as post "https://example.com" with {name: "Ada"} headers {accept: "application/json"}
```

## Errors and async

```plainscript
try
    remember value as get "https://example.com" timeout 5000
recover as error
    show message of error
finally
    show "finished"

retry 3 times every 1 second
    show "retry"
done
```

Concurrency helpers are `allOf`, `anyOf`, `settledOf`, and `withTimeout`.
Recurring blocks use `every 5 minutes ... done` and
`schedule "0 * * * *" ... done`.

## AI providers

`chat(model, messages, options)` and `embedText(model, text, options)` talk
to an OpenAI-compatible API. Provider presets pick safe defaults for the
endpoint and the environment variable:

| Provider | API key | Default base |
| --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | `https://api.openai.com/v1` |
| `groq` | `GROQ_API_KEY` | `https://api.groq.com/openai/v1` |
| `openrouter` | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1` |
| `together` | `TOGETHER_API_KEY` | `https://api.together.xyz/v1` |
| `fireworks` | `FIREWORKS_API_KEY` | `https://api.fireworks.ai/inference/v1` |
| `deepseek` | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/v1` |

```plainscript
remember answer as chat("llama-3.3-70b-versatile", "Hello from PlainScript", {
    provider: "groq",
    key: env("GROQ_API_KEY"),
    temperature: 0.2,
    maxTokens: 200
})
remember explicit as chatWith("groq", "llama-3.3-70b-versatile", "Hello")
show answer
```

`base`, `key`, `headers`, `temperature`, `maxTokens`, and `responseFormat`
are optional. Custom providers can supply a provider name plus `base` and
`key`; the runtime falls back to `PROVIDER_API_KEY` and `PROVIDER_BASE_URL`.
These calls work in ordinary programs, routes, jobs, and messaging handlers.

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

Inside a Telegram handler, `message`, `text`, `args`, `matches`, `chat`,
`chatId`, and callback `data` hold the update context. Fixed replies use
`reply "text"`; provider-backed replies can use `chatWith` before `reply`.
`telegramCall(method, params)` calls any Telegram Bot API method.

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