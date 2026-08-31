# websocket-chat — PlainScript WebSocket Chat Server (template)

A complete, publish-ready WebSocket chat server template written 100% in PlainScript. Features rooms/channels, user tracking, message broadcasting, and a built-in HTML test client.

## Layout

```
templates/websocket-chat/
├── package.json       # npm package; main → dist/server.js
├── public/
│   └── index.html     # browser test client (open directly or serve statically)
└── src/
    └── server.pln     # WebSocket server implementation
```

## Features

- **WebSocket server** on port 3001 using `websocket server on port`
- **Rooms/channels** — users can join and switch between rooms
- **User tracking** — tracks connected users per room with join/leave notifications
- **Message broadcasting** — broadcasts to all clients (clients filter by room)
- **Connection lifecycle** — handles connect, message, disconnect, error events
- **Graceful error handling** — try/catch around sends, auto-reconnect client
- **Zero runtime deps** — only Node built-ins and plainscript-lang at build time

## Quick Start

```bash
# 1. Install the PlainScript compiler
npm install --save-dev plainscript-lang

# 2. Build the server (src/ → dist/)
plainscript build

# 3. Run the WebSocket server
npm start
# or directly:
node dist/server.js
```

The server starts on **port 3001** (WebSocket endpoint: `ws://localhost:3001`).

### Test with the HTML Client

Open `public/index.html` directly in your browser (double-click it), or serve it with any static server:

```bash
# Using npx serve
npx serve public

# Or Python
cd public && python -m http.server 8080
```

Then open `http://localhost:3000` (or whatever port the static server uses) in multiple tabs to test multi-user chat.

## Development Mode

Run directly from source without building:

```bash
plainscript run src/server.pln
```

## Client Connection Example

### Browser (built-in client)

Open `public/index.html` in multiple browser tabs/windows. Enter a name, pick a room, and start chatting.

### JavaScript / Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // Join a room
  ws.send(JSON.stringify({
    action: 'join',
    payload: { name: 'Alice', room: 'general' }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg);
  
  if (msg.type === 'welcome') {
    userId = msg.userId; // Save for subsequent messages
  }
});

function sendMessage(content) {
  ws.send(JSON.stringify({
    action: 'message',
    payload: { content },
    userId
  }));
}

function switchRoom(roomName) {
  ws.send(JSON.stringify({
    action: 'switch-room',
    payload: { room: roomName },
    userId
  }));
}

// Get list of rooms
ws.send(JSON.stringify({ action: 'get-rooms' }));

// Get users in a room
ws.send(JSON.stringify({
  action: 'get-users',
  payload: { room: 'general' }
}));
```

### Python

```python
import websocket
import json

def on_message(ws, message):
    msg = json.loads(message)
    print(f"Received: {msg}")

def on_open(ws):
    ws.send(json.dumps({
        "action": "join",
        "payload": {"name": "PythonUser", "room": "general"}
    }))

ws = websocket.WebSocketApp("ws://localhost:3001",
                            on_open=on_open,
                            on_message=on_message)
ws.run_forever()
```

## Message Protocol

All messages are JSON with this structure:

### Client → Server

| Action | Payload | Description |
|--------|---------|-------------|
| `join` | `{name, room?}` | Join a room (creates if needed) |
| `message` | `{content}` | Send chat message to current room |
| `switch-room` | `{room}` | Switch to another room |
| `get-rooms` | `{}` | Request list of all rooms |
| `get-users` | `{room?}` | Request users in a room |

### Server → Client

| Type | Fields | Description |
|------|--------|-------------|
| `welcome` | `userId, name, room, users[]` | Sent on successful join |
| `message` | `from, userId, content, room, timestamp` | Chat message from another user |
| `system` | `content, room, users[], timestamp` | Join/leave/disconnect notifications |
| `room-switched` | `room, users[]` | Confirmation of room switch |
| `rooms` | `rooms[{name, userCount}]` | List of all rooms |
| `users` | `room, users[]` | Users in requested room |

**Note:** The server broadcasts all messages to all connected clients. Clients should filter by the `room` field to only display messages for their current room.

## Customization

- **Port**: Change `3001` in `src/server.pln`
- **Room logic**: Modify room creation/user tracking in the `join` handler
- **Message format**: Adjust JSON structures in handlers
- **Auth**: Add token validation in the `join` handler before creating user
- **Persistence**: Add database calls in `message` handler to store history

## Publishing

```bash
npm publish --access public
```

Consumers install with:

```bash
npm install @plainscript/websocket-chat
```

And run with:

```bash
npx websocket-chat
# or
node node_modules/@plainscript/websocket-chat/dist/server.js
```

## License

MIT