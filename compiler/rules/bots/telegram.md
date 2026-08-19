# Telegram Bot

## Capability

Telegram bot creation and message handling using `node-telegram-bot-api`.

## Purpose

Let users write a working Telegram bot in readable Plain without dropping into a
JavaScript Gateway block. Covers bot creation, polling, commands, replies,
buttons (inline keyboards), callback queries, and basic error handling.

## Supported Plain syntax

### 1. Create a bot

```plain
remember bot as telegram bot with token
```

`token` may be an expression, e.g. `env("BOT_TOKEN")`. The actual token value
is a runtime value and must never be sent to the AI provider.

### 2. Command handler

```plain
when someone sends "/start"
  reply "Hello from Plain!"
done
```

The command string is a regex-anchored command (e.g. `/start`). The body runs
when a message with that command arrives.

### 3. Message pattern handler

```plain
when someone sends "hello"
  reply "Hi there!"
done
```

A non-`/` string is treated as a case-insensitive pattern.

### 4. Reply with buttons

```plain
when someone sends "/menu"
  reply "Pick an option:" with buttons
    "Option A"
    "Option B"
  done
done
```

Blank lines start a new button row; `done` closes the button block and the
handler body.

### 5. Callback query

```plain
when someone clicks "option_a"
  reply "You picked A"
done
```

### 6. Send messages, photos, and edit from handlers

```plain
remember chatId as ctx.chatId

when someone sends "/photo"
  sendPhoto chatId "photo.jpg"
  sendMessage chatId "Here you go!"
done

when someone sends "/edit"
  editMessage chatId 42 "Changed!"
done
```

Inside a handler, `ctx` is the Telegram context: `ctx.chatId`, `ctx.message`,
`ctx.from`, and `ctx.data` (for callback queries).

### 7. Bot lifecycle

```plain
when someone sends "/start"
  ...
done

start telegram bot
```

`start telegram bot` begins polling. Without it the bot is created but not
started.

## Semantic meaning

- `remember bot as telegram bot with token` creates a `Bot` instance
  configured for long polling and binds it to `bot`.
- `when someone sends "<cmd>"` registers a handler for that command/pattern.
- `when someone clicks "<data>"` registers a callback-query handler.
- `reply` sends a text message to the current chat.
- `sendMessage`/`sendPhoto` send to an explicit chat.
- `editMessage` edits an existing message.
- `start telegram bot` starts polling and keeps the process alive.

## JavaScript target

The translator must follow this shape (library-level, not the Plain runtime
prelude). The installed `node-telegram-bot-api` v2.x exports `Bot`, not
the old `TelegramBot` constructor:

```js
const { Bot } = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");

const bot = new Bot(token);

bot.command("start", (ctx) => {
  return ctx.reply("Hello from Plain!");
});

bot.on("message", (ctx) => {
  console.log("Received:", ctx.message?.text);
});

bot.on("callback_query", (ctx) => {
  if (ctx.data === "option_a") {
    return ctx.reply("You picked A");
  }
});

bot.startPolling().catch((err) => {
  console.error("Polling failed:", err);
});
```

Key differences from the old API (v1.x):
- Constructor: `new Bot(token)` — not `new TelegramBot(token, { polling: true })`
- Commands: `bot.command("name", handler)` — not `bot.onText(/regex/, handler)`
- Messages: `bot.on("message", handler)` — context has `ctx.message`, `ctx.reply()`
- Polling: `bot.startPolling()` returns a Promise — call it explicitly
- Errors: catch polling errors with `.catch()` on `startPolling()`

## Dependency

- `node-telegram-bot-api`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `node-telegram-bot-api` must be installed by the normal dependency system
  (`plain install` / `plain run`).

## Async behavior

Async. Every generated handler body must be an `async` function and every
Telegram call that returns a Promise must be awaited.

## Examples

See `docs/` and the README Telegram example:

```plain
remember token as env("BOT_TOKEN")

remember bot as telegram bot with token

when someone sends "/start"
  reply "Hello from Plain!"
done
```

## Invalid forms

- `remember bot as telegram bot` (missing `with token`).
- Reusing a handler `when someone sends` without a bot created first.
- `reply` outside a Telegram handler without an explicit `ctx`/chatId.
- Passing the raw token literal into `sendMessage`/`editMessage` positions.

## Security considerations

- Never embed a bot token literal in generated code when the user wrote
  `env("BOT_TOKEN")`; keep it a runtime environment lookup.
- Treat incoming messages as untrusted; do not interpolate message text into
  code or shell commands.
- Do not send tokens, chat histories, or other secrets to the AI provider.

## Expected compiler output

The translator returns the structured output contract (RFC-0020 §12):

```json
{
  "javascript": "<generated bot code>",
  "dependencies": ["node-telegram-bot-api"],
  "imports": [],
  "async": true
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `telegram` rule for a Telegram
  source; the mocked translator returns valid JS matching the target shape; the
  validator accepts it and rejects malformed output.
- `tests/telegram.test.js` — deterministic telegram constructs (parser +
  generator) remain regression-tested.
