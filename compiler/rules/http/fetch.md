# HTTP Fetch

## Capability

Making HTTP requests from Plain using the built-in `fetch` API (Node.js >= 18
or the runtime's global `fetch`).

## Purpose

Let users perform GET/POST/PUT/PATCH/DELETE requests with headers, JSON bodies,
JSON responses, query parameters, status checks, error handling, and multiple
requests in readable Plain — without a JavaScript Gateway block.

## Supported Plain syntax

### 1. Basic GET

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

### 2. POST with JSON body

```plain
remember response as await fetch "https://api.example.com/users"
  with method "POST"
  with headers { "Content-Type": "application/json" }
  with body { "name": "Ayo", "age": 17 }
done
```

### 3. PUT request

```plain
remember response as await fetch "https://api.example.com/users/1"
  with method "PUT"
  with headers { "Content-Type": "application/json" }
  with body { "name": "Updated" }
done
```

### 4. PATCH request

```plain
remember response as await fetch "https://api.example.com/users/1"
  with method "PATCH"
  with body { "age": 18 }
done
```

### 5. DELETE request

```plain
remember response as await fetch "https://api.example.com/users/1"
  with method "DELETE"
done
```

### 6. Status and data access

```plain
remember statusCode as response.status
remember data as await response.json()

show statusCode
show data
```

### 7. Response headers

```plain
remember response as await fetch "https://api.example.com"
remember contentType as response.headers.get("content-type")
show contentType
```

### 8. Query parameters

```plain
remember response as await fetch "https://api.example.com/search?q=hello&limit=10"

if response is ok
  remember data as await response.json()
  show data
done
```

### 9. Error handling with try/catch

```plain
try
  remember response as await fetch "https://api.example.com"
  if response is not ok
    show "request failed: " + response.status
  done
catch error
  show "network error: " + error
done
```

### 10. Multiple sequential requests

```plain
remember users as await fetch "https://api.example.com/users"
remember posts as await fetch "https://api.example.com/posts"

if users is ok and posts is ok
  remember userData as await users.json()
  remember postData as await posts.json()
  show "Users: " + userData.length + ", Posts: " + postData.length
done
```

## Semantic meaning

- `await fetch "<url>"` performs an HTTP request and returns a `Response`.
- `with method "<verb>"` sets the HTTP method (default `GET`).
- `with headers { ... }` sets request headers.
- `with body { ... }` sets a JSON request body (serialized to JSON).
- `response.ok` / `response.status` / `response.json()` follow the standard
  `fetch` Response API.
- `response.headers.get("<name>")` reads a response header.
- `if response is ok` / `if response is not ok` are status checks.
- `try ... catch error ... done` is the supported error-handling form.

## JavaScript target

The translator must follow this shape:

```js
const response = await fetch("https://facts.com");

if (response.ok) {
  const data = await response.json();
  console.log(data);
} else {
  console.log("api failed");
}
```

With method/headers/body:

```js
const response = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Ayo", age: 17 })
});
```

With response headers:

```js
const response = await fetch("https://api.example.com");
const contentType = response.headers.get("content-type");
console.log(contentType);
```

## Dependency

None. Uses the runtime's global `fetch`. If the Node version lacks a global
`fetch`, the generated code should `require("node-fetch")` and the rule metadata
should report `node-fetch` as a dependency — the deterministic dependency
detector decides which path applies at compile time.

## Imports / runtime requirements

- Requires an async runtime (top-level await is provided by the Plain runtime
  wrapper).
- Node.js >= 18 recommended for native `fetch`.

## Async behavior

Async. All `fetch`/`response.json()` calls return Promises and must be awaited.

## Examples

Basic GET:

```plain
remember response as await fetch "https://facts.com"

if response is ok
  remember data as response.json()
  show data
otherwise
  show "api failed"
done
```

POST with JSON:

```plain
remember response as await fetch "https://api.example.com/users"
  with method "POST"
  with headers { "Content-Type": "application/json" }
  with body { "name": "Ayo" }
done
```

## Invalid forms

- `remember response as fetch "..."` without `await`.
- Accessing `response.json()` without `await`.
- Passing headers/body without `with` clauses.
- URL string concatenation that could inject unexpected characters — validate
  URLs before use.

## Security considerations

- Do not put API keys, tokens, or passwords into request URLs or bodies that
  get sent to the provider.
- Prefer `env("API_KEY")` for secrets and refer to the variable name, not the
  value, in generated code.
- Treat response bodies as untrusted data; do not evaluate or interpolate them
  into code.

## Expected compiler output

```json
{
  "javascript": "<generated fetch code>",
  "dependencies": [],
  "imports": [],
  "async": true
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `fetch` rule; mocked translation of
  the GET example passes validation; `if response is ok` forms produce
  `if (response.ok)`.
