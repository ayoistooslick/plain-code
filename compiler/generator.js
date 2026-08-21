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
};

// Plain module names whose npm package name differs from the Plain name.
// Used to de-duplicate runtime requires across aliases (RFC-0011 §22).
const NPM_NAME = {
  sqlite: 'better-sqlite3',
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
};

// Set to true while generating inside a route handler body.
// Remaps Plain's "request" → "req" and "response" → "res".
let _inRoute = false;
// True while generating inside a Telegram handler body. Remaps Plain's
// "reply" statement to send a chat message instead of an HTTP response.
let _inTelegram = false;

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

// True when any statement in the block emits `await` (a JavaScript block,
// `ask`, or `ocr`), including inside nested if / loop bodies. Nested Plain
// function declarations are handled independently, so they are not descended
// into.
function containsAsyncBlock(statements) {
  for (const stmt of statements || []) {
    if (stmt.type === 'AskStatement' || stmt.type === 'JavaScriptBlock' || stmt.type === 'OcrStatement') return true;
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
      return `${indent}app.get(${JSON.stringify(node.path)}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
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
      return [emitRequire(context, 'express'), `${indent}const app = express();`]
        .filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    case 'SimpleRouteStatement': {
      _inRoute = true;
      const handlerAsync = containsAsyncBlock(node.body) ? 'async ' : '';
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inRoute = false;
      return `${indent}app.get(${JSON.stringify(node.path)}, ${handlerAsync}(req, res) => {\n${body}\n${indent}});`;
    }

    case 'StartStatement':
      return `${indent}app.listen(${generateExpr(node.port, context)});`;

    // v0.6 — SQLite DX

    case 'DatabaseStatement':
      return [
        emitRequire(context, 'sqlite'),
        `${indent}const db = new Database(${JSON.stringify(node.file)});`,
      ].filter(Boolean).map(line => line.startsWith('const ') ? `${indent}${line}` : line).join('\n');

    case 'QueryStatement':
      return `${indent}db.prepare(\`${node.sql}\`).all();`;

    case 'InsertStatement':
    case 'UpdateStatement':
    case 'DeleteStatement':
      return `${indent}db.prepare(\`${node.sql}\`).run();`;

    case 'ExecuteStatement':
      return `${indent}db.exec(\`${node.sql}\`);`;

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
