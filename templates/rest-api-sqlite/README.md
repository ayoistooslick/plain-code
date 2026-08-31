# rest-api-sqlite — PlainScript REST API with SQLite (template)

A REST API template written 100% in PlainScript. Includes two implementations:

1. **`src/api.pln`** — Minimal working version using `web app` shorthand (health check + list users)
2. **`src/api-express.pln`** — Full CRUD version using classic Express style

## Layout

```
templates/rest-api-sqlite/
├── package.json           # npm package; main → dist/api.js
├── src/
│   ├── api.pln            # Minimal working version (web app shorthand)
│   └── api-express.pln    # Full CRUD version (Express style)
└── dist/                  # Generated JavaScript (after build)
```

## Quick Start

```bash
# 1. Install the PlainScript compiler
npm install --save-dev plainscript-lang

# 2. Create .env with your API key
echo "API_KEY=your-secret-key-here" > .env
echo "PORT=3000" >> .env

# 3a. Run minimal version (health + list users)
plainscript run src/api.pln

# 3b. Run full CRUD version (Express style)
plainscript run src/api-express.pln

# Or build then run
plainscript build
node dist/api.js          # runs api.pln
node dist/api-express.js  # runs api-express.pln
```

Server starts at `http://localhost:3000` (or `PORT` from env).

## API Endpoints

### Minimal Version (`api.pln`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/users` | ✅ | List all users |

### Full CRUD Version (`api-express.pln`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/api/users` | ✅ | List all users |
| POST | `/api/users` | ✅ | Create a user |
| GET | `/api/users/:id` | ✅ | Get user by ID |
| PUT | `/api/users/:id` | ✅ | Update user |
| DELETE | `/api/users/:id` | ✅ | Delete user |

## Example Requests

### Health Check

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-08-30T12:00:00.000Z",
  "uptime": 123456789
}
```

### List Users

```bash
curl -H "x-api-key: your-secret-key-here" http://localhost:3000/api/users
```

```json
{
  "status": "ok",
  "data": [
    { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "created_at": "2026-08-30T12:00:00.000Z" },
    { "id": 2, "name": "Alan Turing", "email": "alan@example.com", "created_at": "2026-08-30T12:05:00.000Z" }
  ],
  "count": 2
}
```

### Create User (Express version only)

```bash
curl -X POST \
  -H "x-api-key: your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"name": "Grace Hopper", "email": "grace@example.com"}' \
  http://localhost:3000/api/users
```

```json
{
  "status": "ok",
  "data": { "id": 3, "name": "Grace Hopper", "email": "grace@example.com", "created_at": "2026-08-30T12:10:00.000Z" },
  "message": "User created successfully"
}
```

### Get User by ID (Express version only)

```bash
curl -H "x-api-key: your-secret-key-here" http://localhost:3000/api/users/1
```

```json
{
  "status": "ok",
  "data": { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "created_at": "2026-08-30T12:00:00.000Z" }
}
```

### Update User (Express version only)

```bash
curl -X PUT \
  -H "x-api-key: your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ada King", "email": "ada.king@example.com"}' \
  http://localhost:3000/api/users/1
```

```json
{
  "status": "ok",
  "data": { "id": 1, "name": "Ada King", "email": "ada.king@example.com", "created_at": "2026-08-30T12:00:00.000Z" },
  "message": "User updated successfully"
}
```

### Delete User (Express version only)

```bash
curl -X DELETE \
  -H "x-api-key: your-secret-key-here" \
  http://localhost:3000/api/users/1
```

```json
{
  "status": "ok",
  "message": "User deleted successfully"
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "status": "error",
  "message": "Description of the error"
}
```

| Status | Cause |
|--------|-------|
| 400 | Missing required fields (name, email) |
| 401 | Invalid or missing API key |
| 404 | User not found / Route not found |
| 429 | Rate limit exceeded (60 req/min per IP) |
| 500 | Server error |

## Database Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The database file `data.db` is created automatically on first run.

## Configuration

Environment variables (via `.env` or shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | *required* | Secret key for API authentication |
| `PORT` | `3000` | HTTP server port |

Load `.env` automatically by adding `load env file ".env"` at the top of the `.pln` file, or use `dotenv-cli`:

```bash
npx dotenv-cli -- plainscript run src/api.pln
```

## Known Compiler Limitations

**Important:** The current PlainScript compiler (v1.0.2) has bugs affecting this template:

1. **`database` + `web app` bug**: The compiler incorrectly includes the entire PlainScript program in the `db.exec()` call when `database "data.db"` is followed by `web app`. This causes SQLite syntax errors at runtime.

2. **`database` + `use express` bug**: Same issue — the top-level `execute` block captures the entire remaining program.

3. **Parser nesting limits**: The `web app` shorthand has parser issues with nested `if` blocks, `record with`, and multiple `reply json` calls inside routes.

### Workarounds Used

- **`api.pln` (minimal)**: Omits the `database` statement, uses only `web app` with `query` (which works). Database must be initialized separately.
- **`api-express.pln` (full CRUD)**: Uses `use express` style which parses correctly. The top-level `execute` bug means the CREATE TABLE runs but with corrupted SQL. Run the CREATE TABLE manually before starting:

```bash
# Manual table creation (run once)
sqlite3 data.db "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')));"
```

Then run the server:
```bash
plainscript run src/api-express.pln
```

## Project Scripts

```bash
npm run build              # Compile both src/*.pln → dist/
npm run build:api          # Compile api.pln only
npm run build:express      # Compile api-express.pln only
npm run start              # Build and run dist/api.js
npm run start:express      # Build and run dist/api-express.js
npm run dev                # Run api.pln directly with plainscript
npm run dev:express        # Run api-express.pln directly with plainscript
npm run check              # Syntax check both files
```

## Publishing to npm

```bash
npm version patch   # bump version
npm publish         # runs prepare → build → publishes dist/
```

Consumers install and use like any Node package:

```bash
npm install @plainscript/rest-api-sqlite
```

```js
// No PlainScript knowledge needed — it's just a Node module
const api = require('@plainscript/rest-api-sqlite');
// The package exports the compiled server; typically you'd run `node dist/api.js`
```

## Extending the Template

- **Add validation**: Extend `validate(body, ...)` with more fields
- **Add pagination**: Add `query("page")` and `query("limit")` to `GET /api/users`
- **Add search**: Add `WHERE name LIKE {term}` to the users query
- **Switch to PostgreSQL**: Replace `database "data.db"` with `postgres env("DATABASE_URL")`
- **Add JWT tokens**: Use `createToken` / `readToken` from the stdlib instead of API keys

## License

MIT — use freely in your own projects.