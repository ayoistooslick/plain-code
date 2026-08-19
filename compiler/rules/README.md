# Plain Rule System — Rule Authoring Specification

A rule is a **language extension contract**. It defines what a Plain construct
means before Complex Compilation is allowed to implement it. Rules are
version-controlled, reviewable, testable, and shipped inside the published
package.

**A rule must define what Plain means before Complex Compilation is allowed to
implement it.** This is the foundational principle of the rule system.

## Why rules exist

Plain is an Intent-Oriented Programming Language. The deterministic compiler
(lexer/parser/generator) handles core language constructs offline, without
network access, without provider credentials, and without guessing.

Complex Compilation extends the compiler for capabilities that would otherwise
require large amounts of handwritten compiler machinery. It does **not** turn
Plain into a natural-language prompt system. Every complex capability is defined
by a versioned Plain rule with explicit syntax and semantics.

**Arbitrary natural-language fallback is forbidden.** The system must never
accept a sentence like "I want to eat you" and guess what the programmer meant.
If no rule matches, Plain rejects the construct with a useful compiler error.

## Architecture

```
Plain source
  → Plain language/rule recognition
  → deterministic compiler OR Complex Compilation
  → validated JavaScript
  → normal bundler/runtime
```

1. The deterministic compiler tries to compile the Plain source first.
2. If a construct is not supported deterministically, the **rule resolver**
   (`compiler/ai/resolver.js`) searches the rule files for a match.
3. If a rule matches, the **Complex Compilation translator**
   (`compiler/ai/translator.js`) compiles the Plain construct to JavaScript
   following that rule exactly.
4. The generated JavaScript is **validated** (`compiler/ai/validator.js`),
   flows through the normal bundler/runtime path, and dependencies are
   installed by the existing dependency system.
5. If no rule matches, or validation fails, compilation fails cleanly with a
   clear, layer-specific diagnostic.

## Rule precedence

1. Exact syntax rule
2. Domain-specific rule
3. Generic library rule
4. Generic JavaScript interoperability rule
5. JavaScript Gateway

A broad generic rule must never override an exact Plain language rule.

## Rule file layout

Each rule is a pair of files in the same directory:

```
compiler/rules/<category>/<capability>.md
compiler/rules/<category>/<capability>.json
```

- `<capability>.md` — the human-readable rule (what Plain syntax means, what
  JavaScript it maps to, examples, security notes).
- `<capability>.json` — machine-readable metadata used by the rule resolver and
  the cache (name, category, version, keywords, triggers, dependencies).

## Directory structure

```
compiler/rules/
├── README.md                    ← this file
├── bots/
│   ├── telegram.md
│   └── telegram.json
├── http/
│   ├── fetch.md
│   └── fetch.json
├── web/
│   ├── rest-api.md
│   └── rest-api.json
├── websocket/
│   ├── ws.md
│   └── ws.json
├── automation/
│   ├── cron.md
│   └── cron.json
└── communication/
    ├── email.md
    └── email.json
```

## JSON metadata schema

```json
{
  "name": "telegram",
  "category": "bots",
  "version": 2,
  "title": "Telegram Bot",
  "purpose": "Telegram bot creation, polling, commands, replies, buttons, callback queries, and messaging.",
  "keywords": ["telegram", "bot", "message", "command"],
  "triggers": [
    { "type": "regex", "pattern": "\\btelegram\\s+bot\\s+with\\s+token\\b" },
    { "type": "regex", "pattern": "\\bwhen\\s+someone\\s+sends\\b" }
  ],
  "dependencies": ["node-telegram-bot-api"],
  "imports": [],
  "async": true,
  "compilerMin": "2.0.0",
  "resolvablePaths": ["bots/telegram", "bots/telegram.json"]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Short identifier (e.g. `telegram`, `fetch`) |
| `category` | string | yes | Directory grouping (e.g. `bots`, `http`, `web`) |
| `version` | number | yes | Rule version. Bump when semantics change. |
| `title` | string | yes | Human-readable title |
| `purpose` | string | yes | One-line description of what the rule covers |
| `keywords` | string[] | yes | Lowercase terms for scoring (weaker than triggers) |
| `triggers` | object[] | yes | Regex patterns that strongly indicate this rule |
| `dependencies` | string[] | yes | npm packages required by generated code |
| `imports` | string[] | yes | Plain import paths (usually `[]`) |
| `async` | boolean | yes | Whether generated code uses top-level await |
| `compilerMin` | string | yes | Minimum Plain compiler version (e.g. `2.0.0`) |
| `resolvablePaths` | string[] | yes | Paths for explicit rule selection |

### Triggers

Triggers are the primary mechanism for rule matching. The resolver scores each
rule by counting trigger matches (3 points each) and keyword matches (1 point
each). **A rule must have at least one trigger match to be eligible** —
keyword-only matches are too weak to justify Complex Compilation.

Design triggers carefully:

- **Be specific.** `\btelegram\s+bot\s+with\s+token\b` is better than
  `\btelegram\b`.
- **Use word boundaries.** `\bwhen\s+someone\s+sends\b` prevents matching
  partial words.
- **Avoid overly broad patterns.** `\bfetch\b` would match any sentence with
  "fetch". Use `\bawait\s+fetch\b` instead.
- **Test against false positives.** Run the trigger against arbitrary English
  sentences to verify it does not accidentally match.

### Versioning

The `version` field participates in the AI cache key. Bump it whenever the
rule's semantics change so stale cached translations are never reused.

- **Minor changes** (typo fixes, documentation): do not bump version.
- **Semantic changes** (new syntax, changed behavior): bump version.
- **Breaking changes** (removed syntax): bump major version.

## Markdown structure

Every rule markdown file must include these sections in order:

1. **Capability** — one-line summary
2. **Purpose** — why this rule exists
3. **Supported Plain syntax** — all valid forms with numbered subsections
4. **Semantic meaning** — what each construct means programmatically
5. **JavaScript target** — the shape the generated code must follow
6. **Dependency** — required npm packages
7. **Imports / runtime requirements** — what the rule needs at runtime
8. **Async behavior** — whether the rule requires async execution
9. **Examples** — working Plain code
10. **Invalid forms** — what the rule must reject
11. **Security considerations** — security constraints
12. **Expected compiler output** — the JSON output contract
13. **Tests** — which test files cover this rule

## Syntax design principles

When designing Plain syntax for a new rule:

1. **Read like English.** Plain syntax should be readable by non-programmers.
2. **Be unambiguous.** Each construct should have exactly one interpretation.
3. **Use explicit markers.** Keywords like `remember`, `when`, `reply`,
   `schedule task` create recognizable patterns.
4. **Avoid collision.** Check existing grammar, parser, lexer, and generator
   for conflicts before introducing new syntax.
5. **Document first.** Write the syntax in the rule markdown before
   implementing it.
6. **Test thoroughly.** Every valid form and every invalid form needs tests.

## Semantic design principles

1. **Define meaning precisely.** The rule must specify exactly what each
   construct does.
2. **Map to concrete JavaScript.** Every Plain construct must have a clear
   JavaScript target.
3. **Handle errors.** Define what happens when things go wrong.
4. **Respect security.** Define what data is safe and what is not.

## Security requirements

Every rule must address:

1. **Secret protection.** Never embed secrets in generated code. Use `env()`.
2. **Input validation.** Treat user input as untrusted.
3. **Provider isolation.** Never send secrets to the Complex Compilation
   provider.
4. **Generated code validation.** The output must pass the validation pipeline
   (structure, syntax, forbidden patterns, require allowlist).
5. **Dependency restrictions.** Only declared dependencies may appear in
   generated code.

## Validation requirements

Generated JavaScript is validated before it can run:

1. **Structure check.** Output must be `{ javascript, dependencies, imports, async }`.
2. **Syntax check.** `vm.Script` parses the code (never executes it).
3. **Forbidden pattern scan.** `eval`, `child_process`, shell execution, etc.
   are blocked.
4. **require() allowlist.** Every `require()` must be declared or a Node built-in.
5. **Credential leak check.** API keys must not appear in generated code.

## Testing requirements

Every rule must be tested in `tests/ai.test.js`:

1. **Resolver match.** Verify the rule is selected for representative sources.
2. **Resolver rejection.** Verify the rule is NOT selected for non-matching sources.
3. **Mocked translation.** Verify the output contract shape is correct.
4. **Validation.** Verify the validator accepts well-formed output.
5. **Invalid forms.** Verify malformed output is rejected.

## Adding a new rule

1. Create `compiler/rules/<category>/<capability>.md` following the markdown
   structure above.
2. Create `compiler/rules/<category>/<capability>.json` following the JSON
   schema above.
3. Add resolver tests to `tests/ai.test.js` for positive and negative matching.
4. Add validation tests for the output contract.
5. Run the full test suite: `npm test`.

## Cache invalidation

The translation cache (`~/.plain/ai-cache`) is keyed by:
- Normalized source text
- Rule ID and version
- Compiler version
- Model identifier
- Route (local vs. remote)

Changing any of these produces a new cache key, so stale translations are
never reused. Bump the rule version when semantics change.

## Backward compatibility

- Never remove supported syntax from a shipped rule without a deprecation cycle.
- New syntax additions are backward-compatible by definition.
- If a rule's syntax changes, bump the version and document the change in
  CHANGELOG.md.

## Why arbitrary natural-language fallback is forbidden

The alternative model is:

```
Human sentence → AI guesses intention → code
```

Plain's model is:

```
Defined Plain construct → compiler understands semantics →
  deterministic compilation OR matching Complex Compilation rule →
  validated implementation → executable program
```

The second model is Plain. Complex Compilation makes the implementation
machinery more capable. It does **not** make the language less precise.

If the system accepted "I want to eat you" and tried to compile it, that would
turn Plain into a prompt language. The rule system exists precisely to prevent
this: the language defines what constructs mean, and the compiler implements
that meaning.

## Current rules

| Rule | Category | Version | Async | Dependencies |
|------|----------|---------|-------|--------------|
| `telegram` | bots | 2 | yes | `node-telegram-bot-api` |
| `fetch` | http | 2 | yes | none (global `fetch`) |
| `rest-api` | web | 1 | no | `express` |
| `ws` | websocket | 1 | no | `ws` |
| `cron` | automation | 1 | yes | `node-cron` |
| `email` | communication | 1 | yes | `nodemailer` |
