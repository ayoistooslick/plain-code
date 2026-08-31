# telegram-bot — PlainScript Telegram Bot Template

A complete, publish-ready Telegram bot template written 100% in PlainScript.
It demonstrates command handlers, inline keyboard callbacks, and hardcoded replies.
No runtime npm packages required (only Node built-ins + `node-fetch` polyfill).

## Layout

```
templates/telegram-bot/
├── package.json     # npm package; main → dist/bot.js
└── src/
    └── bot.pln      # complete bot with commands + callbacks
```

## Prerequisites

- Node.js 18+
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

## Quick Start

```bash
# 1. Go to the template directory
cd templates/telegram-bot

# 2. Install the PlainScript compiler
npm install --save-dev plainscript-lang

# 3. Set your bot token
export BOT_TOKEN="your-telegram-bot-token-here"

# 4. Run in development (compiles + runs)
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/start` | Show main menu with inline keyboard |
| `/help` | List all available commands |
| `/about` | About this bot and PlainScript |
| `/status` | Bot status and server time |
| `/echo <text>` | Echo back your text |
| `/time` | Show current server time |

## Inline Keyboard Buttons

The `/start` command shows an inline keyboard with buttons:
- **Help** → Shows help menu
- **About** → Shows about information
- **Status** → Shows bot status
- **Echo Test** → Explains the echo command

Each callback has a "Back to Menu" button to return to the main menu.

## Build & Run

```bash
# Compile PlainScript → JavaScript (src/ → dist/)
npm run build

# Run compiled bot
npm start

# Development: compile + run in one step
npm run dev
```

## Project Structure

```
src/bot.pln
├── bot env("BOT_TOKEN")                    # Load token from environment
├── when someone sends "/start"             # Command handler
├── when someone sends "/help"
├── when someone sends "/about"
├── when someone sends "/status"
├── when someone sends matching "^/echo (.+)"  # Pattern match
├── when someone sends "/time"
├── when someone clicks "help"              # Callback handlers
├── when someone clicks "about"
├── when someone clicks "status"
├── when someone clicks "echo_demo"
├── when someone clicks "start"
├── when someone sends matching "."         # Fallback handler
└── start telegram bot                      # Begin long polling
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
ENV BOT_TOKEN=""
CMD ["node", "dist/bot.js"]
```

```bash
docker build -t plainscript-telegram-bot .
docker run -e BOT_TOKEN="your-token" plainscript-telegram-bot
```

### PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start dist/bot.js --name telegram-bot --env BOT_TOKEN="your-token"
pm2 save
pm2 startup
```

### systemd Service

```ini
# /etc/systemd/system/telegram-bot.service
[Unit]
Description=PlainScript Telegram Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/telegram-bot
Environment=BOT_TOKEN=your-token
ExecStart=/usr/bin/node dist/bot.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot
```

### Fly.io / Railway / Render

1. Push to GitHub
2. Connect repository
3. Set `BOT_TOKEN` environment variable
4. Build command: `npm run build`
5. Start command: `npm start`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | Telegram Bot API token from @BotFather |

## Customization

### Add New Commands

```plainscript
when someone sends "/mycommand"
    reply "Custom response"
done
```

### Add Pattern Matching

```plainscript
when someone sends matching "^/greet (\w+)"
    reply "Hello, " + ctx.matches[1] + "!"
done
```

### Add New Callback Buttons

```plainscript
// In a reply with buttons block
"New Feature" -> "new_feature"

// Add callback handler
when someone clicks "new_feature"
    reply "New feature activated!"
done
```

## Publishing to npm

```bash
# Update version in package.json
npm version patch

# Build
npm run build

# Publish
npm publish --access public
```

## Example Output

```
/start
→ Welcome to the PlainScript Telegram Bot! 🤖
  [Help] [About] [Status] [Echo Test]

/help
→ Available commands:
  /start - Show main menu
  /help - Show this help
  /about - About this bot
  /status - Bot status
  /echo <text> - Echo back text
  /time - Current server time

/echo Hello World
→ Echo: Hello World

/time
→ 🕐 Current server time: 2026-08-30T12:34:56.789Z
```

## Learn More

- [PlainScript Language Reference](https://github.com/anomalyco/plainscript/blob/main/knowledge.md)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [More Templates](../) — `idverify`, `oauth`

## License

MIT — free to use, modify, and distribute.