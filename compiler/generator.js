// Generator: converts a Plain AST into JavaScript source code.

const vm = require('vm');
const { splitPackageSpec } = require('./dependency-detector');

// Known runtime packages and their require() statements.
const KNOWN_PACKAGES = {
  express: `const express = require('express');`,
  sqlite:  `const Database = require('better-sqlite3');`,
  fs:      `const fs = require('fs');`,
  path:    `const path = require('path');`,
  axios:   `const axios = require('axios');`,
  chalk:   `const chalk = require('chalk');`,
  // v2.1.0 — PostgreSQL driver behind the friendly "postgres" name.
  postgres: `const { Pool } = require('pg');`,
};

// Plain module names whose npm package name differs from the Plain name.
// Used to de-duplicate runtime requires across aliases (RFC-0011 §22).
const NPM_NAME = {
  sqlite: 'better-sqlite3',
  postgres: 'pg',
};

// JavaScript reserved words that cannot be used as a const binding name.
const JS_RESERVED = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface',
  'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield',
]);

const BUILTIN_DECLARATIONS = {
  fs: `const fs = require('fs');`,
  crypto: `const crypto = require('crypto');`,
  // v1.1.1 — ask runtime (RFC-0011 §14)
  ask: [
    `const readline = require('readline');`,
    `async function __ask(prompt = '') {`,
    `  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });`,
    `  try {`,
    `    return await new Promise((resolve) => rl.question(prompt, resolve));`,
    `  } finally {`,
    `    rl.close();`,
    `  }`,
    `}`,
  ].join('\n'),
  // v2.0.1 — OCR runtime (tesseract.js). Extracts text from an image file.
  // The worker is created per call and always terminated, so repeated ocr
  // statements do not leak workers.
  ocr: [
    `const { createWorker } = require('tesseract.js');`,
    `async function __ocr(imagePath, lang) {`,
    `  const worker = await createWorker(lang || 'eng');`,
    `  try {`,
    `    const { data } = await worker.recognize(imagePath);`,
    `    return data.text;`,
    `  } finally {`,
    `    await worker.terminate();`,
    `  }`,
    `}`,
  ].join('\n'),
  // v2.1.0 — request validation runtime. Returns the names of required
  // fields whose value is missing (undefined/null/empty string) in data.
  validation: [
    `function __validate(data, fields) {`,
    `  return (fields || []).filter((field) => {`,
    `    const value = data == null ? undefined : data[field];`,
    `    return value === undefined || value === null || value === '';`,
    `  });`,
    `}`,
  ].join('\n'),
  // v2.1.0 — email runtime (nodemailer). One transport per program; sending
  // fails with a teaching error when no transport was configured.
  mailer: [
    `const nodemailer = require('nodemailer');`,
    `let __mailTransport = null;`,
    `function __mailCreate(options) { __mailTransport = nodemailer.createTransport(options); }`,
    `async function __mailSend(options) {`,
    `  if (!__mailTransport) throw new Error('Email: no transport configured. Use "mail transport ... done" before "send mail".');`,
    `  return __mailTransport.sendMail(options);`,
    `}`,
  ].join('\n'),
  // v2.1.0 — cron scheduling runtime (croner). Zero dependencies, validates
  // expressions at registration time.
  scheduler: [
    `const cron = require('croner');`,
  ].join('\n'),
  // v2.1.0 — WebSocket runtime (ws). Standalone server bound to its own port.
  websocket: [
    `const { WebSocketServer } = require('ws');`,
    `function __wsServerCreate(port, handlers) {`,
    `  const server = new WebSocketServer({ port });`,
    `  server.on('connection', (socket) => {`,
    `    if (handlers.connect) handlers.connect(socket);`,
    `    socket.on('message', (raw) => {`,
    `      if (handlers.message) handlers.message(socket, raw.toString());`,
    `    });`,
    `    socket.on('close', () => { if (handlers.disconnect) handlers.disconnect(socket); });`,
    `  });`,
    `  return server;`,
    `}`,
    `function __wsSend(socket, value) {`,
    `  socket.send(typeof value === 'string' ? value : JSON.stringify(value));`,
    `}`,
    `function __wsBroadcast(server, value) {`,
    `  const text = typeof value === 'string' ? value : JSON.stringify(value);`,
    `  for (const client of server.clients) {`,
    `    if (client.readyState === 1) client.send(text);`,
    `  }`,
    `}`,
  ].join('\n'),
  // v2.1.0 — cache runtime (Redis via the redis package). The client is
  // created by the "cache" statement; accessors fail with a teaching error
  // when no cache was configured.
  cache: [
    `let __cache = null;`,
    `function __cacheClient() {`,
    `  if (!__cache) throw new Error('Cache: no cache configured. Add a cache "<redis-url>" statement first.');`,
    `  return __cache;`,
    `}`,
  ].join('\n'),
  // v1.2 — Telegram runtime. Polling-based: no webhook endpoint needed.
  // Exposes `Telegram` (the raw API client) plus a `createTelegramBot(token)`
  // factory that registers handlers and polls getUpdates in a loop. `BOT` is
  // assigned by `bot "<token>"`. The token also falls back to the
  // TELEGRAM_BOT_TOKEN environment variable at call time.
  telegram: [
    `const Telegram = (() => {`,
    `  let token = process.env.TELEGRAM_BOT_TOKEN;`,
    `  const call = async (method, params = {}) => {`,
    `    if (!token) throw new Error('Telegram: TELEGRAM_BOT_TOKEN is not set. Use: bot "YOUR_BOT_TOKEN"');`,
    `    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {`,
    `      method: 'POST',`,
    `      headers: { 'Content-Type': 'application/json' },`,
    `      body: JSON.stringify(params),`,
    `    });`,
    `    const json = await response.json();`,
    `    if (!json.ok) throw new Error('Telegram: ' + method + ' failed: ' + JSON.stringify(json));`,
    `    return json.result;`,
    `  };`,
    `  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`,
    `  const chats = new Map();`,
    `  const handlers = { command: [], pattern: [], callback: [] };`,
    `  const keyboard = (rows) => ({`,
    `    reply_markup: {`,
    `      inline_keyboard: [rows.map(([text, data]) => ({ text, callback_data: data }))],`,
    `    },`,
    `  });`,
    // v2.0.1 — createTelegramBot is defined inside this module so its handler
    // registry (`handlers`) and API transport (`call`, `sleep`) are in scope.
    // Defining it outside made every BOT.onCommand/onPattern/onCallback call
    // throw "ReferenceError: handlers is not defined", so no rendered inline
    // button could ever execute its Plain callback.
    `  async function createTelegramBot(botToken) {`,
    `    const resolved = botToken || process.env.TELEGRAM_BOT_TOKEN;`,
    `    if (!resolved) throw new Error('Telegram: bot token is missing. Use: bot "YOUR_BOT_TOKEN"');`,
    `    token = resolved; // bind the API transport to this bot's credential`,
    `    let offset = 0;`,
    `    const onText = async (chatId, text) => {`,
    `      for (const { matcher, handler } of handlers.pattern) {`,
    `        const match = text.match(matcher);`,
    `        if (match) { await handler({ chatId, text, matches: match }); return; }`,
    `      }`,
    `      const first = text.split(' ')[0];`,
    `      for (const { matcher, handler } of handlers.command) {`,
    `        if (first === matcher) {`,
    `          await handler({ chatId, text, args: text.split(' ').slice(1) });`,
    `          return;`,
    `        }`,
    `      }`,
    `    };`,
    `    const onCallback = async (data, message) => {`,
    `      for (const { matcher, handler } of handlers.callback) {`,
    `        if (data === matcher) {`,
    `          await handler({ data, message, chatId: message.chat.id });`,
    `          return;`,
    `        }`,
    `      }`,
    `    };`,
    `    return {`,
    `      start: async () => {`,
    `        while (true) {`,
    `          let updates;`,
    `          try {`,
    `            updates = await call('getUpdates', { offset, timeout: 30 });`,
    `          } catch (error) {`,
    `            await sleep(3000);`,
    `            continue;`,
    `          }`,
    `          for (const update of updates) {`,
    `            offset = update.update_id + 1;`,
    `            const chat = (update.message || (update.callback_query || {}).message || {}).chat;`,
    `            if (chat) chats.set(chat.id, chat);`,
    `            if (update.message && update.message.text != null) {`,
    `              await onText(update.message.chat.id, update.message.text);`,
    `            } else if (update.callback_query && update.callback_query.data != null) {`,
    `              await onCallback(update.callback_query.data, update.callback_query.message);`,
    `            }`,
    `          }`,
    `        }`,
    `      },`,
    `      onCommand: (matcher, handler) => handlers.command.push({ matcher, handler }),`,
    `      onPattern: (matcher, handler) => handlers.pattern.push({ matcher, handler }),`,
    `      onCallback: (matcher, handler) => handlers.callback.push({ matcher, handler }),`,
    `    };`,
    `  }`,
    `  return {`,
    `    call, chats, handlers, keyboard, createTelegramBot,`,
    `    sendMessage: async (chatId, text, rows) => call('sendMessage', {`,
    `      chat_id: chatId,`,
    `      text: String(text),`,
    `      ...(rows ? keyboard(rows) : {}),`,
    `    }),`,
    `    sendPhoto: async (chatId, photo, caption) => call('sendPhoto', {`,
    `      chat_id: chatId,`,
    `      photo,`,
    `      ...(caption ? { caption } : {}),`,
    `    }),`,
    `    getChat: async (chatId) => call('getChat', { chat_id: chatId }),`,
    `    getMyChats: async () => {`,
    `      const updates = await call('getUpdates', {});`,
    `      for (const update of updates) {`,
    `        const chat = (update.message || update.callback_query || {}).chat;`,
    `        if (chat && !chats.has(chat.id)) chats.set(chat.id, chat);`,
    `      }`,
    `      return [...chats.values()];`,
    `    },`,
    `    editMessage: async (chatId, messageId, text) => call('editMessageText', {`,
    `      chat_id: chatId,`,
    `      message_id: messageId,`,
    `      text: String(text),`,
    `    }),`,
    `  };`,
    `})();`,
    `let BOT;`,
  ].join('\n'),
};

// Built-in stdlib functions: Plain name → JS code generator.
// v0.1–v0.4 original stdlib
const STDLIB = {
  length:    (args, context) => `(${generateExpr(args[0], context)}).length`,
  uppercase: (args, context) => `(${generateExpr(args[0], context)}).toUpperCase()`,
  lowercase: (args, context) => `(${generateExpr(args[0], context)}).toLowerCase()`,
  random:    (_args) => `Math.random()`,
  round:     (args, context)  => `Math.round(${generateExpr(args[0], context)})`,
  // Runtime constructors
  sqlite:    (args, context)  => `new Database(${args.map(arg => generateExpr(arg, context)).join(', ')})`,
  // v0.6 — runtime standard library
  print:      (args, context) => `console.log(${args.map(arg => generateExpr(arg, context)).join(', ')})`,
  readFile:   (args, context) => `fs.readFileSync(${generateExpr(args[0], context)}, 'utf8')`,
  writeFile:  (args, context) => `fs.writeFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)}, 'utf8')`,
  fileExists: (args, context) => `fs.existsSync(${generateExpr(args[0], context)})`,
  read:       (args, context) => `fs.readFileSync(${generateExpr(args[0], context)}, 'utf8')`,
  sleep:      (args, context) => `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${generateExpr(args[0], context)})`,
  time:       (_args) => `Date.now()`,
  date:       (_args) => `new Date().toISOString()`,
  jsonEncode: (args, context) => `JSON.stringify(${generateExpr(args[0], context)})`,
  jsonDecode: (args, context) => `JSON.parse(${generateExpr(args[0], context)})`,
  env:        (args, context) => `process.env[${generateExpr(args[0], context)}]`,
  exit:       (args, context) => `process.exit(${args.length ? generateExpr(args[0], context) : '0'})`,
  uuid:       (_args, context) => `crypto.randomUUID()`,
  // v1.2 — Telegram runtime helpers
  bot:         (args, context) => {
    ensureBuiltin(context, 'telegram');
    if (!context.inFunction) context.needsAsync = true;
    return `BOT = await Telegram.createTelegramBot(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  sendMessage: (args, context) => {
    ensureBuiltin(context, 'telegram');
    return `Telegram.sendMessage(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  sendPhoto:   (args, context) => {
    ensureBuiltin(context, 'telegram');
    return `Telegram.sendPhoto(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  getChat:     (args, context) => {
    ensureBuiltin(context, 'telegram');
    return `Telegram.getChat(${generateExpr(args[0], context)})`;
  },
  getMyChats:  (args, context) => {
    ensureBuiltin(context, 'telegram');
    return `Telegram.getMyChats()`;
  },
  editMessage: (args, context) => {
    ensureBuiltin(context, 'telegram');
    return `Telegram.editMessage(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  // v2.1.0 — HTTP request accessors. Only meaningful inside a route handler,
  // where Express provides req/res.
  param:   (args, context) => routeAccessor('param',   'params',   args, context),
  query:   (args, context) => routeAccessor('query',   'query',    args, context),
  header:  (args, context) => routeAccessor('header',  'headers',  args, context),
  // v2.1.0 — request validation. Returns the list of missing required fields.
  validate: (args, context) => {
    ensureBuiltin(context, 'validation');
    return `__validate(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },

  // ── v2.1.0 — filesystem helpers (sync, matching readFile/writeFile style)

  copyFile:   (args, context) => { ensureBuiltin(context, 'fs'); return `fs.copyFileSync(${args.map(a => generateExpr(a, context)).join(', ')})`; },
  moveFile:   (args, context) => { ensureBuiltin(context, 'fs'); return `fs.renameSync(${args.map(a => generateExpr(a, context)).join(', ')})`; },
  deleteFile: (args, context) => { ensureBuiltin(context, 'fs'); return `fs.unlinkSync(${generateExpr(args[0], context)})`; },
  makeFolder: (args, context) => { ensureBuiltin(context, 'fs'); return `fs.mkdirSync(${generateExpr(args[0], context)}, { recursive: true })`; },
  deleteFolder: (args, context) => { ensureBuiltin(context, 'fs'); return `fs.rmSync(${generateExpr(args[0], context)}, { recursive: true, force: true })`; },
  listFolder: (args, context) => { ensureBuiltin(context, 'fs'); return `fs.readdirSync(${generateExpr(args[0], context)})`; },
  appendFile: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.appendFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)}, 'utf8')`;
  },
  readBytes:  (args, context) => { ensureBuiltin(context, 'fs'); return `fs.readFileSync(${generateExpr(args[0], context)})`; },
  writeBytes: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.writeFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)})`;
  },

  // ── v2.1.0 — text, number and collection helpers

  trim:     (args, context) => `String(${generateExpr(args[0], context)}).trim()`,
  replace:  (args, context) => {
    const [target, from, to] = args;
    return `String(${generateExpr(target, context)}).split(${generateExpr(from, context)}).join(${generateExpr(to, context)})`;
  },
  split:    (args, context) => {
    const sep = args.length > 1 ? generateExpr(args[1], context) : '" "';
    return `String(${generateExpr(args[0], context)}).split(${sep})`;
  },
  join:     (args, context) => `(${generateExpr(args[0], context)}).join(${args.length > 1 ? generateExpr(args[1], context) : '","'})`,
  number:   (args, context) => `Number(${generateExpr(args[0], context)})`,
  text:     (args, context) => `String(${generateExpr(args[0], context)})`,
  floor:    (args, context) => `Math.floor(${generateExpr(args[0], context)})`,
  ceiling:  (args, context) => `Math.ceil(${generateExpr(args[0], context)})`,

  // The shared comparator keeps sorting predictable for both text and
  // numbers without a separate sort call per type.
  sort:     (args, context) => `[...${generateExpr(args[0], context)}].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))`,
  reverse:  (args, context) => `[...${generateExpr(args[0], context)}].reverse()`,
  unique:   (args, context) => `[...new Set(${generateExpr(args[0], context)})]`,
  sum:      (args, context) => `(${generateExpr(args[0], context)}).reduce((a, b) => a + b, 0)`,
  smallest: (args, context) => `Math.min(...${generateExpr(args[0], context)})`,
  largest:  (args, context) => `Math.max(...${generateExpr(args[0], context)})`,

  keys:     (args, context) => `Object.keys(${generateExpr(args[0], context)})`,
  values:   (args, context) => `Object.values(${generateExpr(args[0], context)})`,
  hasKey:   (args, context) => `Object.prototype.hasOwnProperty.call(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)})`,
  merge:    (args, context) => `{ ...${generateExpr(args[0], context)}, ...${generateExpr(args[1], context)} }`,

  // ── v2.1.0 — cache (Redis) accessors. All async.

  cacheGet: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    return `await __cacheClient().get(String(${generateExpr(args[0], context)}))`;
  },
  cacheSet: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    const key = `String(${generateExpr(args[0], context)})`;
    const value = `String(${generateExpr(args[1], context)})`;
    if (args.length > 2) {
      return `await __cacheClient().set(${key}, ${value}, { EX: ${generateExpr(args[2], context)} })`;
    }
    return `await __cacheClient().set(${key}, ${value})`;
  },
  cacheDelete: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    return `await __cacheClient().del(String(${generateExpr(args[0], context)}))`;
  },

  // v2.1.0 — email sending helper (statement form uses this too).
  sendMail: (args, context) => {
    ensureBuiltin(context, 'mailer');
    markAsync(context);
    return `__mailSend(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
};

// Mark the enclosing program async when a call awaits at the top level.
function markAsync(context) {
  if (!context.inFunction) context.needsAsync = true;
}

// v2.1.0 — generate a request accessor (param/query/header). These compile to
// direct Express req.<bucket>[key] reads and are rejected outside routes so
// mistakes surface at compile time with a teaching error.
function routeAccessor(name, bucket, args, context) {
  if (!_inRoute) {
    throw new Error(
      `"${name}(...)" can only be used inside a route handler.\n\nExample:\n  route get "/users/:id"\n    show ${name}("id")\n  done`
    );
  }
  if (args.length !== 1) {
    throw new Error(`"${name}" takes exactly one argument: the ${name} name.\n\nExample:\n  ${name}("id")`);
  }
  return `req.${bucket}[${generateExpr(args[0], context)}]`;
}

// Set to true while generating inside a route handler body.
// Remaps Plain's "request" → "req" and "response" → "res".
let _inRoute = false;
// True while generating inside a Telegram handler body. Remaps Plain's
// "reply" statement to send a chat message instead of an HTTP response.
let _inTelegram = false;
// v2.1.0 — active "group" prefixes. Route paths are prefixed with the
// concatenation of every enclosing group, innermost last.
const _routePrefixes = [];

// v2.1.0 — active SQL driver. "sqlite" (default) targets better-sqlite3's
// synchronous prepare/run/exec API; "pg" targets node-postgres pools and
// makes every SQL statement async. Set by database/postgres declarations.
let _sqlDriver = 'sqlite';
// The object SQL statements call. "db" normally; a checked-out pool client
// while generating inside a PostgreSQL transaction.
let _sqlClientVar = 'db';

// Full path for a route, honouring enclosing group prefixes.
function routePath(path) {
  return _routePrefixes.join('') + path;
}

// v2.1.0 — render the JavaScript expression that executes one SQL statement
// under the active driver. kind: query | write | execute.
function emitSqlCall(kind, sql, params, indent, context) {
  const args = params.join(', ');
  if (_sqlDriver === 'pg') {
    // Convert the parser's anonymous "?" markers to PostgreSQL "$n" markers.
    // Only the markers we produced are converted; literal question marks in
    // the SQL survive untouched.
    let n = 0;
    const pgSql = String(sql).replace(/\?/g, () => (++n <= params.length ? `$${n}` : '?'));
    const call = `${_sqlClientVar}.query(\`${pgSql}\`, [${args}])`;
    return kind === 'query' ? `(await ${call}).rows` : `await ${call}`;
  }
  switch (kind) {
    case 'query':   return `db.prepare(\`${sql}\`).all(${args})`;
    case 'write':   return `db.prepare(\`${sql}\`).run(${args})`;
    case 'execute': return `db.exec(\`${sql}\`)`;
    default: throw new Error(`Unknown SQL kind "${kind}".`);
  }
}

function createGenerationContext() {
  return {
    requires: new Set(),
    pendingPrelude: [],
    needsAsync: false, // true when top-level code emits await (js blocks / ask)
    inFunction: false, // true while generating inside a function-like scope
  };
}

// Wraps a generated program so top-level `await` is legal (RFC-0011 §10).
function wrapAsync(js) {
  return `(async () => {\n${js}\n})();`;
}

function isValidIdentifier(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !JS_RESERVED.has(name);
}

function npmPackageName(moduleName) {
  return NPM_NAME[moduleName] || moduleName;
}

function emitRequire(context, moduleName, alias) {
  // A specifier may carry a version range ("left-pad@^1.3.0"). require() takes
  // the bare name only — the range is the installer's business (plain install).
  const { name: bareName } = splitPackageSpec(moduleName);
  const npmName = npmPackageName(bareName);

  if (alias) {
    if (!isValidIdentifier(alias)) {
      throw new Error(
        `use ${npmName} as ${alias}: "${alias}" is not a valid JavaScript variable name.`
      );
    }
    const known = KNOWN_PACKAGES[bareName];
    if (known) {
      const boundAs = known.match(/const (\w+)/)[1];
      throw new Error(
        `"${bareName}" is part of Plain's built-in runtime and is already available as "${boundAs}". Remove "as ${alias}".`
      );
    }
    const key = `${npmName}\0${alias}`;
    if (context.requires.has(key)) return '';
    context.requires.add(key);
    return `const ${alias} = require('${npmName}');`;
  }

  if (context.requires.has(npmName)) return '';
  context.requires.add(npmName);

  if (KNOWN_PACKAGES[bareName]) return KNOWN_PACKAGES[bareName];

  // RFC-0011 §5.1 — arbitrary npm packages. A name that is not a valid JS
  // identifier (e.g. node-fetch) is required for its side effect only.
  if (isValidIdentifier(bareName)) {
    return `const ${bareName} = require('${npmName}');`;
  }
  return `require('${npmName}');`;
}

function ensureBuiltin(context, moduleName) {
  if (context.requires.has(moduleName)) return;
  context.requires.add(moduleName);
  const declaration = BUILTIN_DECLARATIONS[moduleName];
  if (declaration && !context.pendingPrelude.includes(declaration)) {
    context.pendingPrelude.push(declaration);
  }
}

// Builtins whose calls await. A statement containing one of these anywhere in
// its expressions must compile into an async context.
const ASYNC_CALL_NAMES = new Set([
  // v2.1.0 — cache and email
  'cacheGet', 'cacheSet', 'cacheDelete', 'sendMail',
  // v1.2 — Telegram helpers (await their API transport)
  'bot', 'sendMessage', 'sendPhoto', 'editMessage', 'getChat', 'getMyChats',
]);

// Collect async builtin call names reachable from an AST fragment.
function findAsyncCalls(node, found) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) findAsyncCalls(item, found);
    return found;
  }
  if (node.type === 'CallExpression' && ASYNC_CALL_NAMES.has(node.name)) {
    found.add(node.name);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') findAsyncCalls(value, found);
  }
  return found;
}

// True when any statement in the block emits `await` (a JavaScript block,
// `ask`, or `ocr`), including inside nested if / loop bodies. Nested Plain
// function declarations are handled independently, so they are not descended
// into.
function containsAsyncBlock(statements) {
  for (const stmt of statements || []) {
    if (stmt.type === 'AskStatement' || stmt.type === 'JavaScriptBlock' || stmt.type === 'OcrStatement') return true;
    // v2.1.0 — transactions always await; PostgreSQL SQL statements await;
    // mail sends, cache setup and websocket handlers await.
    if (stmt.type === 'TransactionStatement') return true;
    if (stmt.type === 'SendMailStatement' || stmt.type === 'CacheStatement') return true;
    if (_sqlDriver === 'pg' && (
      stmt.type === 'QueryStatement' || stmt.type === 'InsertStatement' ||
      stmt.type === 'UpdateStatement' || stmt.type === 'DeleteStatement' ||
      stmt.type === 'ExecuteStatement' || stmt.type === 'RememberSqlStatement'
    )) return true;
    if (findAsyncCalls(stmt, new Set()).size > 0) return true;
    if (stmt.type === 'IfStatement') {
      if (containsAsyncBlock(stmt.consequent)) return true;
      if (stmt.alternate && containsAsyncBlock(stmt.alternate)) return true;
    } else if (stmt.type !== 'FunctionDeclaration' && stmt.body) {
      if (containsAsyncBlock(stmt.body)) return true;
    }
  }
  return false;
}

function generate(ast, context = createGenerationContext()) {
  if (ast.type !== 'Program') {
    throw new Error(`Expected a Program node but got "${ast.type}".`);
  }
  const preludeStart = context.pendingPrelude.length;
  const body = ast.body.map(node => generateStatement(node, '', context)).filter(Boolean).join('\n');
  return context.pendingPrelude.slice(preludeStart).concat(body).filter(Boolean).join('\n');
}

// ── Condition generation ────────────────────────────────────────────────────

function generateCondition(cond, context) {
  switch (cond.type) {
    case 'BinaryCondition':
      return `${generateExpr(cond.left, context)} ${cond.op} ${generateExpr(cond.right, context)}`;

    case 'UnaryCondition':
      if (cond.op === 'isEmpty')    return `(${generateExpr(cond.left, context)}).length === 0`;
      if (cond.op === 'isNotEmpty') return `(${generateExpr(cond.left, context)}).length > 0`;
      throw new Error(`Unknown unary condition op "${cond.op}".`);

    case 'BetweenCondition': {
      const expr = generateExpr(cond.left, context);
      return `${expr} >= ${generateExpr(cond.low, context)} && ${expr} <= ${generateExpr(cond.high, context)}`;
    }

    case 'StringCondition':
      return `(${generateExpr(cond.left, context)}).${cond.method}(${generateExpr(cond.right, context)})`;

    default:
      throw new Error(`Unknown condition type "${cond.type}".`);
  }
}

// ── Statement generation ────────────────────────────────────────────────────

function generateStatement(node, indent = '', context = createGenerationContext()) {
  switch (node.type) {
    case 'RememberStatement':
      return `${indent}let ${node.name} = ${generateExpr(node.value, context)};`;

    case 'ShowStatement':
      return `${indent}console.log(${generateExpr(node.value, context)});`;

    case 'GiveStatement':
      return `${indent}return ${generateExpr(node.value, context)};`;

    case 'BecomeStatement':
      return `${indent}${generateLValue(node.target, context)} = ${generateExpr(node.value, context)};`;

    case 'ExpressionStatement':
      return `${indent}${generateExpr(node.expression, context)};`;

    case 'ImportStatement':
      return ''; // resolved at bundle time by the bundler

    case 'UseStatement': {
      const pkg = emitRequire(context, node.module, node.alias);
      return pkg ? `${indent}${pkg}` : '';
    }

    // v1.1.1 — JavaScript Gateway (RFC-0011)

    // remember <name> as javascript … done   (named — always produces a value)
    // javascript … done                      (statement-level block)
    case 'JavaScriptBlock': {
      // Validate the raw JavaScript at compile time so JS syntax errors are
      // reported as such, with the Plain context that produced them.
      try {
        new vm.Script(`(async () => {\n${node.body}\n})`);
      } catch (e) {
        const label = node.name ? `assigned to "${node.name}"` : 'block';
        throw new Error(
          `JavaScript error inside the "javascript" ${label}: ${e.message}`
        );
      }
      // Does the body use top-level `await`? Top-level await only parses
      // inside an async function, so a plain Script rejects it. Synchronous
      // statement-level blocks need no wrapper; async ones do.
      let hasTopLevelAwait = false;
      try {
        new vm.Script(node.body);
      } catch (_) {
        hasTopLevelAwait = true;
      }
      // Named blocks always bind a value, so they keep the async IIFE. The
      // body is emitted verbatim: JavaScript indentation, template literals,
      // and line structure are preserved as written (RFC-0011 §31).
      if (node.name) {
        if (!context.inFunction) context.needsAsync = true;
        return `${indent}let ${node.name} = await (async () => {\n${node.body}\n${indent}})();`;
      }
      // Statement-level blocks inside functions/routes/loops, or that need
      // top-level await, retain the async-context wrapper.
      if (context.inFunction || hasTopLevelAwait) {
        if (!context.inFunction) context.needsAsync = true;
        return `${indent}await (async () => {\n${node.body}\n${indent}})();`;
      }
      // Synchronous statement-level block: emit its body directly/verbatim.
      return `${indent}${node.body}`;
    }

    // ask name  /  ask "<prompt>" as name
    case 'AskStatement': {
      ensureBuiltin(context, 'ask');
      if (!context.inFunction) context.needsAsync = true;
      const prompt = node.prompt != null ? JSON.stringify(node.prompt) : '"> "';
      return `${indent}let ${node.variable} = await __ask(${prompt});`;
    }

    // v2.0.1 — ocr "<image>" as <variable> [using "<lang>"]
    case 'OcrStatement': {
      ensureBuiltin(context, 'ocr');
      if (!context.inFunction) context.needsAsync = true;
      const image = generateExpr(node.image, context);
      const langArg = node.lang != null ? `, ${JSON.stringify(node.lang)}` : '';
      return `${indent}let ${node.variable} = await __ocr(${image}${langArg});`;
    }

    case 'FunctionDeclaration': {
      const isAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const params = node.params.join(', ');
      const prevInFunction = context.inFunction;
      context.inFunction = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      context.inFunction = prevInFunction;
      return `${indent}${isAsync}function ${node.name}(${params}) {\n${body}\n${indent}}`;
    }

    case 'IfStatement': {
      const condition  = generateCondition(node.condition, context);
      const consequent = node.consequent.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      let out = `${indent}if (${condition}) {\n${consequent}\n${indent}}`;
      if (node.alternate) {
        const alternate = node.alternate.map(s => generateStatement(s, indent + '  ', context)).join('\n');
        out += ` else {\n${alternate}\n${indent}}`;
      }
      return out;
    }

    case 'ForEachStatement': {
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}for (const ${node.item} of ${generateExpr(node.collection, context)}) {\n${body}\n${indent}}`;
    }

    case 'WhileStatement': {
      const condition = generateCondition(node.condition, context);
      const body      = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}while (${condition}) {\n${body}\n${indent}}`;
    }

    // v0.3 — Express runtime

    case 'ListenStatement': {
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}app.listen(${generateExpr(node.port, context)}, ${handlerAsync}() => {\n${body}\n${indent}});`;
    }

    case 'RouteStatement': {
      _inRoute = true;
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(routePath(node.path))}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
    }

    case 'ReplyStatement':
      if (_inTelegram) {
        return `${indent}await Telegram.sendMessage(ctx.chatId, ${generateExpr(node.value, context)});`;
      }
      return `${indent}res.send(${generateExpr(node.value, context)});`;

    case 'ReplyJsonStatement': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      if (_inTelegram) {
        return `${indent}await Telegram.sendMessage(ctx.chatId, JSON.stringify({ ${props} }));`;
      }
      return `${indent}res.json({ ${props} });`;
    }

    // v1.2 — reply <value> with buttons … done (Telegram inline keyboard).
    // The AST stores rows of { text, data } objects (parser.js). The Telegram
    // runtime's keyboard() expects a flat list of [text, data] pairs, so each
    // button is rendered as [text, data] and rows are merged into that list.
    case 'ReplyWithButtonsStatement': {
      ensureBuiltin(context, 'telegram');
      const pairs = node.buttons.flat().map(({ text, data }) => [text, data]);
      return `${indent}await Telegram.sendMessage(ctx.chatId, ${generateExpr(node.value, context)}, ${JSON.stringify(pairs)});`;
    }

    case 'ServeFolderStatement':
      return `${indent}app.use(express.static(${JSON.stringify(node.folder)}));`;

    // v0.6 — Express DX

    case 'WebAppStatement':
      return [
        emitRequire(context, 'express'),
        `${indent}const app = express();`,
        // v2.1.0 — parse JSON request bodies so POST/PUT handlers can read
        // "body of request". Harmless for GET-only v2.0.1 programs.
        `${indent}app.use(express.json());`,
      ]
        .filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    case 'SimpleRouteStatement': {
      _inRoute = true;
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.${node.method}(${JSON.stringify(routePath(node.path))}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
    }

    // v2.1.0 — group "<prefix>" ... done: composes routes under a shared
    // prefix. Groups nest; every enclosed route (either form) gets the
    // concatenated prefix. Non-route statements run in program order.
    case 'GroupStatement': {
      _routePrefixes.push(node.prefix);
      const body = node.body.map(s => generateStatement(s, indent, context)).join('\n');
      _routePrefixes.pop();
      return body;
    }

    // v2.1.0 — status <expr>: sets the HTTP response status code. Only valid
    // inside a route handler (res is in scope there).
    case 'StatusStatement':
      if (!_inRoute) {
        throw new Error('"status" can only be used inside a route handler, where a response exists.\n\nExample:\n  route get "/missing"\n    status 404\n    reply "Not found"\n  done');
      }
      return `${indent}res.status(${generateExpr(node.value, context)});`;

    // v2.1.0 — allow cors: enables cross-origin requests on the current app.
    // Applies to routes registered after this statement.
    case 'AllowCorsStatement':
      return [
        `${indent}app.use((req, res, next) => {`,
        `${indent}  res.header('Access-Control-Allow-Origin', '*');`,
        `${indent}  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');`,
        `${indent}  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');`,
        `${indent}  if (req.method === 'OPTIONS') return res.sendStatus(204);`,
        `${indent}  next();`,
        `${indent}});`,
      ].join('\n');

    case 'StartStatement':
      return `${indent}app.listen(${generateExpr(node.port, context)});`;

    // v0.6 — SQLite DX. v2.1.0 adds parameterized SQL, captured results and
    // transactions; the driver switches to PostgreSQL when a "postgres"
    // declaration is active.

    case 'DatabaseStatement':
      _sqlDriver = 'sqlite';
      _sqlClientVar = 'db';
      return [
        emitRequire(context, 'sqlite'),
        `${indent}const db = new Database(${JSON.stringify(node.file)});`,
      ].filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    // v2.1.0 — postgres "<connection>": node-postgres pool bound to "db".
    // Every SQL statement afterwards compiles to async pool queries.
    case 'PostgresStatement': {
      _sqlDriver = 'pg';
      _sqlClientVar = 'db';
      if (!context.inFunction) context.needsAsync = true;
      return [
        emitRequire(context, 'postgres'),
        `${indent}const db = new Pool({ connectionString: ${generateExpr(node.connection, context)} });`,
      ].filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');
    }

    case 'QueryStatement':
      return `${indent}${emitSqlCall('query', node.sql, node.params, indent, context)};`;

    case 'InsertStatement':
    case 'UpdateStatement':
    case 'DeleteStatement':
      return `${indent}${emitSqlCall('write', node.sql, node.params, indent, context)};`;

    case 'ExecuteStatement':
      return `${indent}${emitSqlCall('execute', node.sql, node.params, indent, context)};`;

    // v2.1.0 — remember <name> as query|insert|update|delete … done
    case 'RememberSqlStatement': {
      const kind = node.kind === 'query' ? 'query'
        : node.kind === 'execute' ? 'execute' : 'write';
      return `${indent}let ${node.name} = ${emitSqlCall(kind, node.sql, node.params, indent, context)};`;
    }

    // v2.1.0 — transaction … done: all enclosed database statements run
    // atomically (all succeed or none are applied).
    case 'TransactionStatement': {
      if (_sqlDriver === 'pg') {
        const prevClient = _sqlClientVar;
        _sqlClientVar = '__txClient';
        if (!context.inFunction) context.needsAsync = true;
        const body = node.body.map(s => generateStatement(s, indent + '      ', context)).join('\n');
        _sqlClientVar = prevClient;
        return [
          `${indent}{`,
          `${indent}  const __txClient = await db.connect();`,
          `${indent}  try {`,
          `${indent}    await __txClient.query('BEGIN');`,
          `${indent}    try {`,
          body,
          `${indent}      await __txClient.query('COMMIT');`,
          `${indent}    } catch (__txError) {`,
          `${indent}      await __txClient.query('ROLLBACK');`,
          `${indent}      throw __txError;`,
          `${indent}    }`,
          `${indent}  } finally {`,
          `${indent}    __txClient.release();`,
          `${indent}  }`,
          `${indent}}`,
        ].join('\n');
      }
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return [
        `${indent}(db.transaction(() => {`,
        body,
        `${indent}}))();`,
      ].join('\n');
    }

    // v1.2 — Telegram statements

    case 'TelegramCommandStatement': {
      ensureBuiltin(context, 'telegram');
      if (!context.inFunction) context.needsAsync = true;
      _inTelegram = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inTelegram = false;
      if (node.isPattern) {
        return `${indent}BOT.onPattern(new RegExp(${JSON.stringify(node.command)}, 'i'), async (ctx) => {\n${body}\n${indent}});`;
      }
      return `${indent}BOT.onCommand(${JSON.stringify(node.command)}, async (ctx) => {\n${body}\n${indent}});`;
    }

    case 'TelegramCallbackStatement': {
      ensureBuiltin(context, 'telegram');
      if (!context.inFunction) context.needsAsync = true;
      _inTelegram = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inTelegram = false;
      return `${indent}BOT.onCallback(${JSON.stringify(node.data)}, async (ctx) => {\n${body}\n${indent}});`;
    }

    case 'TelegramStartStatement': {
      ensureBuiltin(context, 'telegram');
      if (!context.inFunction) context.needsAsync = true;
      return `${indent}await BOT.start();`;
    }

    // v2.1.0 — mail, cache, scheduling, background jobs, websocket

    case 'MailTransportStatement': {
      ensureBuiltin(context, 'mailer');
      const options = {};
      let user = null;
      let pass = null;
      for (const { key, value } of node.options) {
        if (key === 'user') { user = generateExpr(value, context); continue; }
        if (key === 'pass') { pass = generateExpr(value, context); continue; }
        options[key] = generateExpr(value, context);
      }
      if (user != null || pass != null) {
        const pair = [
          user != null ? `user: ${user}` : null,
          pass != null ? `pass: ${pass}` : null,
        ].filter(Boolean).join(', ');
        options.auth = `{ ${pair} }`;
      }
      const parts = Object.entries(options)
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
        .join(', ');
      return `${indent}__mailCreate({ ${parts} });`;
    }

    case 'SendMailStatement': {
      ensureBuiltin(context, 'mailer');
      markAsync(context);
      const fields = node.fields
        .map(f => `${JSON.stringify(f.key)}: ${generateExpr(f.value, context)}`)
        .join(', ');
      return `${indent}await __mailSend({ ${fields} });`;
    }

    // cache "<redis-url>" — connects the shared Redis client. At the top
    // level the connect is awaited in program order; inside functions it is
    // connected fire-and-forget.
    case 'CacheStatement': {
      ensureBuiltin(context, 'cache');
      markAsync(context);
      const url = generateExpr(node.url, context);
      const lines = [
        `${indent}{`,
        `${indent}  const { createClient } = require('redis');`,
        `${indent}  __cache = createClient({ url: ${url} });`,
        `${indent}  __cache.on('error', (error) => console.error('Cache error:', error.message));`,
      ];
      if (context.inFunction) {
        lines.push(`${indent}  __cache.connect().catch((error) => console.error('Cache error:', error.message));`);
        lines.push(`${indent}}`);
      } else {
        lines.push(`${indent}  await __cache.connect();`);
        lines.push(`${indent}}`);
      }
      return lines.join('\n');
    }

    case 'EveryStatement': {
      const body = node.body.map(s => generateStatement(s, indent + '    ', context)).join('\n');
      return [
        `${indent}setInterval(async () => {`,
        `${indent}  try {`,
        body,
        `${indent}  } catch (error) { console.error(error); }`,
        `${indent}}, ${node.count * node.unit});`,
      ].join('\n');
    }

    case 'ScheduleStatement': {
      ensureBuiltin(context, 'scheduler');
      const body = node.body.map(s => generateStatement(s, indent + '    ', context)).join('\n');
      return [
        `${indent}cron.schedule(${JSON.stringify(node.expression)}, async () => {`,
        `${indent}  try {`,
        body,
        `${indent}  } catch (error) { console.error(error); }`,
        `${indent}});`,
      ].join('\n');
    }

    case 'RunBackgroundStatement':
      return [
        `${indent}setImmediate(() => {`,
        `${indent}  try {`,
        `${indent}    Promise.resolve(${generateExpr(node.call, context)}).catch((error) => console.error(error));`,
        `${indent}  } catch (error) { console.error(error); }`,
        `${indent}});`,
      ].join('\n');

    case 'WebSocketServerStatement': {
      ensureBuiltin(context, 'websocket');
      const handler = (name, params, body) => {
        if (!body) return '';
        const js = body.map(s => generateStatement(s, indent + '    ', context)).join('\n');
        return `\n${indent}  ${name}: async (${params}) => {\n${js}\n${indent}  },`;
      };
      return [
        `${indent}const __wsServer = __wsServerCreate(${generateExpr(node.port, context)}, {` +
          handler('connect', 'socket', node.connectBody) +
          handler('message', 'socket, message', node.messageBody) +
          handler('disconnect', 'socket', node.disconnectBody),
        `${indent}});`,
      ].join('\n');
    }

    case 'SendSocketStatement':
      ensureBuiltin(context, 'websocket');
      return `${indent}__wsSend(socket, ${generateExpr(node.value, context)});`;

    case 'BroadcastStatement':
      ensureBuiltin(context, 'websocket');
      return `${indent}__wsBroadcast(__wsServer, ${generateExpr(node.value, context)});`;

    default:
      throw new Error(`Unknown statement type "${node.type}".`);
  }
}

// Generates a valid JS assignment target (left-hand side of =).
function generateLValue(node, context) {
  if (node.type === 'Identifier')       return node.name;
  if (node.type === 'IndexExpression')  return `${generateExpr(node.object, context)}[${generateExpr(node.index, context)}]`;
  if (node.type === 'MemberExpression') return `${generateExpr(node.object, context)}.${node.property}`;
  if (node.type === 'OfExpression')     return `${generateExpr(node.object, context)}.${generateExpr(node.property, context)}`;
  if (node.type === 'FirstItem')        return `${generateExpr(node.collection, context)}[0]`;
  if (node.type === 'NumberedItem')     return `${generateExpr(node.collection, context)}[${node.index}]`;
  if (node.type === 'LastItem')         return `${generateExpr(node.collection, context)}[${generateExpr(node.collection, context)}.length - 1]`;
  throw new Error(`Invalid assignment target "${node.type}".`);
}

function generateExpr(node, context = createGenerationContext()) {
  switch (node.type) {
    case 'StringLiteral':    return JSON.stringify(node.value);
    case 'NumberLiteral':    return String(node.value);

    // Backtick template literal: emit as a JavaScript template literal.
    // Content is preserved verbatim (interpolation, whitespace, line breaks).
    // Only literal backtick characters inside the content need escaping.
    case 'TemplateLiteral': {
      const escaped = node.value.replace(/`/g, '\\`');
      return '`' + escaped + '`';
    }

    case 'Identifier': {
      // Inside route handlers, remap Plain's request/response to req/res
      if (_inRoute && node.name === 'request')  return 'req';
      if (_inRoute && node.name === 'response') return 'res';
      return node.name;
    }

    case 'BinaryExpression': return `${generateExpr(node.left, context)} ${node.operator} ${generateExpr(node.right, context)}`;

    case 'ArrayLiteral':
      return `[${node.elements.map(element => generateExpr(element, context)).join(', ')}]`;

    case 'ObjectLiteral': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      return `{ ${props} }`;
    }

    // v1.2 — Inline object literal: { key: value, ... }
    case 'InlineObjectLiteral': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      return `{ ${props} }`;
    }

    case 'IndexExpression':
      return `${generateExpr(node.object, context)}[${generateExpr(node.index, context)}]`;

    case 'MemberExpression':
      return `${generateExpr(node.object, context)}.${node.property}`;

    case 'CallExpression': {
      if (STDLIB[node.name]) {
        if (node.name === 'readFile' || node.name === 'writeFile' ||
            node.name === 'fileExists' || node.name === 'read') {
          ensureBuiltin(context, 'fs');
        } else if (node.name === 'uuid') {
          ensureBuiltin(context, 'crypto');
        }
        return STDLIB[node.name](node.args, context);
      }
      return `${node.name}(${node.args.map(arg => generateExpr(arg, context)).join(', ')})`;
    }

    // v1.1 — Item expressions
    case 'FirstItem':
      return `${generateExpr(node.collection, context)}[0]`;

    case 'LastItem':
      return `${generateExpr(node.collection, context)}[${generateExpr(node.collection, context)}.length - 1]`;

    case 'NumberedItem':
      return `${generateExpr(node.collection, context)}[${node.index}]`;

    case 'LengthExpression':
      return `${generateExpr(node.object, context)}.length`;

    // v1.1 — Property access
    case 'OfExpression':
      return `${generateExpr(node.object, context)}.${generateExpr(node.property, context)}`;

    // v1.1 — Collection operations
    case 'AddCall':
      return `${generateExpr(node.collection, context)}.push(${generateExpr(node.value, context)})`;

    case 'RemoveCall':
      return `${generateExpr(node.collection, context)}.splice(${generateExpr(node.collection, context)}.indexOf(${generateExpr(node.value, context)}), 1)`;

    case 'WriteCall':
      ensureBuiltin(context, 'fs');
      return `fs.writeFileSync(${generateExpr(node.data, context)}, ${generateExpr(node.file, context)}, 'utf8')`;

    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate, createGenerationContext, wrapAsync };
