# WebSocket

## Capability

WebSocket client and server for real-time bidirectional communication using the
`ws` package.

## Purpose

Let users create WebSocket servers and clients in readable Plain for real-time
features like chat, live updates, notifications, and collaborative editing.

## Supported Plain syntax

### 1. WebSocket server

```plain
remember server as ws server on port 8080

when socket connects
  show "client connected"
  send socket "Welcome!"
done

when socket receives message
  show message
  broadcast message
done

when socket disconnects
  show "client disconnected"
done
```

### 2. WebSocket client

```plain
remember client as ws client to "ws://localhost:8080"

when client receives message
  show message
done

send client "Hello server!"
```

### 3. Named connections

```plain
remember server as ws server on port 8080

when socket connects
  remember id as socket.id
  send socket "Your id: " + id
done

when socket receives message
  broadcast message
done
```

### 4. Error handling

```plain
remember server as ws server on port 8080

when socket connects
  send socket "Welcome!"
done

on server error
  show "Server error: " + error.message
done
```

## Semantic meaning

- `remember server as ws server on port <port>` creates a WebSocket server
  listening on the specified port.
- `when socket connects` registers a handler for new client connections.
- `when socket receives message` registers a handler for incoming messages.
- `when socket disconnects` registers a handler for client disconnections.
- `send socket <value>` sends a message to a specific connected client.
- `broadcast <value>` sends a message to all connected clients.
- `remember client as ws client to "<url>"` connects to a WebSocket server.
- `when client receives message` registers a handler for server messages.
- `send client <value>` sends a message from the client to the server.
- `on server error` registers an error handler for the server.

## JavaScript target

Server:

```js
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket) => {
  console.log("client connected");
  socket.send("Welcome!");

  socket.on("message", (message) => {
    console.log(message.toString());
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message.toString());
      }
    });
  });

  socket.on("close", () => {
    console.log("client disconnected");
  });
});

wss.on("error", (err) => {
  console.error("Server error:", err.message);
});
```

Client:

```js
const WebSocket = require("ws");
const client = new WebSocket("ws://localhost:8080");

client.on("message", (message) => {
  console.log(message.toString());
});

client.on("open", () => {
  client.send("Hello server!");
});
```

## Dependency

- `ws`

## Imports / runtime requirements

- No project imports required by the rule itself.
- `ws` must be installed by the normal dependency system.

## Async behavior

Synchronous. WebSocket setup is event-driven; no top-level await is needed.

## Examples

Server:

```plain
remember server as ws server on port 8080

when socket connects
  send socket "Welcome!"
done

when socket receives message
  show message
done
```

Client:

```plain
remember client as ws client to "ws://localhost:8080"

when client receives message
  show message
done

send client "Hello!"
```

## Invalid forms

- `remember server as ws server` (missing `on port`).
- `remember client as ws client` (missing `to` URL).
- `send socket` or `send client` without a message value.

## Security considerations

- Do not expose WebSocket servers to the public internet without authentication.
- Validate and sanitize all incoming messages.
- Do not send secrets, tokens, or credentials over WebSocket without TLS.

## Expected compiler output

```json
{
  "javascript": "<generated WebSocket code>",
  "dependencies": ["ws"],
  "imports": [],
  "async": false
}
```

## Tests

- `tests/ai.test.js` — resolver selects the `ws` rule for a WebSocket source;
  mocked translation passes validation.
