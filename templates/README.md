# PlainScript real-world starters

These starters are small open-source projects designed to
be copied, modified, and deployed:

| Starter | What it demonstrates |
| --- | --- |
| `messaging-app` | Real-time chat with SQLite, WebSocket, auth, and message history |
| `telegram-support-bot` | Hardcoded commands, regex replies, buttons, and callbacks |
| `groq-telegram-bot` | Groq-backed AI replies alongside deterministic commands |
| `rest-api-service` | JSON routes, validation, and CRUD-shaped state |
| `sqlite-inventory` | Portable SQLite storage and parameterized SQL |
| `webhook-receiver` | Authenticated webhooks and fast acknowledgements |
| `authenticated-api` | API keys, sessions, and signed tokens |
| `document-ocr-api` | Upload limits, MIME allow-lists, and OCR |
| `scheduled-reporting` | Cron scheduling, report generation, and a status route |

From any starter directory:

```bash
npx plainscript check src
npx plainscript build src/app.pln -o dist/app.js
node dist/app.js
```

Every `.pln` entry point is validated against the compiler before release.