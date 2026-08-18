# AI-Assisted Compilation

Part of Plain 2.0.0 (RFC-0020).

Plain's language rules remain authoritative. The existing compiler remains the
deterministic execution path whenever it understands the syntax. An AI
compiler layer handles supported Plain constructs that are not yet represented
by the deterministic compiler, by consulting versioned rule files and
translating the Plain program into JavaScript.

> Plain is an Intent-Oriented Programming Language with a deterministic
> compiler, a growing rule system, and an AI-assisted translation layer for
> capabilities that have not yet been hard-coded into the compiler.

## When the AI layer runs

AI assistance is used only when **all** of these are true:

1. Plain syntax is valid under the language/rules model.
2. The deterministic compiler does not understand the construct.
3. A matching rule exists.
4. Translation is necessary.

Deterministic syntax stays deterministic — offline, fast, free. The AI layer
never runs for code the compiler already understands.

## Pipeline

```text
source.pln
    │
    ▼
Lexer/Parser → deterministic support?
    │ yes ────────────────► generator → JS
    │ no
    ▼
Rule resolver (compiler/ai/resolver.js)
    │ no match
    ▼         └────────► "Plain rule error: no rule covers this construct"
matched rule
    ▼
Cache lookup (key = rule version + compiler version + model + route + source)
    │ miss
    ▼
Provider routing: hosted service (default) or local provider
    │
    ▼
AI translation (compiler/ai/translator.js → agent → client)
    │
    ▼
Validation (compiler/ai/validator.js): structure, fields, JS syntax,
forbidden patterns, require() allowlist
    │
    ▼
Existing bundler/runtime/dependency path → executable JS
```

The hosted path goes through the same pipeline: the CLI's `compiler/ai/remote.js`
POSTs the source to the service (`compiler/ai/server.js`), which runs the shared
`translator`/`validator` pipeline with its own provider credential and returns
the validated contract. The CLI re-validates the response before use.

## Rules

Rules live in `compiler/rules/` and ship with the package. Each capability is a
versioned pair:

- `<capability>.md` — human-readable rule (RFC-0020 §7): capability, purpose,
  supported Plain syntax, semantics, JavaScript target, dependencies, async
  behavior, examples, invalid forms, security considerations, expected output,
  tests.
- `<capability>.json` — machine-readable metadata (RFC-0020 §37): name,
  category, version, keywords, triggers, dependencies, async, compilerMin.

Shipped rules:

| Rule          | Path             | npm dependency        | Async |
| ------------- | ---------------- | --------------------- | ----- |
| Telegram bot  | `bots/telegram`  | `node-telegram-bot-api` | yes  |
| HTTP fetch    | `http/fetch`     | *(none — global fetch)* | yes  |
| REST API      | `web/rest-api`   | `express`             | no    |

Rule precedence (most specific wins): exact syntax rule → domain-specific rule
→ generic library rule → generic JavaScript interoperability rule → JavaScript
Gateway. A broad generic rule never overrides an exact Plain language rule.

## Configuration

**Plain users do not need an API key.** By default, unsupported Plain syntax is
sent to the hosted compiler service (`https://plain-code-compiler.onrender.com`),
which owns the provider credential. Override the endpoint with
`PLAIN_AI_REMOTE_URL` (e.g. a self-hosted deployment):

| Variable            | Default                                 | Purpose                              |
| ------------------- | --------------------------------------- | ------------------------------------ |
| `PLAIN_AI_REMOTE_URL`| `https://plain-code-compiler.onrender.com` | Hosted compiler service endpoint |
| `MISTRAL_API_KEY`   | *(unset)*                                | Provider API key (self-hosted only)  |
| `PLAIN_AI_BASE_URL` | `https://api.mistral.ai`                | Provider base URL (self-hosted only) |
| `PLAIN_AI_MODEL`    | `mistral-small-latest`                   | Model identifier                     |
| `PLAIN_AI_CACHE_DIR`| `~/.plain/ai-cache`                      | Optional cache directory override    |

The provider speaks the OpenAI-compatible chat completions protocol
(`POST {base}/v1/chat/completions`), so compatible providers (e.g. Groq) work
with no compiler changes.

## Hosted compiler service

The repository ships with a deployable HTTP service, `compiler/ai/server.js`,
that serves the shared compilation pipeline — no separate project is needed:

```bash
npm start          # or: node compiler/ai/server.js  (listens on $PORT or 3000)
```

- `GET  /health` — health check for Render (`{ ok: true, service, version }`).
- `POST /translate` — body `{ "source": "...", "rule": "bots/telegram"?, "options": { "noCache": true }? }`; returns the validated output contract. Layer-specific errors map to HTTP statuses: 400 bad request, 422 rule/validation failure, 500 server misconfiguration, 502 provider failure.

Deployment is defined in `render.yaml` (Render blueprint, `npm start`). The
provider API key is set as a secret environment variable (`MISTRAL_API_KEY`)
in the Render dashboard — `sync: false` in the blueprint means it is never
stored in the repository. The service reads it from the environment at
runtime, refuses to serve requests when it is missing, scrubs it from any
error text, and rejects generated code that contains it.

## Output contract

The provider returns a single JSON object:

```json
{
  "javascript": "...",
  "dependencies": ["node-telegram-bot-api"],
  "imports": [],
  "async": true
}
```

Malformed output fails compilation cleanly.

## Validation

AI-generated JavaScript is never trusted blindly (RFC-0020 §13):

1. response structure is checked
2. required fields are checked
3. JavaScript syntax is parsed with `vm.Script` (parsed, never executed)
4. unsupported/forbidden patterns are detected (`eval`, `new Function`,
   child-process execution, path/network `require`)
5. every `require()` must be declared in `dependencies` or be a Node built-in

## Cache

Successful translations are cached in `~/.plain/ai-cache` (override with
`PLAIN_AI_CACHE_DIR`). The cache key folds in the rule version, compiler
version, model, and normalized source, so a cached result from an older rule
version is never silently reused (RFC-0020 §15).

## Security

- Plain source is treated as potentially untrusted.
- Secret values are never sent to the model — at most a variable name is
  referenced (`remember token as env("BOT_TOKEN")` keeps the value at runtime).
- Only relevant source and the matching rule are sent, never the whole project.
- `.env` is ignored by `.gitignore`; only `.env.example` is committed.
- The provider API key lives only in the service/self-hosted environment. It is
  never committed, never logged, scrubbed from error text, and never embedded
  in generated JavaScript (the service rejects output that contains it).
- The JavaScript Gateway remains the explicit escape hatch for advanced or
  unsupported JavaScript.

## Failure modes

Errors identify the failing layer (RFC-0020 §39):

- `Plain syntax error`
- `Plain rule error`
- `AI compilation error`
- `Generated JavaScript validation error`
- `Runtime dependency error`

If the provider is unreachable, deterministic programs still compile, cached
translations may still work, and unsupported AI-dependent syntax produces a
clear error — never a silent substitution.

## Diagnostics

```bash
plain ai status       # provider, rules, cache summary
plain ai rules        # list rules with metadata
plain ai cache        # list cached translations
plain ai cache clear  # empty the cache
```

`plain doctor` also reports the AI layer (rules directory, provider, cache).

## Authoring a rule

1. Create `compiler/rules/<category>/<capability>.md`.
2. Create `compiler/rules/<category>/<capability>.json` with `name`, `category`,
   `version`, `keywords`, `triggers`, `dependencies`, `async`, `compilerMin`.
3. Add at least one example to the Markdown and mirror it in `tests/ai.test.js`.
4. Run `npm test`.

Adding a common capability this way is substantially cheaper than modifying the
core lexer/parser/generator.
