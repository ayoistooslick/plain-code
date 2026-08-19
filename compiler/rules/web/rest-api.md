# REST API

## Capability

Building REST API servers with Express: routes, request data, response data,
JSON responses, path parameters, query parameters, middleware, error handling,
and async route handlers.

## Purpose

Let users write a REST API server in readable Plain without a JavaScript
Gateway block. The generated JavaScript uses the `express` package, which the
existing dependency detector already maps in `PACKAGE_MAP`.

## Supported Plain syntax

### 1. Create the server

```plain
remember app as express app
```

### 2. GET routes

```plain
app get "/health" as
  reply "ok"
done
```

### 3. POST routes

```plain
app post "/users" as
  remember body as request.json
  reply body
done
```

### 4. PUT routes

```plain
app put "/users/:id" as
  remember id as request.param("id")
  remember body as request.json
  reply { "id": id, "updated": true }
done
```

### 5. PATCH routes

```plain
app patch "/users/:id" as
  remember id as request.param("id")
  remember body as request.json
  reply { "id": id, "patched": true }
done
```

### 6. DELETE routes

```plain
app delete "/users/:id" as
  remember id as request.param("id")
  reply { "deleted": id }
done
```

### 7. Path parameters

```plain
app get "/users/:id" as
  remember id as request.param("id")
  reply { "id": id }
done
```

### 8. Query parameters

```plain
app get "/search" as
  remember q as request.query("q")
  remember limit as request.query("limit")
  reply { "query": q, "limit": limit }
done
```

### 9. JSON responses

```plain
app get "/status" as
  reply { "status": "running", "version": 2 }
done
```

`reply` inside a route sends a JSON response when the value is an object or a
string body otherwise.

### 10. Response status codes

```plain
app get "/users/:id" as
  remember id as request.param("id")
  if id is "999"
    reply status 404 with { "error": "not found" }
  otherwise
    reply { "id": id }
  done
done
```

### 11. Request headers

```plain
app get "/protected" as
  remember auth as request.header("authorization")
  if auth is empty
    reply status 401 with { "error": "unauthorized" }
  otherwise
    reply { "message": "granted" }
  done
done
```

### 12. Middleware

```plain
app use as
  show "request: " + request.method
done
```

### 13. Error-handling middleware

```plain
app use error as
  reply status 500 with { "error": error.message }
done
```

### 14. Async route handlers

```plain
app get "/users" as
  remember response as await fetch "https://api.example.com/users"
  remember data as await response.json()
  reply data
done
```

### 15. Start the server

```plain
listen app on port 3000
```

## Semantic meaning

- `remember app as express app` creates an Express application.
- `app <verb> "<path>" as ... done` registers a route for the given HTTP verb.
- `request` inside a route is the Express request: `request.json`,
  `request.param("id")`, `request.query("name")`, `request.method`,
  `request.header("name")`.
- `reply <value>` inside a route sends the response (`res.json(...)` for
  objects/arrays, `res.send(...)` for strings).
- `reply status <code> with <value>` sends a response with a specific status code.
- `app use as ... done` registers middleware.
- `app use error as ... done` registers error-handling middleware.
- `listen app on port 3000` starts the server on the given port.

## JavaScript target

The translator must follow this shape:

```js
const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

app.post("/users", async (req, res) => {
  const body = req.body;
  res.json(body);
});

app.put("/users/:id", (req, res) => {
  const id = req.params.id;
  res.json({ id, updated: true });
});

app.use((req, res, next) => {
  console.log("request: " + req.method);
  next();
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000);
```

When a route body uses `request.json` or `await`-requiring helpers, the handler
must be an `async` function. Express `app` must be created before any route.

## Dependency

- `express`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `express` must be installed by the normal dependency system (`plain install`
  / `plain run`). `PACKAGE_MAP` already maps `express`.

## Async behavior

Async-capable. Routes that read `request.json` or perform awaited work must be
async handlers; `app.listen` is synchronous setup.

## Examples

```plain
remember app as express app

app get "/health" as
  reply "ok"
done

app post "/users" as
  remember body as request.json
  reply body
done

app delete "/users/:id" as
  remember id as request.param("id")
  reply { "deleted": id }
done

listen app on port 3000
```

## Invalid forms

- Route registered before `remember app as express app`.
- `app <verb>` with a missing `<path>`.
- `reply` with a raw object outside a route context.
- `listen app on port` without a numeric port.

## Security considerations

- Bind to `0.0.0.0` only when intended; document port exposure.
- Validate and sanitize `request.param` / `request.query` values — treat them as
  untrusted input.
- Never send secrets, database credentials, or real request payloads to the
  provider.

## Expected compiler output

```json
{
  "javascript": "<generated express code>",
  "dependencies": ["express"],
  "imports": [],
  "async": false
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `rest-api` rule; mocked translation
  of the health route example passes validation; `reply <object>` maps to
  `res.json`.
