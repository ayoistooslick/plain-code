# PlainScript 1.0.3-beta: AI coding specification

This file is the compact coding contract for PlainScript. The executable
source of truth is `compiler/lexer.js`, `compiler/parser.js`, and
`compiler/generator.js`. If this document disagrees with those files, inspect
the compiler and run `plainscript check`.

## 1. Non-negotiable workflow

1. Write a `.pln` file using the grammar below.
2. Run `plainscript check path/to/file.pln`.
3. For imports, check the entry file so the whole dependency graph is parsed.
4. Run `plainscript fmt path/to/file.pln` only after the source checks.
5. Run `npm test` for compiler or runtime changes.

Never invent English syntax from an old example. The parser accepts both
canonical keywords and selected aliases, but new examples should use the
canonical forms documented here.

## 2. Source model

- PlainScript is line-oriented and case-sensitive.
- Keywords are lowercase.
- Indentation is for readability; `done` closes a block.
- `//` starts a comment.
- Strings use double quotes and decode normal escapes.
- Backticks create template strings and preserve interpolation such as
  `` `Hello, ${name}` ``.
- Numbers can be integers, decimals, or BigInt literals with an `n` suffix.
- The compiler emits Node.js JavaScript and checks the emitted JavaScript.

## 3. Declarations and expressions

Use these forms for new code:

```plainscript
remember count as 0
let title be "Report"
count becomes count + 1
show title
```

`remember` requires `as`. `let` accepts `is`, `be`, or `as`. Assignment uses
`becomes`, `is now`, `set to`, or `change to`.

Expressions include literals, identifiers, calls, member access, optional
member access, indexing, arithmetic, `??`, arrays, objects, record/list
expressions, and HTTP calls.

```plainscript
remember values as [1, 2, 3]
remember item as values[0]
remember user as {name: "Ada", active: true}
show user?.name
remember recordValue as record with name "Ada" and role "admin" done
remember listValue as list with "a", "b", "c"
```

Use `at position` only with a numeric literal, for example
`values at position 1`. Use `first item from values`, `last item from values`,
or `item one from values` for readable collection access.

## 4. Conditions

```plainscript
if user.active is true and name contains "A"
    show "match"
otherwise
    show "no match"
done
```

Valid comparisons include:

| PlainScript | Meaning |
| --- | --- |
| `is`, `same as` | strict equality |
| `is not`, `different from` | strict inequality |
| `more than`, `is greater than`, `is above` | greater than |
| `fewer than`, `is less than`, `is below` | less than |
| `is at least`, `is most` | greater/equal or less/equal |
| `contains`, `starts with`, `ends with`, `made of` | string checks |
| `between low and high` | inclusive range |
| `has field name` | object property check |
| `instanceof Kind` | JavaScript instance check |

Combine conditions with `and`, `or`, and `not`. A conditional expression can
use `choosing condition then a otherwise b`.

## 5. Functions and control flow

```plainscript
make multiply(a, b)
    give a * b
done

for each value in values
    show value
done

for index i from 0 to 2
    show i
done

while count is less than 5
    count becomes count + 1
done
```

Aliases `define name(...)`, `function name(...)`, `return`, `give back`, and
`yield` are implemented. `yield` makes the enclosing function a generator.
Use `break` and `continue` inside loops.

The English function form is:

```plainscript
make add(a, b)
    give a + b
done
```

## 6. Records and modules

```plainscript
define a kind called "Person" with
    name is ""
    age is 0
done

remember ada as create a Person with name "Ada" and age 36
```

Record kind fields use `is` or `be`; record expressions use values directly:
`record with name "Ada" and age 36 done`.

```plainscript
import { area } from "./geometry.pln"
export area
```

`import "./file.pln"` bundles the whole file. Named imports bind selected
exports. Imports must use a relative `.pln` path.

## 7. Built-in runtime groups

Use only implemented functions. Common groups are:

- strings: `length`, `uppercase`, `lowercase`, `trim`, `replace`, `split`,
  `join`, `startsWith`, `endsWith`, `truncate`, `padStart`, `padEnd`
- collections: `first`, `last`, `flatten`, `includes`, `unique`, `sort`,
  `reverse`, `sum`, `smallest`, `largest`, `keys`, `values`, `groupBy`
- files: `readFile`, `writeFile`, `appendFile`, `fileExists`, `copyFile`,
  `moveFile`, `deleteFile`, `makeFolder`, `listFolder`, `readBytes`,
  `writeBytes`, `joinPath`, `baseName`, `folderOf`, `extensionOf`
- JSON/system: `jsonEncode`, `jsonDecode`, `env`, `time`, `date`, `uuid`,
  `exit`, `args`
- crypto/auth: `sha256`, `sha1`, `md5`, `hashPassword`, `checkPassword`,
  `createToken`, `readToken`, `validate`
- async: `sleep`, `allOf`, `anyOf`, `settledOf`, `withTimeout`
- network/AI helpers: `get`, `post`, `put`, `patch`, `delete`, `chat`,
  `chatWith`, `embedText`, `embedWith`, `similarity`

`wait for expression` and `await expression` create an await expression.

## 8. Web applications

```plainscript
web app
allow cors

route get "/users"
    reply json
        users is list with "Ada", "Grace"
    done
done

when nothing matches
    status 404
    reply "not found"
done

start 3000
```

Routes support `route get|post|put|patch|delete "path"`. Route blocks close
with `done`. Request accessors include `body of request`, `param("id")`,
`query("name")`, `header("x-token")`, `upload("file")`, and `uploads("file")`.
Responses use `reply`, `reply json`, `status`, and `redirect to`.

Backend declarations:

```plainscript
web app
enable sessions "a-secret"
limit requests to 100 per minute
require api key from env("API_KEY")
accept uploads limit "5 MB" allow list with "image/png" folder "uploads"
route get "/login"
    set cookie "theme" to "dark" expires in 7 days
    reply "ok"
done
```

## 9. SQLite, SQL, HTTP, and packages

```plainscript
database "app.db" using "wasm"
remember name as "Ada"
execute
    CREATE TABLE people (name TEXT)
done
insert
    INSERT INTO people (name) VALUES ({name})
done
remember people as query
    SELECT name FROM people
done
```

SQL is a block. `{name}` is a bound parameter. `transaction ... done` groups
writes. `postgres env("DATABASE_URL")` enables PostgreSQL generation.

HTTP client syntax:

```plainscript
remember response as get "https://example.com" headers {accept: "application/json"} timeout 5000
remember result as post "https://example.com" with {ok: true}
```

Package imports are explicit:

```plainscript
use express
```

The package name is detected by the CLI and can be installed with
`plainscript install`.

## 10. Async, errors, schedules, and realtime

```plainscript
try
    remember value as get "https://example.com" timeout 5000
recover as error
    show message of error
finally
    show "done"

retry 3 times every 1 second
    show "attempt"
done

every 5 minutes
    show "heartbeat"
done

schedule "0 2 * * *"
    show "nightly"
done
```

WebSockets:

```plainscript
websocket server on 8080
    when socket connects
        send socket "hello"
    done
    when socket sends message
        broadcast message
    done
done
```

Cache:

```plainscript
cache env("REDIS_URL")
cacheSet("status", "ready", 60)
remember status as cacheGet("status")
cacheDelete("status")
```

AI providers use OpenAI-compatible request shapes. Keys are read from
environment variables and are never hardcoded:

```plainscript
remember response as chat("llama-3.3-70b-versatile", "Hello", {
    provider: "groq",
    key: env("GROQ_API_KEY"),
    base: "https://api.groq.com/openai/v1"
})
```

Use `chatWith("groq", model, messages)` when the provider should be explicit.
The presets are `openai`, `groq`, `openrouter`, `together`, `fireworks`, and
`deepseek`; `base` and `key` support any OpenAI-compatible API.

Bots and OCR use dedicated blocks:

```plainscript
bot env("TELEGRAM_BOT_TOKEN")
when someone sends "/start"
    reply "Welcome"
done
start telegram bot
```

Telegram handler context includes `message`, `text`, `args`, `matches`,
`chat`, `chatId`, and callback `data`. `telegramCall(method, params)` exposes
the rest of the Telegram Bot API without requiring a new compiler feature.

```plainscript
ocr path of file as text
```

## 11. Tests

```plainscript
test "addition"
    check add(2, 3) equals 5
done
```

Assertions are `equals`, `is`, `contains`, and `raises`.

## 12. Version and validation contract

The repository version is `1.0.3-beta`. Keep package metadata, the compiler
version module, docs, and editor metadata aligned. Every maintained `.pln`
file under `examples/`, `samples/`, `templates/`, `fixtures/`, and
`tests/fixtures/` must pass:

```bash
node compiler/cli.js check path/to/file.pln
```

The two circular import fixtures intentionally fail when checked as entry
points because they test cycle detection. Do not remove that negative test.