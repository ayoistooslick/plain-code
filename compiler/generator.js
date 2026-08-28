// Generator: converts a PlainScript AST into JavaScript source code.

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

// PlainScript module names whose npm package name differs from the PlainScript name.
// Used to de-duplicate runtime requires across aliases (RFC-0011 §22).
const NPM_NAME = {
  sqlite: 'better-sqlite3',
  postgres: 'pg',
  // v2.1.1 — portable WebAssembly SQLite engine used by the "database"
  // statement as an automatic fallback (or explicit choice) when
  // better-sqlite3's native binding is unavailable.
  'wasm-sqlite': 'sql.js',
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
  path: `const path = require('path');`,
  crypto: `const crypto = require('crypto');`,
  // v1.0.1 — env-file runtime. Applies KEY=VALUE pairs from a .env file to
  // process.env. Blank lines and `#` comment lines are skipped.
  dotenv: [
    `function __loadEnvFile(path) {`,
    `  const fs = require('fs');`,
    `  let raw;`,
    `  try { raw = fs.readFileSync(path, 'utf8'); } catch (e) { return; }`,
    `  for (const line of raw.split(/\\r?\\n/)) {`,
    `    const trimmed = line.trim();`,
    `    if (!trimmed || trimmed.startsWith('#')) continue;`,
    `    const eq = trimmed.indexOf('=');`,
    `    if (eq < 0) continue;`,
    `    const k = trimmed.slice(0, eq).trim();`,
    `    let v = trimmed.slice(eq + 1).trim();`,
    `    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\\'') && v.endsWith('\\''))) v = v.slice(1, -1);`,
    `    if (process.env[k] === undefined) process.env[k] = v;`,
    `  }`,
    `}`,
  ].join('\n'),
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
  // v1.0.1 — shared runtime helpers for reflection, binary-size, YAML subset
  // parsing/emitting, spread of timeouts, and set/map helpers. Injected lazily
  // when any feature that needs them is used.
  core: [
    `function __typeOf(x) {`,
    `  if (x === null) return 'null';`,
    `  if (x === undefined) return 'undefined';`,
    `  const t = typeof x;`,
    `  if (t === 'string') return 'text';`,
    `  if (t === 'number') return 'number';`,
    `  if (t === 'boolean') return 'boolean';`,
    `  if (Array.isArray(x)) return 'array';`,
    `  if (t === 'object') return 'record';`,
    `  if (t === 'function') return 'function';`,
    `  return t;`,
    `}`,
    `function __sizeOf(x) {`,
    `  if (x == null) return 0;`,
    `  if (typeof x === 'string' || Array.isArray(x)) return x.length;`,
    `  if (x instanceof Map || x instanceof Set) return x.size;`,
    `  if (typeof x === 'object') return Object.keys(x).length;`,
    `  return 0;`,
    `}`,
    `function __formatDate(x, pattern) {`,
    `  const p = pattern || 'YYYY-MM-DD HH:mm:ss';`,
    `  let d = x instanceof Date ? x : new Date(x);`,
    `  if (Number.isNaN(d.getTime())) return '';`,
    `  const pad = (n, l) => String(n).padStart(l || 2, '0');`,
    `  const map = {`,
    `    YYYY: String(d.getFullYear()),`,
    `    MM: pad(d.getMonth() + 1),`,
    `    DD: pad(d.getDate()),`,
    `    HH: pad(d.getHours()),`,
    `    mm: pad(d.getMinutes()),`,
    `    ss: pad(d.getSeconds()),`,
    `  };`,
    `  return p.replace(/YYYY|MM|DD|HH|mm|ss/g, k => map[k]);`,
    `}`,
    `function __yamlStringify(v, indent) {`,
    `  const pad = ' '.repeat(indent || 0);`,
    `  if (v === null || v === undefined) return 'null';`,
    `  if (typeof v === 'string') return '"' + String(v).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"') + '"';`,
    `  if (typeof v === 'number' || typeof v === 'boolean') return String(v);`,
    `  if (Array.isArray(v)) {`,
    `    const childPad = pad + '  ';`,
    `    return v.map(x => {`,
    `      if (typeof x === 'object' && x !== null && !Array.isArray(x)) {`,
    `        const inner = __yamlStringify(x, indent + 2).split('\\n')[0];`,
    `        return pad + '- ' + inner + __yamlStringify(x, indent + 4).split('\\n').slice(1).map(l => '\\n' + l).join('');`,
    `      }`,
    `      return pad + '- ' + __yamlStringify(x, indent + 2);`,
    `    }).join('\\n');`,
    `  }`,
    `  if (typeof v === 'object') {`,
    `    return Object.keys(v).map(k => {`,
    `      const val = __yamlStringify(v[k], 0);`,
    `      if (typeof v[k] === 'object' && v[k] !== null && !Array.isArray(v[k])) {`,
    `        return pad + k + ':\\n' + __yamlStringify(v[k], indent + 2);`,
    `      }`,
    `      return pad + k + ': ' + val;`,
    `    }).join('\\n');`,
    `  }`,
    `  return String(v);`,
    `}`,
    `function __yamlParse(text) {`,
    `  const lines = String(text).split(/\\r?\\n/);`,
    `  const root = {};`,
    `  let seq = null;`,
    `  let seqIndent = -1;`,
    `  const stack = [{ indent: -1, node: root }];`,
    `  for (const line0 of lines) {`,
    `    const trimmed = line0.trim();`,
    `    if (!trimmed || trimmed.startsWith('#')) continue;`,
    `    const indent = line0.length - line0.trimStart().length;`,
    `    const scalar = (s) => {`,
    `      const t = s.trim();`,
    `      if (t.length >= 2 && ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'"))) return t.slice(1, -1);`,
    `      if (t === 'true') return true;`,
    `      if (t === 'false') return false;`,
    `      if (t === 'null' || t === '~') return null;`,
    `      if (t !== '' && !isNaN(Number(t))) return Number(t);`,
    `      return t;`,
    `    };`,
    `    const m = trimmed.match(/^([^:#]+):(.*)$/);`,
    `    if (m) {`,
    `      const key = m[1].replace(/^['"]|['"]$/g, '').trim();`,
    `      const rest = m[2].trim();`,
    `      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();`,
    `      const parent = stack[stack.length - 1].node;`,
    `      if (rest === '' || rest === '|') { const node = {}; parent[key] = node; stack.push({ indent, node }); }`,
    `      else if (rest === '[]') { parent[key] = []; }`,
    `      else { parent[key] = scalar(rest); }`,
    `      continue;`,
    `    }`,
    `    const lm = trimmed.match(/^-\\s*(.*)$/);`,
    `    if (lm) {`,
    `      while (seq && seqIndent >= indent) { seq = null; seqIndent = -1; }`,
    `      while (!seq && stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();`,
    `      const parent = stack[stack.length - 1].node;`,
    `      if (lm[1] && lm[1].includes(':')) {`,
    `        const km = lm[1].match(/^([^:]+):\\s*(.*)$/);`,
    `        if (seq) {`,
    `          const m2 = {}; seq[seq.length - 1] = typeof seq[seq.length - 1] === 'object' && seq[seq.length - 1] !== null ? seq[seq.length - 1] : m2;`,
    `          const node = seq[seq.length - 1];`,
    `          node[km[1].trim()] = km[2] ? scalar(km[2]) : {};`,
    `        } else {`,
    `          const node = {}; parent[km[1].trim()] = km[2] ? scalar(km[2]) : node; stack.push({ indent, node });`,
    `        }`,
    `      } else if (seq) {`,
    `        seq.push(scalar(lm[1]));`,
    `      } else if (Array.isArray(parent)) {`,
    `        parent.push(scalar(lm[1])); seq = parent; seqIndent = indent;`,
    `      } else {`,
    `        const lastKey = Object.keys(parent)[Object.keys(parent).length - 1];`,
    `        const arr = [];`,
    `        if (lastKey != null) parent[lastKey] = arr; else parent.__rootArray = arr;`,
    `        arr.push(scalar(lm[1]));`,
    `        seq = arr; seqIndent = indent;`,
    `      }`,
    `      continue;`,
    `    }`,
    `  }`,
    `  if (root.__rootArray) return root.__rootArray;`,
    `  return root;`,
    `}`,
    `function __withTimeout(promise, ms) {`,
    `  const timeout = ms == null ? 10000 : ms;`,
    `  return new Promise((resolve, reject) => {`,
    `    const timer = setTimeout(() => reject(new Error('Timed out after ' + timeout + 'ms.')), timeout);`,
    `    Promise.resolve(promise).then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });`,
    `  });`,
    `}`,
  ].join('\n'),
  // v1.0.1 — process execution (child processes).
  process: [
    `const { execFile } = require('child_process');`,
    `function __runCommand(command, args) {`,
    `  return new Promise((resolve) => {`,
    `    execFile(command, args || [], { maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {`,
    `      resolve({ ok: !error, code: error ? (error.code == null ? -1 : error.code) : 0, stdout: String(stdout), stderr: String(stderr) });`,
    `    });`,
    `  });`,
    `}`,
  ].join('\n'),
  // v1.0.1 — Map helpers.
  mapset: [
    `function __mapSet(map, key, value) { map.set(key, value); return map; }`,
  ].join('\n'),
  // v2.2.0 — collection primitives (flatten / pick / omit / groupBy).
  coll: [
    `function __flatten(list) {`,
    `  const out = [];`,
    `  (function rec(x) {`,
    `    if (Array.isArray(x)) { for (const i of x) rec(i); }`,
    `    else out.push(x);`,
    `  })(list);`,
    `  return out;`,
    `}`,
    `function __pick(obj) {`,
    `  const out = {};`,
    `  for (let i = 1; i < arguments.length; i++) {`,
    `    const k = arguments[i];`,
    `    if (obj != null && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];`,
    `  }`,
    `  return out;`,
    `}`,
    `function __omit(obj) {`,
    `  const skip = new Set([].slice.call(arguments, 1));`,
    `  const out = {};`,
    `  if (obj != null) for (const k of Object.keys(obj)) if (!skip.has(k)) out[k] = obj[k];`,
    `  return out;`,
    `}`,
    `function __groupBy(list, keyFn) {`,
    `  const out = {};`,
    `  for (const item of (list || [])) {`,
    `    const k = typeof keyFn === 'function' ? keyFn(item) : (item == null ? undefined : item[keyFn]);`,
    `    (out[k] = out[k] || []).push(item);`,
    `  }`,
    `  return out;`,
    `}`,
    `function __paginate(list, page, perPage) {`,
    `  const items = (list || []);`,
    `  const total = items.length;`,
    `  perPage = Math.max(1, perPage == null ? 10 : Number(perPage));`,
    `  const pages = Math.max(1, Math.ceil(total / perPage));`,
    `  page = Math.min(Math.max(1, page == null ? 1 : Number(page)), pages);`,
    `  const start = (page - 1) * perPage;`,
    `  const slice = items.slice(start, start + perPage);`,
    `  return { items: slice, count: total, page, pages, perPage, hasNext: page < pages, hasPrev: page > 1 };`,
    `}`,
  ].join('\n'),
  // v1.0.1 — dynamic module loader.
  loadmodule: [
    `function __loadModule(spec) {`,
    `  const path = require('path');`,
    `  const target = (spec[0] === '.' ) ? path.resolve(process.cwd(), spec) : spec;`,
    `  try { return require(target); }`,
    `  catch (e) { if (spec[0] !== '.') return require(spec); throw e; }`,
    `}`,
  ].join('\n'),
  // v1.0.1 — recursive directory walker (returns full paths, files first).
  walk: [
    `function __walkFolder(dir) {`,
    `  const fs = require('fs');`,
    `  const path = require('path');`,
    `  const out = [];`,
    `  function rec(d) {`,
    `    for (const entry of fs.readdirSync(d)) {`,
    `      const full = path.join(d, entry);`,
    `      const st = fs.statSync(full);`,
    `      if (st.isDirectory()) rec(full);`,
    `      else out.push(full);`,
    `    }`,
    `  }`,
    `  rec(dir);`,
    `  return out;`,
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
    `let __cache = null; // optional Redis client, set by the "cache" statement`,
    `const __memCache = new Map(); // in-memory fallback cache: key -> { value, exp }`,
    `function __cacheClient() {`,
    `  return __cache;`,
    `}`,
    `async function __cacheGet(key) {`,
    `  if (__cache) return __cache.get(key);`,
    `  const entry = __memCache.get(key);`,
    `  if (!entry) return null;`,
    `  if (entry.exp != null && Date.now() > entry.exp) { __memCache.delete(key); return null; }`,
    `  return entry.value;`,
    `}`,
    `async function __cacheSet(key, value, ttlSeconds) {`,
    `  if (__cache) return __cache.set(key, value, ttlSeconds == null ? undefined : { EX: ttlSeconds });`,
    `  const exp = ttlSeconds == null ? null : Date.now() + ttlSeconds * 1000;`,
    `  __memCache.set(key, { value, exp });`,
    `  return 'OK';`,
    `}`,
    `async function __cacheDelete(key) {`,
    `  if (__cache) return __cache.del(key);`,
    `  return __memCache.delete(key) ? 1 : 0;`,
    `}`,
  ].join('\n'),
  // v2.1.1 — WhatsApp runtime (@whiskeysockets/baileys behind the
  // "whatsapp bot" block). Everything Baileys-shaped stays in here: socket
  // creation, auth-state files, QR rendering, pairing codes, connection
  // lifecycle and messages.upsert normalization. PlainScript programs only ever
  // see __whatsappStart/__whatsappOnMessage/__whatsappReply.
  whatsapp: [
    `const { __whatsappStart, __whatsappOnMessage, __whatsappReply } = (() => {`,
    `  let sock = null;`,
    `  const handlers = [];`,
    `  const __waSilentLogger = (() => {`,
    `    const noop = () => {};`,
    `    const logger = { level: 'silent', child: () => logger, trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };`,
    `    return logger;`,
    `  })();`,
    `  function __waNormalizePhone(raw) {`,
    `    const digits = String(raw == null ? '' : raw).replace(/[\\s()+\\-.]/g, '');`,
    `    if (!/^[0-9]+$/.test(digits) || digits.length < 8 || digits.length > 15) {`,
    `      throw new Error('WhatsApp: "' + raw + '" is not a valid pairing phone number. Use the full international number, digits only (country code included, no "+").');`,
    `    }`,
    `    return digits;`,
    `  }`,
    `  function __waUnwrap(content) {`,
    `    let node = content;`,
    `    for (let depth = 0; node && depth < 5; depth++) {`,
    `      const inner = (node.ephemeralMessage || node.viewOnceMessage || node.viewOnceMessageV2 || node.documentWithCaptionMessage || {}).message;`,
    `      if (!inner) break;`,
    `      node = inner;`,
    `    }`,
    `    return node;`,
    `  }`,
    `  function __waExtractText(content) {`,
    `    if (!content) return '';`,
    `    return String(` +
      `(content.conversation || (content.extendedTextMessage || {}).text || ` +
      `(content.imageMessage || {}).caption || (content.videoMessage || {}).caption || ` +
      `(content.documentMessage || {}).caption) || '');`,
    `  }`,
    `  async function __whatsappReply(chat, value) {`,
    `    if (!sock) throw new Error('WhatsApp: cannot reply because the bot is not connected yet.');`,
    `    const text = typeof value === 'string' ? value : JSON.stringify(value);`,
    `    return sock.sendMessage(chat, { text });`,
    `  }`,
    `  function __whatsappOnMessage(handler) { handlers.push(handler); }`,
    `  async function __whatsappStart(options) {`,
    `    const baileys = require('@whiskeysockets/baileys');`,
    `    const makeWASocket = baileys.default;`,
    `    const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = baileys;`,
    `    const folder = options.folder || 'plainscript-whatsapp-auth';`,
    `    const mode = options.login && options.login.mode === 'pairing' ? 'pairing' : 'qr';`,
    `    const pairingPhone = mode === 'pairing' ? __waNormalizePhone(options.login.phone) : null;`,
    `    let connecting = false;`,
    `    const connect = async () => {`,
    `      if (connecting) return;`,
    `      connecting = true;`,
    `      try {`,
    // Auth/session persistence: useMultiFileAuthState stores credentials in
    // the folder from `auth "<name>"`; saveCreds writes every update back.
    `        const { state, saveCreds } = await useMultiFileAuthState(folder);`,
    `        let version;`,
    `        try { version = (await fetchLatestBaileysVersion()).version; } catch (_) {}`,
    // Proven socket settings: these exact options are required for pairing
    // codes to survive WhatsApp's handshake without a 428 connection close.
    `        sock = makeWASocket({`,
    `          ...(version ? { version } : {}),`,
    `          browser: ['Ubuntu', 'Edge', '20.0.04'],`,
    `          printQRInTerminal: false,`,
    `          syncFullHistory: false,`,
    `          markOnlineOnConnect: false,`,
    `          defaultQueryTimeoutMs: 60000,`,
    `          keepAliveIntervalMs: 30000,`,
    `          logger: __waSilentLogger,`,
    `          auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, __waSilentLogger) },`,
    `        });`,
    `        sock.ev.on('creds.update', saveCreds);`,
    // Pairing codes are requested two seconds after socket creation — asking
    // earlier aborts the link attempt. PlainScript calls requestPairingCode(phone)
    // with no custom suffix; the number was validated at compile time.
    `        if (mode === 'pairing' && !state.creds.registered) {`,
    `          setTimeout(() => {`,
    `            if (!sock) return;`,
    `            sock.requestPairingCode(pairingPhone).then((rawCode) => {`,
    `              const pretty = String(rawCode || '').replace(/[^A-Za-z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-');`,
    `              console.log('WhatsApp pairing code: ' + pretty);`,
    `              console.log('Enter it on your phone: WhatsApp > Settings > Linked devices > Link a device > Link with phone number instead.');`,
    `            }).catch((error) => {`,
    `              console.error('WhatsApp pairing code failed: ' + error.message);`,
    `            });`,
    `          }, 2000);`,
    `        }`,
    // Connection lifecycle: the QR code while linking, a friendly note on
    // open, and automatic reconnection on every close except loggedOut.
    `        sock.ev.on('connection.update', async (update) => {`,
    `          try {`,
    `            const statusCode = update.lastDisconnect && update.lastDisconnect.error && (`,
    `              (update.lastDisconnect.error.output || {}).statusCode != null`,
    `                ? update.lastDisconnect.error.output.statusCode`,
    `                : (((update.lastDisconnect.error.error || {}).output || {}).statusCode));`,
    `            if (update.qr && mode === 'qr') {`,
    `              console.log('Scan this QR code with WhatsApp (Settings > Linked devices > Link a device):');`,
    `              try {`,
    `                require('qrcode-terminal').generate(update.qr, { small: true });`,
    `              } catch (_) {`,
    `                console.log(update.qr);`,
    `              }`,
    `            }`,
    `            if (update.connection === 'open') {`,
    `              console.log('WhatsApp connected.');`,
    `            }`,
    `            if (update.connection === 'close') {`,
    `              sock = null;`,
    `              if (statusCode === DisconnectReason.loggedOut) {`,
    `                console.error('WhatsApp signed out. Delete the "' + folder + '" folder and restart to link this device again.');`,
    `              } else {`,
    `                console.error('WhatsApp connection closed (' + statusCode + '). Reconnecting in 3 seconds...');`,
    `                setTimeout(() => { connect().catch((error) => console.error('WhatsApp reconnect failed: ' + error.message)); }, 3000);`,
    `              }`,
    `            }`,
    `          } catch (error) {`,
    `            console.error('WhatsApp connection error: ' + error.message);`,
    `          }`,
    `        });`,
    // Incoming messages: only fresh ("notify") deliveries, never our own,
    // never status broadcasts. Each message becomes a PlainScript record.
    `        sock.ev.on('messages.upsert', async (upsert) => {`,
    `          try {`,
    `            if (!upsert || upsert.type !== 'notify') return;`,
    `            for (const msg of upsert.messages || []) {`,
    `              const key = msg.key || {};`,
    `              if (key.fromMe) continue;`,
    `              const chat = key.remoteJid;`,
    `              if (!chat || chat === 'status@broadcast') continue;`,
    `              const message = {`,
    `                text: __waExtractText(__waUnwrap(msg.message)),`,
    `                chat,`,
    `                sender: key.participant || chat,`,
    `                name: msg.pushName || null,`,
    `                id: key.id || null,`,
    `                time: Number(msg.messageTimestamp) > 0 ? Number(msg.messageTimestamp) * 1000 : Date.now(),`,
    `                isGroup: chat.endsWith('@g.us'),`,
    `              };`,
    `              const ctx = { chat, message, reply: (value) => __whatsappReply(chat, value) };`,
    `              for (const handler of handlers) {`,
    `                await handler(ctx);`,
    `              }`,
    `            }`,
    `          } catch (error) {`,
    `            console.error(error);`,
    `          }`,
    `        });`,
    `      } finally {`,
    `        connecting = false;`,
    `      }`,
    `    };`,
    `    await connect();`,
    `  }`,
    `  return { __whatsappStart, __whatsappOnMessage, __whatsappReply };`,
    `})();`,
  ].join('\n'),
  // v2.1.1 — HTTP client runtime on the global fetch API (Node.js 18+).
  // Every response becomes a PlainScript-friendly record: { ok, status, headers,
  // data }, where data holds parsed JSON when the content type says JSON.
  http: [
    `async function __httpRequest(method, url, options = {}) {`,
    `  if (typeof fetch !== 'function') {`,
    `    throw new Error('HTTP requests need Node.js 18 or newer (global fetch is missing). Current version: ' + process.version);`,
    `  }`,
    `  const timeoutMs = options.timeoutMs == null ? 30000 : Number(options.timeoutMs);`,
    `  const controller = new AbortController();`,
    `  const timer = setTimeout(() => controller.abort(), timeoutMs);`,
    `  let response;`,
    `  try {`,
    `    response = await fetch(url, {`,
    `      method,`,
    `      headers: options.headers,`,
    `      body: options.body == null ? undefined`,
    `        : (typeof options.body === 'string' || Buffer.isBuffer(options.body) ? options.body : JSON.stringify(options.body)),`,
    `      signal: controller.signal,`,
    `    });`,
    `  } catch (error) {`,
    `    clearTimeout(timer);`,
    `    if (error.name === 'AbortError') {`,
    `      throw new Error(method + ' ' + url + ' timed out after ' + timeoutMs + 'ms.');`,
    `    }`,
    `    throw new Error(method + ' ' + url + ' failed: ' + error.message);`,
    `  }`,
    `  clearTimeout(timer);`,
    `  const text = await response.text();`,
    `  let data = text;`,
    `  const contentType = response.headers.get('content-type') || '';`,
    `  if (contentType.includes('json')) {`,
    `    try { data = JSON.parse(text); } catch (_) {}`,
    `  }`,
    `  return { ok: response.ok, status: response.status, headers: Object.fromEntries(response.headers.entries()), data };`,
    `}`,
  ].join('\n'),
  // v2.2.0 — AI/ML runtime. `chat` and `embeddings` talk to any OpenAI-compatible
  // completions/embeddings endpoint (API key and base URL from options or env),
  // while `similarity` is pure vector math and runs fully offline.
  ai: [
    `function __aiTags() {`,
    `  return { key: process.env.OPENAI_API_KEY, base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\\/$/, '') };`,
    `}`,
    `async function __aiPost(tags, path, body) {`,
    `  if (typeof fetch !== 'function') {`,
    `    throw new Error('AI calls need Node.js 18 or newer (global fetch is missing): ' + process.version);`,
    `  }`,
    `  if (!tags.key) throw new Error('No API key for AI. Set env OPENAI_API_KEY.');`,
    `  const response = await fetch(tags.base + path, {`,
    `    method: 'POST',`,
    `    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tags.key },`,
    `    body: JSON.stringify(body),`,
    `  });`,
    `  const text = await response.text();`,
    `  let data = text;`,
    `  try { data = JSON.parse(text); } catch (_) {}`,
    `  if (!response.ok) throw new Error('AI request failed (' + response.status + '): ' + (data && data.error && data.error.message ? data.error.message : text));`,
    `  return data;`,
    `}`,
    `async function __aiChat(model, messages, options) {`,
    `  const tags = __aiTags();`,
    `  if (options && options.key) tags.key = options.key;`,
    `  if (options && options.base) tags.base = (options.base || '').replace(/\\/$/, '');`,
    `  if (typeof messages === 'string') messages = [{ role: 'user', content: messages }];`,
    `  const data = await __aiPost(tags, '/chat/completions', { model: model, messages: messages });`,
    `  const choice = data.choices && data.choices[0];`,
    `  return choice && choice.message ? choice.message.content : '';`,
    `}`,
    `async function __aiEmbed(model, text, options) {`,
    `  const tags = __aiTags();`,
    `  if (options && options.key) tags.key = options.key;`,
    `  if (options && options.base) tags.base = (options.base || '').replace(/\\/$/, '');`,
    `  const data = await __aiPost(tags, '/embeddings', { model: model, input: String(text) });`,
    `  return (data.data && data.data[0] && data.data[0].embedding) || [];`,
    `}`,
    `function __aiSimilarity(a, b) {`,
    `  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;`,
    `  let dot = 0, na = 0, nb = 0;`,
    `  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }`,
    `  if (na === 0 || nb === 0) return 0;`,
    `  return dot / (Math.sqrt(na) * Math.sqrt(nb));`,
    `}`,
  ].join('\n'),
  // v2.1.1 — file upload runtime (multer behind "accept uploads"). Files are
  // held in memory by default or written to disk when a folder is given.
  // Normalised records expose: name, type, size, data (buffer) and path.
  uploads: [
    `function __uploads(options = {}) {`,
    `  const multer = require('multer');`,
    `  if (options.folder) require('fs').mkdirSync(options.folder, { recursive: true });`,
    `  const config = {`,
    `    storage: options.folder`,
    `      ? multer.diskStorage({ destination: (_req, _file, cb) => cb(null, options.folder) })`,
    `      : multer.memoryStorage(),`,
    `  };`,
    `  if (options.limitBytes != null) config.limits = { fileSize: options.limitBytes };`,
    `  if (options.mimes && options.mimes.length) {`,
    `    config.fileFilter = (_req, file, cb) => {`,
    `      if (options.mimes.includes(file.mimetype)) return cb(null, true);`,
    `      const error = new Error('Upload rejected: "' + file.originalname + '" has type "' + file.mimetype + '". Allowed types: ' + options.mimes.join(', '));`,
    `      error.statusCode = 415;`,
    `      return cb(error);`,
    `    };`,
    `  }`,
    `  const handler = multer(config).any();`,
    `  return (req, res, next) => {`,
    `    handler(req, res, (error) => {`,
    `      if (!error) return next();`,
    `      const status = error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);`,
    `      const message = error.code === 'LIMIT_FILE_SIZE'`,
    `        ? 'Upload rejected: file exceeds the size limit (' + options.limitBytes + ' bytes).'`,
    `        : error.message;`,
    `      res.status(status).json({ error: message });`,
    `    });`,
    `  };`,
    `}`,
    `function __normalizeUpload(file) {`,
    `  if (!file) return null;`,
    `  return { name: file.originalname, type: file.mimetype, size: file.size, data: file.buffer || null, path: file.path || null };`,
    `}`,
    `function __uploadedFile(req, field) {`,
    `  return __normalizeUpload((req.files || []).find((f) => f.fieldname === field) || null);`,
    `}`,
    `function __uploadedFiles(req, field) {`,
    `  return (req.files || []).filter((f) => f.fieldname === field).map(__normalizeUpload);`,
    `}`,
  ].join('\n'),
  // v2.1.1 — cookie helpers shared by the cookie() accessor and the session
  // runtime.
  cookies: [
    `function __parseCookies(header) {`,
    `  const jar = {};`,
    `  for (const part of String(header || '').split(';')) {`,
    `    const index = part.indexOf('=');`,
    `    if (index === -1) continue;`,
    `    try {`,
    `      jar[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());`,
    `    } catch (_) {`,
    `      jar[part.slice(0, index).trim()] = part.slice(index + 1).trim();`,
    `    }`,
    `  }`,
    `  return jar;`,
    `}`,
    `function __cookieValue(req, name) {`,
    `  const value = __parseCookies(req.headers.cookie)[String(name)];`,
    `  return value === undefined ? null : value;`,
    `}`,
  ].join('\n'),
  // v2.1.1 — session runtime. Cookie-signed session ids backed by an
  // in-memory store (sessions reset when the server restarts).
  sessions: [
    `const __sessionStore = new Map();`,
    `const __sessionsCrypto = require('crypto');`,
    `function __enableSessions(secret) {`,
    `  return (req, res, next) => {`,
    `    const cookies = __parseCookies(req.headers.cookie);`,
    `    req.__session = null;`,
    `    const sid = cookies['plainscript.sid'];`,
    `    if (sid && sid.startsWith('s:') && sid.indexOf('.', 2) !== -1) {`,
    `      const dot = sid.indexOf('.', 2);`,
    `      const id = sid.slice(2, dot);`,
    `      const expected = __sessionsCrypto.createHmac('sha256', String(secret)).update(id).digest('base64url');`,
    `      if (__sessionStore.has(id) && sid.slice(dot + 1) === expected) {`,
    `        req.__session = __sessionStore.get(id);`,
    `      }`,
    `    }`,
    `    if (!req.__session) {`,
    `      const id = __sessionsCrypto.randomUUID();`,
    `      req.__session = {};`,
    `      __sessionStore.set(id, req.__session);`,
    `      const signature = __sessionsCrypto.createHmac('sha256', String(secret)).update(id).digest('base64url');`,
    `      res.setHeader('Set-Cookie', 'plainscript.sid=s:' + id + '.' + signature + '; Path=/; HttpOnly; SameSite=Lax');`,
    `    }`,
    `    next();`,
    `  };`,
    `}`,
    `function __sessionOf(request) {`,
    `  if (!request.__session) throw new Error('Sessions are not enabled. Add "enable sessions <secret>" before reading "session of request".');`,
    `  return request.__session;`,
    `}`,
    `function __userOf(request) {`,
    `  return request.__oauthUser || (request.__session && request.__session.user) || null;`,
    `}`,
    `function __destroySession(request, response) {`,
    `  const sid = __parseCookies(request.headers.cookie)['plainscript.sid'];`,
    `  if (sid && sid.startsWith('s:') && sid.indexOf('.', 2) !== -1) {`,
    `    __sessionStore.delete(sid.slice(2, sid.indexOf('.', 2)));`,
    `  }`,
    `  response.setHeader('Set-Cookie', 'plainscript.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');`,
    `}`,
  ].join('\n'),
  // v2.1.1 — authentication runtime: scrypt password hashing and signed
  // tokens (HS256 format), both zero-dependency.
  auth: [
    `const __authCrypto = require('crypto');`,
    `function hashPassword(password) {`,
    `  const salt = __authCrypto.randomBytes(16).toString('hex');`,
    `  const hash = __authCrypto.scryptSync(String(password), salt, 64).toString('hex');`,
    `  return 'scrypt$' + salt + '$' + hash;`,
    `}`,
    `function checkPassword(password, stored) {`,
    `  try {`,
    `    const [scheme, salt, hash] = String(stored).split('$');`,
    `    if (scheme !== 'scrypt' || !salt || !hash) return false;`,
    `    const candidate = __authCrypto.scryptSync(String(password), salt, 64);`,
    `    const expected = Buffer.from(hash, 'hex');`,
    `    return candidate.length === expected.length && __authCrypto.timingSafeEqual(candidate, expected);`,
    `  } catch (_) {`,
    `    return false;`,
    `  }`,
    `}`,
    `function createToken(payload, secret, expiresInSeconds) {`,
    `  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');`,
    `  const now = Math.floor(Date.now() / 1000);`,
    `  const claims = Object.assign({}, payload, { iat: now, exp: now + Math.floor(Number(expiresInSeconds == null ? 3600 : expiresInSeconds)) });`,
    `  const header = encode({ alg: 'HS256', typ: 'JWT' });`,
    `  const body = encode(claims);`,
    `  const signature = __authCrypto.createHmac('sha256', String(secret)).update(header + '.' + body).digest('base64url');`,
    `  return header + '.' + body + '.' + signature;`,
    `}`,
    `function readToken(token, secret) {`,
    `  try {`,
    `    const parts = String(token).split('.');`,
    `    if (parts.length !== 3) return null;`,
    `    const [header, body, signature] = parts;`,
    `    const want = Buffer.from(__authCrypto.createHmac('sha256', String(secret)).update(header + '.' + body).digest('base64url'));`,
    `    const given = Buffer.from(signature);`,
    `    if (given.length !== want.length || !__authCrypto.timingSafeEqual(given, want)) return null;`,
    `    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));`,
    `    if (claims.exp != null && Math.floor(Date.now() / 1000) >= claims.exp) return null;`,
    `    return claims;`,
    `  } catch (_) {`,
    `    return null;`,
    `  }`,
    `}`,
  ].join('\n'),
  // v2.1.1 — Google sign-in (OAuth 2.0 authorization code flow). Registers
  // two endpoints: /auth/google (redirect) and the configured callback URL
  // (token exchange + profile fetch), then redirects to the landing page.
  oauth: [
    `const __oauthCrypto = require('crypto');`,
    `function __googleOAuth(app, options) {`,
    `  const pendingStates = new Set();`,
    `  app.get('/auth/google', (req, res) => {`,
    `    const state = __oauthCrypto.randomUUID();`,
    `    pendingStates.add(state);`,
    `    const params = new URLSearchParams({`,
    `      client_id: options.clientId,`,
    `      redirect_uri: options.callbackUrl,`,
    `      response_type: 'code',`,
    `      scope: 'openid email profile',`,
    `      state,`,
    `    });`,
    `    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());`,
    `  });`,
    `  app.get(new URL(options.callbackUrl).pathname, async (req, res) => {`,
    `    try {`,
    `      if (req.query.error) {`,
    `        return res.status(401).json({ error: 'Google sign-in was cancelled.', detail: req.query.error });`,
    `      }`,
    `      if (!pendingStates.delete(req.query.state)) {`,
    `        return res.status(400).json({ error: 'Sign-in link expired or state mismatch. Start again at /auth/google.' });`,
    `      }`,
    `      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {`,
    `        method: 'POST',`,
    `        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },`,
    `        body: new URLSearchParams({`,
    `          code: req.query.code,`,
    `          client_id: options.clientId,`,
    `          client_secret: options.clientSecret,`,
    `          redirect_uri: options.callbackUrl,`,
    `          grant_type: 'authorization_code',`,
    `        }),`,
    `      });`,
    `      const tokens = await tokenResponse.json();`,
    `      if (!tokens.access_token) {`,
    `        return res.status(401).json({ error: 'Google token exchange failed.', detail: tokens.error_description || tokens.error });`,
    `      }`,
    `      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {`,
    `        headers: { Authorization: 'Bearer ' + tokens.access_token },`,
    `      });`,
    `      const profile = await profileResponse.json();`,
    `      req.__oauthUser = { email: profile.email, name: profile.name, picture: profile.picture, role: 'user' };`,
    `      if (req.__session) req.__session.user = req.__oauthUser;`,
    `      res.redirect(options.afterLogin || '/');`,
    `    } catch (error) {`,
    `      res.status(500).json({ error: 'Google sign-in failed: ' + error.message });`,
    `    }`,
    `  });`,
    `}`,
  ].join('\n'),
  // v2.1.1 — per-IP request rate limiting with an in-memory sliding window.
  ratelimit: [
    `function __rateLimit(options) {`,
    `  const hits = new Map();`,
    `  const sweeper = setInterval(() => {`,
    `    const cutoff = Date.now() - options.windowMs;`,
    `    for (const [key, times] of hits) {`,
    `      const recent = times.filter((t) => t > cutoff);`,
    `      if (recent.length === 0) hits.delete(key); else hits.set(key, recent);`,
    `    }`,
    `  }, Math.min(options.windowMs, 60000));`,
    `  if (sweeper.unref) sweeper.unref();`,
    `  return (req, res, next) => {`,
    `    const key = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';`,
    `    const now = Date.now();`,
    `    const times = (hits.get(key) || []).filter((t) => now - t < options.windowMs);`,
    `    if (times.length >= options.max) {`,
    `      return res.status(429).json({ error: 'Too many requests. Limit: ' + options.max + ' per ' + Math.round(options.windowMs / 1000) + ' seconds.' });`,
    `    }`,
    `    times.push(now);`,
    `    hits.set(key, times);`,
    `    next();`,
    `  };`,
    `}`,
  ].join('\n'),
  // v2.1.1 — pause helper for "retry N times every N seconds".
  retry: [
    `const __retrySleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`,
  ].join('\n'),
  // IOPL-native — event emitter runtime.
  __emitter: 'const __emitter = new (require("events").EventEmitter)();',
  // IOPL-native — line-by-line file streaming runtime.
  __streamFile: [
    `async function __streamFile(path, fn) {`,
    `  const fs = require('fs');`,
    `  const rl = require('readline').createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });`,
    `  for await (const line of rl) await fn(line);`,
    `}`,
  ].join('\n'),
  // v2.1.1 — SQLite runtime with a portable engine chain. Default order:
  // better-sqlite3 (native binding) first, sql.js (WebAssembly) as fallback.
  // Both engines are wrapped in the same tiny synchronous surface that PlainScript
  // generates (prepare().all()/.run(), exec(), transaction()), so compiled
  // database code is identical either way. The WebAssembly engine persists
  // the whole database back to disk after every write.
  sqlite: [
    `let __sqliteNative = null;`,
    `let __sqliteNativeReason = '';`,
    `async function __dbOpen(file, mode) {`,
    `  if (mode !== 'wasm') {`,
    `    const native = __sqliteLoadNative();`,
    `    if (native) return __sqliteWrapNative(new native(file));`,
    `    if (mode === 'native') {`,
    `      throw new Error('Database: the native SQLite engine is not usable on this machine (' + __sqliteNativeReason + ').\\nFix the better-sqlite3 build, or run anywhere with:\\n  database "' + file + '" using "wasm"');`,
    `    }`,
    `    console.error('PlainScript: native SQLite unavailable (' + __sqliteNativeReason + '); using the WebAssembly engine instead.');`,
    `  }`,
    `  const initSqlJs = require('sql.js');`,
    `  const SQL = await initSqlJs();`,
    `  let raw;`,
    `  try {`,
    `    raw = new SQL.Database(require('fs').readFileSync(file));`,
    `  } catch (_) {`,
    `    raw = new SQL.Database();`,
    `  }`,
    `  return __sqliteWrapWasm(raw, file);`,
    `}`,
    `function __sqliteLoadNative() {`,
    `  if (__sqliteNative !== null) return __sqliteNative;`,
    `  try {`,
    `    const Database = require('better-sqlite3');`,
    `    const probe = new Database(':memory:');`,
    `    probe.close();`,
    `    __sqliteNative = Database;`,
    `  } catch (error) {`,
    `    __sqliteNative = false;`,
    `    __sqliteNativeReason = error.message;`,
    `  }`,
    `  return __sqliteNative;`,
    `}`,
    `function __sqliteWrapNative(db) {`,
    `  return {`,
    `    prepare: (sql) => db.prepare(sql),`,
    `    exec: (sql) => db.exec(sql),`,
    // Pass through better-sqlite3 semantics: transaction(fn) returns a
    // callable that runs fn inside BEGIN/COMMIT (the generated code invokes
    // it once).
    `    transaction: (fn) => db.transaction(fn),`,
    `  };`,
    `}`,
    `function __sqliteWrapWasm(db, file) {`,
    `  const persist = () => {`,
    `    if (file === ':memory:') return;`,
    `    try {`,
    `      require('fs').writeFileSync(file, Buffer.from(db.export()));`,
    `    } catch (error) {`,
    `      console.error('PlainScript: could not save the database to ' + file + ': ' + error.message);`,
    `    }`,
    `  };`,
    `  return {`,
    `    prepare(sql) {`,
    `      return {`,
    `        all(...params) {`,
    `          const stmt = db.prepare(sql);`,
    `          try {`,
    `            stmt.bind(params);`,
    `            const rows = [];`,
    `            while (stmt.step()) rows.push(stmt.getAsObject());`,
    `            return rows;`,
    `          } finally {`,
    `            stmt.free();`,
    `          }`,
    `        },`,
    `        run(...params) {`,
    `          db.run(sql, params);`,
    `          const result = { changes: db.getRowsModified(), lastInsertRowid: null };`,
    `          try {`,
    `            const ids = db.exec('SELECT last_insert_rowid()');`,
    `            if (ids.length && ids[0].values.length) result.lastInsertRowid = ids[0].values[0][0];`,
    `          } catch (_) {}`,
    `          if (/^\\s*(insert|update|delete|replace)/i.test(sql)) persist();`,
    `          return result;`,
    `        },`,
    `      };`,
    `    },`,
    `    exec(sql) {`,
    `      db.run(sql);`,
    `      if (!/^\\s*select/i.test(sql)) persist();`,
    `    },`,
    `    transaction(fn) {`,
    `      return () => {`,
    `        db.run('BEGIN');`,
    `        try {`,
    `          const out = fn();`,
    `          db.run('COMMIT');`,
    `          persist();`,
    `          return out;`,
    `        } catch (error) {`,
    `          try { db.run('ROLLBACK'); } catch (_) {}`,
    `          throw error;`,
    `        }`,
    `      };`,
    `    },`,
    `  };`,
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
    // button could ever execute its PlainScript callback.
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

// Built-in stdlib functions: PlainScript name → JS code generator.
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
    markAsync(context);
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
  // The parsed JSON request body (from `web app`'s express.json()). With no
  // argument returns the whole body record; with one, that field's value.
  body: (args, context) => {
    if (!_inRoute) {
      throw new Error(
        `"body(...)" can only be used inside a route handler.\n\nExample:\n  route post "/items"\n    show body("name")\n  done`
      );
    }
    const base = 'req.body';
    if (!args || args.length === 0) return base;
    return `${base}[${generateExpr(args[0], context)}]`;
  },
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

  // ── v2.2.0 — collection & string primitives (IOPL-native, dependency-free).
  // A numeric range [start..end], stepping by 1 (or `step` when given).
  range: (args, context) => {
    const start = generateExpr(args[0], context);
    const end = args.length > 1 ? generateExpr(args[1], context) : null;
    const step = args.length > 2 ? generateExpr(args[2], context) : null;
    if (end === null) return `Array.from({ length: Math.max(0, ${start}) }, (_, i) => i)`;
    const s = step === null ? `(${start} <= ${end} ? 1 : -1)` : `Math.abs(${step}) * (${start} <= ${end} ? 1 : -1)`;
    return `Array.from((() => { const __r = []; for (let __i = ${start}; ${start} <= ${end} ? __i < ${end} : __i > ${end}; __i += ${s}) __r.push(__i); return __r; })())`;
  },
  clamp: (args, context) => `Math.min(Math.max(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)}), ${generateExpr(args[2], context)})`,
  first: (args, context) => `(${generateExpr(args[0], context)})[0]`,
  last: (args, context) => `(${generateExpr(args[0], context)})[(${generateExpr(args[0], context)}).length - 1]`,
  flatten: (args, context) => {
    ensureBuiltin(context, 'coll');
    return `__flatten(${generateExpr(args[0], context)})`;
  },
  includes: (args, context) => `(${generateExpr(args[0], context)}).includes(${generateExpr(args[1], context)})`,
  paginate: (args, context) => {
    ensureBuiltin(context, 'coll');
    return `__paginate(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)}, ${args.length > 2 ? generateExpr(args[2], context) : '10'})`;
  },
  pick: (args, context) => {
    ensureBuiltin(context, 'coll');
    return `__pick(${generateExpr(args[0], context)}, ${args.slice(1).map(a => generateExpr(a, context)).join(', ')})`;
  },
  omit: (args, context) => {
    ensureBuiltin(context, 'coll');
    return `__omit(${generateExpr(args[0], context)}, ${args.slice(1).map(a => generateExpr(a, context)).join(', ')})`;
  },
  groupBy: (args, context) => {
    ensureBuiltin(context, 'coll');
    return `__groupBy(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)})`;
  },
  startsWith: (args, context) => `String(${generateExpr(args[0], context)}).startsWith(String(${generateExpr(args[1], context)}))`,
  endsWith: (args, context) => `String(${generateExpr(args[0], context)}).endsWith(String(${generateExpr(args[1], context)}))`,
  truncate: (args, context) => {
    const text = `String(${generateExpr(args[0], context)})`;
    const n = generateExpr(args[1], context);
    const suffix = args.length > 2 ? generateExpr(args[2], context) : '"…"';
    return `(${text}.length <= ${n} ? ${text} : ${text}.slice(0, ${n}) + ${suffix})`;
  },
  padStart: (args, context) => `String(${generateExpr(args[0], context)}).padStart(${generateExpr(args[1], context)}, String(${args.length > 2 ? generateExpr(args[2], context) : '" "'}))`,
  padEnd: (args, context) => `String(${generateExpr(args[0], context)}).padEnd(${generateExpr(args[1], context)}, String(${args.length > 2 ? generateExpr(args[2], context) : '" "'}))`,

  // ── v1.0.1 — nullable / regex / date helpers (IOPL-native).
  // first non-null, non-undefined argument — IOPL null-coalescing.
  coalesce: (args, context) =>
    `(() => { const __vals = [${args.map(a => generateExpr(a, context)).join(', ')}]; for (const __v of __vals) if (__v !== null && __v !== undefined) return __v; return undefined; })()`,
  // regex-aware replace (replace() is literal-only).
  regexReplace: (args, context) =>
    `String(${generateExpr(args[0], context)}).replace(new RegExp(${generateExpr(args[1], context)}, 'g'), ${args.length > 2 ? generateExpr(args[2], context) : '""'})`,
  // ISO/date-string → milliseconds since the Unix epoch (NaN on failure).
  parseDate: (args, context) => `Date.parse(String(${generateExpr(args[0], context)}))`,
  // milliseconds/Date → formatted text (YYYY-MM-DD HH:mm:ss by default).
  formatDate: (args, context) => {
    ensureBuiltin(context, 'core');
    const value = generateExpr(args[0], context);
    const pattern = args.length > 1 ? generateExpr(args[1], context) : '"YYYY-MM-DD HH:mm:ss"';
    return `__formatDate(${value}, ${pattern})`;
  },

  // ── v2.1.0 — cache (Redis) accessors. All async.

  cacheGet: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    return `await __cacheGet(String(${generateExpr(args[0], context)}))`;
  },
  cacheSet: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    const key = `String(${generateExpr(args[0], context)})`;
    const value = `String(${generateExpr(args[1], context)})`;
    if (args.length > 2) {
      return `await __cacheSet(${key}, ${value}, ${generateExpr(args[2], context)})`;
    }
    return `await __cacheSet(${key}, ${value})`;
  },
  cacheDelete: (args, context) => {
    ensureBuiltin(context, 'cache');
    markAsync(context);
    return `await __cacheDelete(String(${generateExpr(args[0], context)}))`;
  },

  // v2.1.0 — email sending helper (statement form uses this too).
  sendMail: (args, context) => {
    ensureBuiltin(context, 'mailer');
    markAsync(context);
    return `__mailSend(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },

  // ── v2.1.1 — uploads, cookies, passwords and tokens

  // upload("field") / uploads("field") read files registered by
  // "accept uploads". Single file → record or null; plural → array.
  upload: (args, context) => {
    routeOnly('upload', 'route post "/upload"\n    accept uploads\n    show upload("doc")');
    requireOneArg('upload', args);
    ensureBuiltin(context, 'uploads');
    return `__uploadedFile(req, ${generateExpr(args[0], context)})`;
  },
  uploads: (args, context) => {
    routeOnly('uploads', 'route post "/upload"\n    accept uploads\n    show uploads("docs")');
    requireOneArg('uploads', args);
    ensureBuiltin(context, 'uploads');
    return `__uploadedFiles(req, ${generateExpr(args[0], context)})`;
  },
  // cookie("name") reads a request cookie.
  cookie: (args, context) => {
    routeOnly('cookie', 'route get "/me"\n    show cookie("theme")');
    requireOneArg('cookie', args);
    ensureBuiltin(context, 'cookies');
    return `__cookieValue(req, ${generateExpr(args[0], context)})`;
  },
  // Password hashing (scrypt, salted, constant-time comparison).
  hashPassword: (args, context) => {
    ensureBuiltin(context, 'auth');
    return `hashPassword(${generateExpr(args[0], context)})`;
  },
  checkPassword: (args, context) => {
    ensureBuiltin(context, 'auth');
    return `checkPassword(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  // Signed tokens in HS256 JWT format; readToken returns null when the
  // signature is invalid or the token has expired.
  createToken: (args, context) => {
    ensureBuiltin(context, 'auth');
    return `createToken(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },
  readToken: (args, context) => {
    ensureBuiltin(context, 'auth');
    return `readToken(${args.map(arg => generateExpr(arg, context)).join(', ')})`;
  },

  // ── v1.0.1 — capability-gap stdlib (reflection, binary, concurrency, ...) ──

  // Reflection
  typeOf: (args, context) => { ensureBuiltin(context, 'core'); return `__typeOf(${generateExpr(args[0], context)})`; },
  fieldsOf: (args, context) => `Object.keys(${generateExpr(args[0], context)})`,
  hasField: (args, context) => `Object.prototype.hasOwnProperty.call(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)})`,
  valueOf: (args, context) => {
    const [rec, key] = args.map(a => generateExpr(a, context));
    const fallback = args[2] != null ? generateExpr(args[2], context) : 'undefined';
    return `((__tmp) => (__tmp != null && Object.prototype.hasOwnProperty.call(__tmp, ${key})) ? __tmp[${key}] : ${fallback})(${rec})`;
  },
  sizeOf: (args, context) => { ensureBuiltin(context, 'core'); return `__sizeOf(${generateExpr(args[0], context)})`; },

  // Binary
  base64Encode: (args, context) => `Buffer.from(String(${generateExpr(args[0], context)})).toString('base64')`,
  base64Decode: (args, context) => `Buffer.from(String(${generateExpr(args[0], context)}), 'base64').toString('utf8')`,
  textToBytes: (args, context) => `Buffer.from(String(${generateExpr(args[0], context)}), 'utf8')`,
  bytesToText: (args, context) => `Buffer.from(${generateExpr(args[0], context)}).toString('utf8')`,
  sha256: (args, context) => {
    ensureBuiltin(context, 'crypto');
    return `crypto.createHash('sha256').update(String(${generateExpr(args[0], context)})).digest('hex')`;
  },
  sha1: (args, context) => {
    ensureBuiltin(context, 'crypto');
    return `crypto.createHash('sha1').update(String(${generateExpr(args[0], context)})).digest('hex')`;
  },
  md5: (args, context) => {
    ensureBuiltin(context, 'crypto');
    return `crypto.createHash('md5').update(String(${generateExpr(args[0], context)})).digest('hex')`;
  },

  // Serialization — minimal dependency-free YAML subset (see __yamlParse).
  yamlDecode: (args, context) => { ensureBuiltin(context, 'core'); return `__yamlParse(${generateExpr(args[0], context)})`; },
  yamlEncode: (args, context) => { ensureBuiltin(context, 'core'); return `__yamlStringify(${generateExpr(args[0], context)})`; },

  // Configuration
  loadEnvFile: (_args, context) => {
    ensureBuiltin(context, 'dotenv');
    return `__loadEnvFile(${generateExpr(_args[0], context)})`;
  },

  // CLI + process
  args: (_args) => `process.argv.slice(2)`,
  runCommand: (args, context) => {
    ensureBuiltin(context, 'process');
    markAsync(context);
    const bin = args[0] != null ? generateExpr(args[0], context) : 'undefined';
    const rest = args.slice(1).map(a => generateExpr(a, context));
    const call = `__runCommand(${bin}${rest.length ? ', [' + rest.join(', ') + ']' : ''})`;
    return `(await ${call})`;
  },
  withTimeout: (args, context) => {
    ensureBuiltin(context, 'core');
    markAsync(context);
    const ms = args[1] != null ? `, ${generateExpr(args[1], context)}` : '';
    return `(await __withTimeout(${generateExpr(args[0], context)}${ms}))`;
  },

  // Generators / iterables
  spread: (args, context) => `[...${generateExpr(args[0], context)}]`,

  // v1.0.1 — dynamic module loading (the runtime companion to `import "./x.ps"`).
  // Resolves relative to the bundler's CWD so `loadModule("./m")` behaves like
  // `require.resolve` from the program root.
  loadModule: (args, context) => {
    ensureBuiltin(context, 'loadmodule');
    return `__loadModule(${generateExpr(args[0], context)})`;
  },

  // ── v2.2.0 — AI/ML. `chat`/`embedText` call an OpenAI-compatible endpoint
  // (key from OPENAI_API_KEY, base from OPENAI_BASE_URL); `similarity` runs
  // offline cosine similarity over any two equal-length numeric vectors.
  chat: (args, context) => {
    ensureBuiltin(context, 'ai');
    markAsync(context);
    const model = generateExpr(args[0], context);
    const messages = generateExpr(args[1], context);
    const options = args.length > 2 && args[2] != null ? generateExpr(args[2], context) : 'undefined';
    return `await __aiChat(${model}, ${messages}, ${options})`;
  },
  embedText: (args, context) => {
    ensureBuiltin(context, 'ai');
    markAsync(context);
    const model = generateExpr(args[0], context);
    const text = generateExpr(args[1], context);
    const options = args.length > 2 && args[2] != null ? generateExpr(args[2], context) : 'undefined';
    return `await __aiEmbed(${model}, ${text}, ${options})`;
  },
  similarity: (args, context) => {
    ensureBuiltin(context, 'ai');
    return `__aiSimilarity(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)})`;
  },

  // Map / Set
  keyMap: (_args) => `new Map()`,
  mapSet: (args, context) => { ensureBuiltin(context, 'mapset'); return `__mapSet(${args.map(a => generateExpr(a, context)).join(', ')})`; },
  mapGet: (args, context) => `(${generateExpr(args[0], context)}).get(${generateExpr(args[1], context)})`,
  mapHas: (args, context) => `(${generateExpr(args[0], context)}).has(${generateExpr(args[1], context)})`,
  mapDelete: (args, context) => `(${generateExpr(args[0], context)}).delete(${generateExpr(args[1], context)})`,
  newSet: (_args) => `new Set()`,
  addToSet: (args, context) => `(${generateExpr(args[0], context)}).add(${generateExpr(args[1], context)})`,
  removeFromSet: (args, context) => `(${generateExpr(args[0], context)}).delete(${generateExpr(args[1], context)})`,
  setHas: (args, context) => `(${generateExpr(args[0], context)}).has(${generateExpr(args[1], context)})`,

  // Filesystem metadata, walking, and path helpers
  fileSize: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.statSync(${generateExpr(args[0], context)}).size`;
  },
  fileType: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.statSync(${generateExpr(args[0], context)}).isDirectory() ? 'directory' : 'file'`;
  },
  lastModified: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `new Date(fs.statSync(${generateExpr(args[0], context)}).mtimeMs).toISOString()`;
  },
  walkFolder: (args, context) => {
    ensureBuiltin(context, 'walk');
    return `__walkFolder(${generateExpr(args[0], context)})`;
  },
  joinPath: (_args, context) => {
    ensureBuiltin(context, 'path');
    return `path.join(${_args.map(a => generateExpr(a, context)).join(', ')})`;
  },
  baseName: (_args, context) => {
    ensureBuiltin(context, 'path');
    return `path.basename(${generateExpr(_args[0], context)})`;
  },
  folderOf: (_args, context) => {
    ensureBuiltin(context, 'path');
    return `path.dirname(${generateExpr(_args[0], context)})`;
  },
  extensionOf: (_args, context) => {
    ensureBuiltin(context, 'path');
    return `path.extname(${generateExpr(_args[0], context)})`;
  },

  // Streams
  writeLine: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.appendFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)} + '\\n', 'utf8')`;
  },
  appendLine: (args, context) => {
    ensureBuiltin(context, 'fs');
    return `fs.appendFileSync(${generateExpr(args[0], context)}, ${generateExpr(args[1], context)} + '\\n', 'utf8')`;
  },
};

// Mark the enclosing program async when a call awaits at the top level, and
// record that this scope emitted an `await` so handler and function bodies can
// decide their own async-ness at generation time (see generateBlock). Routing
// every await-emitting construct through this single function removes the need
// for a separate hand-maintained registry of async statement types — so a new
// async keyword can never silently break when used inside a route, listener, or
// function.
function markAsync(context) {
  context.emittedAwait = true;
  // Only a construct that awaits at the true top level needs the program
  // wrapped in an async IIFE. Awaits emitted inside a user function (inFunction)
  // or inside a route/listener/404 handler (inHandler) are handled by marking
  // that function/handler async instead — they must not drag the whole program
  // into an async wrapper, or "top-level use wraps the whole program" would be
  // the only safe nesting level for a new async keyword.
  if (!context.inFunction && !context.inHandler) context.needsAsync = true;
}

// Generate a body of statements and report whether it emitted an `await`.
//
// This is the single source of truth for whether a route handler, listener,
// 404 handler, or user function must be declared `async`. Previously this was
// decided by a separate AST walker (containsAsyncBlock) that had to be kept in
// sync by hand with every construct that compiles down to `await` — the exact
// fragility that made "top-level use wraps the whole program" the only place
// certain keywords (like ocr) were guaranteed to work. By observing the output
// of generation instead, whatever a body contains is handled correctly, even if
// it uses a brand-new async keyword.
function generateBlock(statements, indent, context) {
  const prev = context.emittedAwait;
  context.emittedAwait = false;
  const out = statements.map(s => generateStatement(s, indent, context)).join('\n');
  const emitted = context.emittedAwait;
  context.emittedAwait = prev;
  return { out, emitted };
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

// v2.1.1 — compile-time guard shared by request-scoped accessors that do not
// follow the req.<bucket> shape (upload/uploads/cookie).
function routeOnly(name, example) {
  if (!_inRoute) {
    throw new Error(
      `"${name}" can only be used inside a route handler.\n\nExample:\n  ${example}\n  done`
    );
  }
}

function requireOneArg(name, args) {
  if (args.length !== 1) {
    throw new Error(`"${name}" takes exactly one argument.\n\nExample:\n  ${name}("field")`);
  }
}

// Set to true while generating inside a route handler body.
// Remaps PlainScript's "request" → "req" and "response" → "res".
let _inRoute = false;
// True while generating inside a Telegram handler body. Remaps PlainScript's
// "reply" statement to send a chat message instead of an HTTP response.
let _inTelegram = false;
// v2.1.1 — true while generating inside a WhatsApp "on message" handler.
// Remaps PlainScript's "reply" to a WhatsApp chat message and PlainScript's "message"
// identifier to the normalized message record of the current delivery.
let _inWhatsApp = false;
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
    markAsync(context);
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
    emittedAwait: false, // true when the current generateBlock emitted an await
    inFunction: false, // true while generating inside a function-like scope
    inHandler: false,  // true while generating a route/listener/404 response body
    loopDepth: 0,       // >0 while generating inside a for-each / for-index / while loop
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
        `"${bareName}" is part of PlainScript's built-in runtime and is already available as "${boundAs}". Remove "as ${alias}".`
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

// True when any statement in a block (recursively, skipping nested function
// declarations) contains a `yield`, which marks the enclosing function as a
// generator (function*).
function containsYield(statements) {
  for (const stmt of statements || []) {
    if (stmt.type === 'YieldStatement') return true;
    if (stmt.type === 'IfStatement') {
      if (containsYield(stmt.consequent)) return true;
      if (stmt.alternate && containsYield(stmt.alternate)) return true;
    } else if (stmt.type !== 'FunctionDeclaration' && stmt.body && Array.isArray(stmt.body)) {
      if (containsYield(stmt.body)) return true;
    }
  }
  return false;
}

function generate(ast, context = createGenerationContext()) {  if (ast.type !== 'Program') {
    throw new Error(`Expected a Program node but got "${ast.type}".`);
  }
  // v1.0.1 — reset per-program test bookkeeping so repeated generate() calls
  // (build pipeline) start clean.
  __testCount = 0;
  __testCatchers = [];
  __inTest = false;

  const preludeStart = context.pendingPrelude.length;
  const body = ast.body.map(node => generateStatement(node, '', context)).filter(Boolean).join('\n');
  const lines = context.pendingPrelude.slice(preludeStart).concat(body).filter(Boolean);
  // Top-level functions are the module's public API: export them so a built
  // PlainScript file works as a normal CommonJS module (npm packages, require()).
  // Harmless for programs that are only executed.
  const exported = ast.body
    .filter(node => node.type === 'FunctionDeclaration')
    .map(node => node.name);
  const hasExplicitExport = ast.body.some(node => node.type === 'ExportStatement');
  // When the author uses explicit `export <name>`, they control the module
  // surface; skip the automatic function export so it does not clobber it.
  if (exported.length > 0 && !hasExplicitExport) {
    lines.push(`if (typeof module !== 'undefined') { module.exports = { ${exported.join(', ')} }; }`);
  }

  // v1.0.1 — native test runner. When any "test ... done" block exists, emit
  // the runner helper, register each test after its function declaration, and
  // execute them. Each failure prints a message and sets process.exitCode = 1.
  if (__testCatchers.length > 0) {
    const runner = [
      `const __tests = [];`,
      `function __check(op, a, b) {`,
      `  const ok = op === 'contains'`,
      `    ? String(a).includes(String(b))`,
      `    : op === 'is'`,
      `      ? a === b`,
      `      : op === 'raises'`,
      `        ? (() => { try { a(); } catch (e) { return String(e && e.message || '').includes(String(b)); } return false; })()`,
      `        : a === b;`,
      `  if (!ok) throw new Error('check failed: ' + op + ' ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));`,
      `}`,
      `function __runTests() {`,
      `  let __passed = 0; let __failed = 0;`,
      `  for (const __t of __tests) {`,
      `    try { __t.fn(); console.log('PASS  ' + __t.name); __passed++; }`,
      `    catch (__e) { console.error('FAIL  ' + __t.name + '\\n      ' + (__e && __e.message)); __failed++; process.exitCode = 1; }`,
      `  }`,
      `  console.log(__passed + ' passed, ' + __failed + ' failed');`,
      `}`,
    ].join('\n');
    lines.unshift(runner);
    for (const t of __testCatchers) {
      lines.push(`__tests.push({ name: ${JSON.stringify(t.name)}, fn: ${t.fnName} });`);
    }
    lines.push(`__runTests();`);
  }

  return lines.join('\n');
}

// ── v1.0.1 — test DSL bookkeeping ───────────────────────────────────────────
let __testCount = 0;
let __testCatchers = [];
let __inTest = false;

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

    // v2.1.1 — and / or / not combinators.
    case 'LogicalCondition': {
      if (cond.op === 'not') return `!(${generateCondition(cond.operand, context)})`;
      const jsOp = cond.op === 'and' ? '&&' : '||';
      return `${generateCondition(cond.left, context)} ${jsOp} ${generateCondition(cond.right, context)}`;
    }

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

    // v1.0.1 — record kinds: `define a kind called "Person" with ... done`.
    // Names are emitted as a JS factory that returns a fresh plain object with
    // declared defaults. Constructors prompt for required fields at compile
    // time via `create a Person with ...` (see GenerateExpr CreateKind).
    case 'DefineKindStatement': {
      const members = node.fields.map(f =>
        `${JSON.stringify(f.key)}: ${f.value ? generateExpr(f.value, context) : 'undefined'}`
      );
      const defaults = `{ ${members.join(', ')} }`;
      return [
        `${indent}function __makeKind_${node.name}(${node.name}Fields) {`,
        `${indent}  const __rec = ${defaults};`,
        `${indent}  if (${node.name}Fields != null) {`,
        `${indent}    for (const __k in ${node.name}Fields) {`,
        `${indent}      if (!(Object.prototype.hasOwnProperty.call(__rec, __k))) throw new Error(${JSON.stringify('"' + node.name + '" has no field named "')} + __k + ${JSON.stringify('".')});`,
        `${indent}      __rec[__k] = ${node.name}Fields[__k];`,
        `${indent}    }`,
        `${indent}  }`,
        `${indent}  return __rec;`,
        `${indent}}`,
        `${indent}const ${node.name} = __makeKind_${node.name};`,
      ].join('\n');
    }

    // v1.0.1 — load env file "<path>": apply KEY=VALUE pairs to process.env.
    // Blank lines and `#` comments are skipped; values keep their text.
    case 'LoadEnvFileStatement': {
      ensureBuiltin(context, 'dotenv');
      return `${indent}__loadEnvFile(${JSON.stringify(node.path)});`;
    }

    // v1.0.1 — native test DSL. `test "<name>" ... done` registers a runnable
    // unit; all tests are executed after the program body with a tiny runner.
    case 'TestStatement': {
      __testCount++;
      const fnName = `__testFn_${__testCount}`;
      const prevInTest = __inTest;
      __inTest = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      __inTest = prevInTest;
      __testCatchers.push({ name: node.name, fnName });
      return `${indent}function ${fnName}() {\n${body}\n${indent}}`;
    }

    // v1.0.1 — assertion `check <a> (equals|is|contains|raises) <b>`.
    // For `raises`, `a` is wrapped in a thunk so the expression is evaluated
    // inside the runner's try/catch (its thrown error is the subject).
    case 'CheckStatement': {
      if (!__inTest) {
        throw new Error('"check" can only be used inside a "test ... done" block.\n\nExample:\n  test "addition"\n    check 2 + 2 equals 4\n  done');
      }
      const a = node.op === 'raises'
        ? `(() => (${generateExpr(node.a, context)}))`
        : generateExpr(node.a, context);
      const b = generateExpr(node.b, context);
      return `${indent}__check(${JSON.stringify(node.op)}, ${a}, ${b});`;
    }

    // v1.0.1 — export <name>: mark a top-level symbol for module.exports.
    case 'ExportStatement':
      return `${indent}module.exports.${node.name} = ${node.name};`;

    // v1.0.1 — generators: `yield <expr>` (or bare `yield`).
    case 'YieldStatement': {
      if (!context.inFunction) {
        throw new Error('"yield" can only be used inside a function created with "make".\n\nExample:\n  make countUp(n)\n    let i = 0\n    while i less than n\n      i = i + 1\n      yield i\n    done\n  done');
      }
      return node.value != null
        ? `${indent}yield ${generateExpr(node.value, context)};`
        : `${indent}yield;`;
    }

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
      // reported as such, with the PlainScript context that produced them.
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
        markAsync(context);
        return `${indent}let ${node.name} = await (async () => {\n${node.body}\n${indent}})();`;
      }
      // Statement-level blocks inside functions/routes/loops, or that need
      // top-level await, retain the async-context wrapper.
      if (context.inFunction || hasTopLevelAwait) {
        markAsync(context);
        return `${indent}await (async () => {\n${node.body}\n${indent}})();`;
      }
      // Synchronous statement-level block: emit its body directly/verbatim.
      return `${indent}${node.body}`;
    }

    // ask name  /  ask "<prompt>" as name
    case 'AskStatement': {
      ensureBuiltin(context, 'ask');
      markAsync(context);
      const prompt = node.prompt != null ? JSON.stringify(node.prompt) : '"> "';
      return `${indent}let ${node.variable} = await __ask(${prompt});`;
    }

    // v2.0.1 — ocr "<image>" as <variable> [using "<lang>"]
    case 'OcrStatement': {
      ensureBuiltin(context, 'ocr');
      markAsync(context);
      const image = generateExpr(node.image, context);
      const langArg = node.lang != null ? `, ${JSON.stringify(node.lang)}` : '';
      return `${indent}let ${node.variable} = await __ocr(${image}${langArg});`;
    }

    case 'FunctionDeclaration': {
      const prevInFunction = context.inFunction;
      context.inFunction = true;
      const block = generateBlock(node.body, indent + '  ', context);
      context.inFunction = prevInFunction;
      const isAsync = block.emitted ? 'async ' : '';
      const isGen = containsYield(node.body) ? '*' : '';
      const paramStr = node.params.map(p => {
        if (typeof p === 'object') {
          if (p.defaultValue) return `${p.name} = ${generateExpr(p.defaultValue, context)}`;
          return p.name;
        }
        return p;
      }).join(', ');
      return `${indent}${isAsync}function${isGen} ${node.name}(${paramStr}) {\n${block.out}\n${indent}}`;
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
      context.loopDepth++;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      context.loopDepth--;
      return `${indent}for (const ${node.item} of ${generateExpr(node.collection, context)}) {\n${body}\n${indent}}`;
    }

    case 'ForIndexStatement': {
      context.loopDepth++;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      context.loopDepth--;
      // for index <name> in <collection> — zero-based index over a list.
      if (node.over != null) {
        const coll = generateExpr(node.over, context);
        return `${indent}for (let ${node.name} = 0; ${node.name} < ${coll}.length; ${node.name}++) {\n${body}\n${indent}}`;
      }
      const start = generateExpr(node.start, context);
      const end   = generateExpr(node.end, context);
      // Explicit step uses the user's sign; otherwise the increment follows
      // the direction of the bounds (from 5 to 1 counts down automatically).
      const inc = node.step ? generateExpr(node.step, context)
                            : `(${start} <= ${end} ? 1 : -1)`;
      // Direction-aware: "from 5 to 1" counts down even without an explicit
      // "by", while "from 1 to 5" counts up.
      const test = `(${start} <= ${end} ? ${node.name} <= ${end} : ${node.name} >= ${end})`;
      return `${indent}for (let ${node.name} = ${start}; ${test}; ${node.name} += ${inc}) {\n${body}\n${indent}}`;
    }

    case 'WhileStatement': {
      const condition = generateCondition(node.condition, context);
      context.loopDepth++;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      context.loopDepth--;
      return `${indent}while (${condition}) {\n${body}\n${indent}}`;
    }

    case 'BreakStatement': {
      if (context.loopDepth <= 0) {
        throw new Error('"break" can only be used inside a loop (for each, for index, or while).\n\nExample:\n  for each item in list\n    if done(item)\n      break\n    done\n  done');
      }
      return `${indent}break;`;
    }

    case 'ContinueStatement': {
      if (context.loopDepth <= 0) {
        throw new Error('"continue" can only be used inside a loop (for each, for index, or while).\n\nExample:\n  for each item in list\n    if skip(item)\n      continue\n    done\n  done');
      }
      return `${indent}continue;`;
    }

    case 'ThrowStatement':
      return `${indent}throw ${generateExpr(node.value, context)};`;

    // v0.3 — Express runtime

    case 'ListenStatement': {
      const prevInHandler = context.inHandler;
      context.inHandler = true;
      const block = generateBlock(node.body, indent + '  ', context);
      context.inHandler = prevInHandler;
      const handlerAsync = block.emitted ? 'async ' : '';
      return `${indent}app.listen(${generateExpr(node.port, context)}, ${handlerAsync}() => {\n${block.out}\n${indent}});`;
    }

    case 'RouteStatement': {
      _inRoute = true;
      const prevInHandler = context.inHandler;
      context.inHandler = true;
      const block = generateBlock(node.body, indent + '  ', context);
      context.inHandler = prevInHandler;
      _inRoute = false;
      const handlerAsync = block.emitted ? 'async ' : '';
      return `${indent}app.get(${JSON.stringify(routePath(node.path))}, ${handlerAsync}(req, res) => {\n${block.out}\n${indent}});`;
    }

    case 'ReplyStatement':
      if (_inTelegram) {
        markAsync(context);
        return `${indent}await Telegram.sendMessage(ctx.chatId, ${generateExpr(node.value, context)});`;
      }
      if (_inWhatsApp) {
        markAsync(context);
        ensureBuiltin(context, 'whatsapp');
        return `${indent}await __whatsappReply(__waCtx.chat, ${generateExpr(node.value, context)});`;
      }
      return `${indent}res.send(${generateExpr(node.value, context)});`;

    case 'ReplyJsonStatement': {
      const props = node.properties
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      if (_inTelegram) {
        markAsync(context);
        return `${indent}await Telegram.sendMessage(ctx.chatId, JSON.stringify({ ${props} }));`;
      }
      if (_inWhatsApp) {
        markAsync(context);
        ensureBuiltin(context, 'whatsapp');
        return `${indent}await __whatsappReply(__waCtx.chat, JSON.stringify({ ${props} }));`;
      }
      return `${indent}res.json({ ${props} });`;
    }

    // v1.2 — reply <value> with buttons … done (Telegram inline keyboard).
    // The AST stores rows of { text, data } objects (parser.js). The Telegram
    // runtime's keyboard() expects a flat list of [text, data] pairs, so each
    // button is rendered as [text, data] and rows are merged into that list.
    case 'ReplyWithButtonsStatement': {
      ensureBuiltin(context, 'telegram');
      markAsync(context);
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
      const prevInHandler = context.inHandler;
      context.inHandler = true;
      const block = generateBlock(node.body, indent + '  ', context);
      context.inHandler = prevInHandler;
      _inRoute = false;
      const handlerAsync = block.emitted ? 'async ' : '';
      return `${indent}app.${node.method}(${JSON.stringify(routePath(node.path))}, ${handlerAsync}(req, res) => {\n${block.out}\n${indent}});`;
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

    // v2.2.0 — redirect to "<url>": sends an HTTP redirect from a route.
    case 'RedirectStatement':
      if (!_inRoute) {
        throw new Error('"redirect to" can only be used inside a route handler.\n\nExample:\n  route get "/old"\n    redirect to "/new"\n  done');
      }
      return `${indent}res.redirect(${generateExpr(node.url, context)});`;

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

    // ── v2.1.1 — uploads, auth middleware, rate limiting, OAuth ────────────
    // These register Express middleware in program order; routes declared
    // after them are protected / wired accordingly.

    case 'AcceptUploadsStatement': {
      ensureBuiltin(context, 'uploads');
      const options = [];
      if (node.limitBytes != null) options.push(`limitBytes: ${node.limitBytes}`);
      if (node.mimes != null) options.push(`mimes: ${JSON.stringify(node.mimes)}`);
      if (node.folder != null) options.push(`folder: ${JSON.stringify(node.folder)}`);
      return `${indent}app.use(__uploads({ ${options.join(', ')} }));`;
    }

    // require api key from <expr> — rejects requests whose x-api-key header
    // does not match. The expected key may come from env("...") or anywhere.
    case 'RequireApiKeyStatement':
      return [
        `${indent}app.use((req, res, next) => {`,
        `${indent}  const provided = req.get('x-api-key');`,
        `${indent}  const expected = ${generateExpr(node.key, context)};`,
        `${indent}  if (!expected || provided !== String(expected)) {`,
        `${indent}    return res.status(401).json({ error: 'Unauthorized: a valid x-api-key header is required.' });`,
        `${indent}  }`,
        `${indent}  next();`,
        `${indent}});`,
      ].join('\n');

    case 'EnableSessionsStatement':
      ensureBuiltin(context, 'cookies');
      ensureBuiltin(context, 'sessions');
      return `${indent}app.use(__enableSessions(${generateExpr(node.secret, context)}));`;

    case 'RateLimitStatement':
      ensureBuiltin(context, 'ratelimit');
      return `${indent}app.use(__rateLimit({ max: ${node.max}, windowMs: ${node.windowMs} }));`;

    case 'GoogleOAuthStatement': {
      ensureBuiltin(context, 'oauth');
      const options = {};
      for (const { key, value } of node.options) {
        if (key === 'id') options.clientId = generateExpr(value, context);
        else if (key === 'secret') options.clientSecret = generateExpr(value, context);
        else if (key === 'callback') options.callbackUrl = generateExpr(value, context);
        else if (key === 'landing') options.afterLogin = generateExpr(value, context);
        else throw new Error(`Unknown google oauth option "${key}". Known options: id, secret, callback, landing.`);
      }
      for (const [plainKey, jsKey] of [['id', 'clientId'], ['secret', 'clientSecret'], ['callback', 'callbackUrl']]) {
        if (!options[jsKey]) {
          throw new Error(`google oauth is missing its "${plainKey}" option.\n\nExample:\n  google oauth\n    id is env("GOOGLE_CLIENT_ID")\n    secret is env("GOOGLE_CLIENT_SECRET")\n    callback is "http://localhost:3000/auth/google/callback"\n  done`);
        }
      }
      const parts = Object.entries(options).map(([k, v]) => `${k}: ${v}`).join(', ');
      return `${indent}__googleOAuth(app, { ${parts} });`;
    }

    // ── v2.1.1 — route-scoped state: cookies and sessions

    case 'DestroySessionStatement':
      if (!_inRoute) {
        throw new Error('"destroy session" can only be used inside a route handler.\n\nExample:\n  route post "/logout"\n    destroy session\n    reply "Logged out"\n  done');
      }
      ensureBuiltin(context, 'cookies');
      ensureBuiltin(context, 'sessions');
      return `${indent}__destroySession(req, res);`;

    case 'SetCookieStatement': {
      if (!_inRoute) {
        throw new Error('"set cookie" can only be used inside a route handler.\n\nExample:\n  route get "/login"\n    set cookie "theme" to "dark"\n  done');
      }
      const options = node.maxAgeSeconds != null
        ? `{ maxAge: ${node.maxAgeSeconds * 1000}, httpOnly: true, path: '/' }`
        : `{ httpOnly: true, path: '/' }`;
      return `${indent}res.cookie(${JSON.stringify(node.name)}, ${generateExpr(node.value, context)}, ${options});`;
    }

    case 'ClearCookieStatement':
      if (!_inRoute) {
        throw new Error('"clear cookie" can only be used inside a route handler.\n\nExample:\n  route post "/logout"\n    clear cookie "theme"\n  done');
      }
      return `${indent}res.clearCookie(${JSON.stringify(node.name)}, { path: '/' });`;

    // when nothing matches … done — the 404 catch-all. Registered in source
    // position, so it must come after every route (Express matches handlers
    // in registration order).
    case 'NotFoundStatement': {
      _inRoute = true;
      const prevInHandler = context.inHandler;
      context.inHandler = true;
      const block = generateBlock(node.body, indent + '  ', context);
      context.inHandler = prevInHandler;
      _inRoute = false;
      const handlerAsync = block.emitted ? 'async ' : '';
      return `${indent}app.use((${handlerAsync}req, res) => {\n${block.out}\n${indent}});`;
    }

    // ── v2.1.1 — error handling and retries

    case 'TryStatement': {
      const tryBody = (node.tryBody || node.body || []).map(s => generateStatement(s, indent + '  ', context)).join('\n');
      const tryBlock = `${indent}try {\n${tryBody}\n${indent}`;
      if (node.catches && node.catches.length > 0) {
        const lines = [tryBlock];
        for (let i = 0; i < node.catches.length; i++) {
          const c = node.catches[i];
          const errorName = c.name || c.param || '__plainError';
          const catchBody = c.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
          const isFirst = i === 0;
          const isLast = i === node.catches.length - 1;
          if (isFirst) {
            lines.push(`${indent}} catch (${errorName}) {`);
          }
          if (c.errorType) {
            const cond = isFirst ? 'if' : 'else if';
            lines.push(`${indent}  ${cond} (${errorName} instanceof ${c.errorType}) {`);
            lines.push(catchBody);
            lines.push(`${indent}  }`);
            if (isLast) lines.push(`${indent}}`);
          } else {
            if (isFirst && isLast) {
              lines.push(catchBody);
              lines.push(`${indent}}`);
            } else {
              lines.push(`${indent}  else {`);
              lines.push(catchBody);
              lines.push(`${indent}  }`);
              if (isLast) lines.push(`${indent}}`);
            }
          }
        }
        return lines.join('\n');
      }
      let out = tryBlock;
      if (node.recoverBody) {
        const errorName = node.catchName || '__plainError';
        const recoverBody = node.recoverBody.map(s => generateStatement(s, indent + '  ', context)).join('\n');
        out += ` catch (${errorName}) {\n${recoverBody}\n${indent}}`;
      } else {
        out += `${indent}} catch (__plainError) {}`;
      }
      return out;
    }

    case 'RetryStatement': {
      ensureBuiltin(context, 'retry');
      markAsync(context);
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return [
        `${indent}for (let __plainAttempt = 1; __plainAttempt <= ${node.attempts}; __plainAttempt++) {`,
        `${indent}  try {`,
        body,
        `${indent}    break;`,
        `${indent}  } catch (__plainRetryError) {`,
        `${indent}    if (__plainAttempt >= ${node.attempts}) console.error(__plainRetryError);`,
        `${indent}    else await __retrySleep(${Math.round(node.delaySeconds * 1000)});`,
        `${indent}  }`,
        `${indent}}`,
      ].join('\n');
    }

    case 'StartStatement':
      return `${indent}app.listen(${generateExpr(node.port, context)});`;

    // v0.6 — SQLite DX. v2.1.0 adds parameterized SQL, captured results and
    // transactions; the driver switches to PostgreSQL when a "postgres"
    // declaration is active.

    // database "<file>" [using "<driver>"] — v2.1.1 opens through the
    // portable engine chain: better-sqlite3 when its native binding works on
    // this machine, sql.js otherwise ("using" forces one engine). The opened
    // handle exposes the same prepare/exec/transaction surface either way,
    // so every generated SQL statement below is unchanged.
    case 'DatabaseStatement': {
      _sqlDriver = 'sqlite';
      _sqlClientVar = 'db';
      ensureBuiltin(context, 'sqlite');
      markAsync(context);
      const driverArg = node.driver ? JSON.stringify(node.driver) : 'null';
      return `${indent}const db = await __dbOpen(${JSON.stringify(node.file)}, ${driverArg});`;
    }

    // v2.1.0 — postgres "<connection>": node-postgres pool bound to "db".
    // Every SQL statement afterwards compiles to async pool queries.
    case 'PostgresStatement': {
      _sqlDriver = 'pg';
      _sqlClientVar = 'db';
      markAsync(context);
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
        markAsync(context);
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
      markAsync(context);
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
      markAsync(context);
      _inTelegram = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inTelegram = false;
      return `${indent}BOT.onCallback(${JSON.stringify(node.data)}, async (ctx) => {\n${body}\n${indent}});`;
    }

    case 'TelegramStartStatement': {
      ensureBuiltin(context, 'telegram');
      markAsync(context);
      return `${indent}await BOT.start();`;
    }

    // ── v2.1.1 — WhatsApp statements ────────────────────────────────────────

    // whatsapp bot … done — starts the Baileys runtime with the declared
    // auth folder and login mode, then registers every "on message" handler.
    case 'WhatsAppBotStatement': {
      ensureBuiltin(context, 'whatsapp');
      markAsync(context);
      // v2.1.2 — the pairing phone may be a compile-time literal or any
      // PlainScript expression (e.g. a variable filled by `ask`). Runtime values
      // are normalized/validated by __waNormalizePhone at startup.
      let loginArg;
      if (node.login.mode === 'pairing') {
        loginArg = node.login.phoneExpr != null
          ? `{ mode: 'pairing', phone: (${generateExpr(node.login.phoneExpr, context)}) }`
          : `{ mode: 'pairing', phone: ${JSON.stringify(node.login.phone)} }`;
      } else {
        loginArg = `{ mode: 'qr' }`;
      }
      const lines = [
        `${indent}await __whatsappStart({`,
        `${indent}  folder: ${JSON.stringify(node.authFolder)},`,
        `${indent}  login: ${loginArg},`,
        `${indent}});`,
      ];
      for (const handlerNode of node.handlers) {
        const generated = generateStatement(handlerNode, indent, context);
        if (generated) lines.push(generated);
      }
      return lines.join('\n');
    }

    // on message … done — registers the handler that receives each incoming
    // WhatsApp message as a normalized PlainScript record on `message`.
    case 'WhatsAppOnMessageStatement': {
      ensureBuiltin(context, 'whatsapp');
      markAsync(context);
      const prevInWhatsApp = _inWhatsApp;
      _inWhatsApp = true;
      const body = node.body.map(s => generateStatement(s, indent + '  ', context)).join('\n');
      _inWhatsApp = prevInWhatsApp;
      return [
        `${indent}__whatsappOnMessage(async (__waCtx) => {`,
        body,
        `${indent}});`,
      ].join('\n');
    }

    // log message — prints the current message record. Handler-only by
    // design: outside "on message" there is no message to log.
    case 'WhatsAppLogStatement':
      if (!_inWhatsApp) {
        throw new Error('"log message" can only be used inside an "on message" block.\n\nExample:\n  whatsapp bot\n      on message\n          log message\n      done\n  done');
      }
      ensureBuiltin(context, 'whatsapp');
      return `${indent}console.log(__waCtx.message);`;

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
        `${indent}setImmediate(async () => {`,
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

    // ── IOPL-native features ──────────────────────────────────────────────

    case 'GatherStatement': {
      const coll = generateExpr(node.collection, context);
      const body = generateExpr(node.body, context);
      return `${indent}${coll} = ${coll}.map(${node.item} => ${body});`;
    }

    case 'FilterStatement': {
      const coll = generateExpr(node.collection, context);
      const cond = generateCondition(node.condition, context);
      return `${indent}${coll} = ${coll}.filter(${node.item} => ${cond});`;
    }

    case 'TotalStatement': {
      const coll = generateExpr(node.collection, context);
      const body = generateExpr(node.body, context);
      return `${indent}${coll} = ${coll}.reduce((__sum, ${node.item}) => __sum + ${body}, 0);`;
    }

    case 'MatchStatement': {
      const value = generateExpr(node.value, context);
      const lines = [`${indent}switch (${value}) {`];
      for (const c of node.cases) {
        const testVal = generateExpr(c.test, context);
        lines.push(`${indent}  case ${testVal}:`);
        for (const s of c.body) lines.push(generateStatement(s, indent + '    ', context));
        lines.push(`${indent}    break;`);
      }
      if (node.defaultCase) {
        lines.push(`${indent}  default:`);
        for (const s of node.defaultCase) lines.push(generateStatement(s, indent + '    ', context));
        lines.push(`${indent}    break;`);
      }
      lines.push(`${indent}}`);
      return lines.join('\n');
    }

    case 'RegexMatchStatement': {
      const source = generateExpr(node.source, context);
      const pattern = typeof node.pattern === 'string' ? JSON.stringify(node.pattern) : generateExpr(node.pattern, context);
      return `${indent}const ${node.name} = ${source}.match(new RegExp(${pattern}));`;
    }

    case 'EmitStatement': {
      ensureBuiltin(context, '__emitter');
      const event = typeof node.event === 'string' ? JSON.stringify(node.event) : generateExpr(node.event, context);
      const data = node.data ? generateExpr(node.data, context) : '';
      return `${indent}__emitter.emit(${event}${data ? ', ' + data : ''});`;
    }

    case 'WhenHappensStatement': {
      ensureBuiltin(context, '__emitter');
      const event = typeof node.event === 'string' ? JSON.stringify(node.event) : generateExpr(node.event, context);
      const body = (node.body || []).map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}__emitter.on(${event}, (${node.paramName}) => {\n${body}\n${indent}});`;
    }

    case 'StreamStatement': {
      ensureBuiltin(context, '__streamFile');
      markAsync(context);
      const filename = generateExpr(node.filename, context);
      const body = (node.body || []).map(s => generateStatement(s, indent + '  ', context)).join('\n');
      return `${indent}await __streamFile(${filename}, async (${node.paramName}) => {\n${body}\n${indent}});`;
    }

    case 'RunParallelStatement': {
      markAsync(context);
      const body = (node.body || []).map(s => generateStatement(s, indent + '  ', context)).join('\n');
      const resultName = node.resultName || '__parallelResults';
      return `${indent}const ${resultName} = await Promise.all([(async () => {\n${body}\n${indent}})()]);`;
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
    // v2.1.1 — boolean and null literals are PlainScript keywords.
    case 'BooleanLiteral':   return String(node.value);
    case 'NullLiteral':      return 'null';
    // v2.1.1 — arithmetic: unary minus (binary + - * / % reuse
    // BinaryExpression). Binary operands need parentheses so that
    // -(2 + 3) does not flatten to -2 + 3.
    case 'UnaryExpression':
      return `${node.operator}${node.operand.type === 'BinaryExpression'
        ? `(${generateExpr(node.operand, context)})`
        : generateExpr(node.operand, context)}`;
    // v2.1.1 — wait for <expr>: awaits an async value (fetch promises,
    // async functions called from PlainScript, etc.).
    case 'AwaitExpression': {
      markAsync(context);
      return `(await ${generateExpr(node.value, context)})`;
    }
    // v2.1.1 — HTTP client: get/post/put/patch/delete "<url>" with clauses.
    case 'HttpCall': {
      ensureBuiltin(context, 'http');
      markAsync(context);
      const options = [];
      if (node.body != null) options.push(`body: ${generateExpr(node.body, context)}`);
      if (node.headers != null) options.push(`headers: ${generateExpr(node.headers, context)}`);
      if (node.timeout != null) options.push(`timeoutMs: ${generateExpr(node.timeout, context)}`);
      return `await __httpRequest('${node.method.toUpperCase()}', ${generateExpr(node.url, context)}, { ${options.join(', ')} })`;
    }

    // Backtick template literal: emit as a JavaScript template literal.
    // Content is preserved verbatim (interpolation, whitespace, line breaks).
    // Only literal backtick characters inside the content need escaping.
    case 'TemplateLiteral': {
      const escaped = node.value.replace(/`/g, '\\`');
      return '`' + escaped + '`';
    }

    case 'Identifier': {
      // Inside route handlers, remap PlainScript's request/response to req/res
      if (_inRoute && node.name === 'request')  return 'req';
      if (_inRoute && node.name === 'response') return 'res';
      // Inside WhatsApp "on message" handlers, PlainScript's "message" is the
      // normalized record of the current delivery.
      if (_inWhatsApp && node.name === 'message') return '__waCtx.message';
      return node.name;
    }

    // Nested binary operands get parentheses so (2 + 3) * 4 keeps its
    // grouping instead of flattening to 2 + 3 * 4.
    case 'BinaryExpression': {
      const left = node.left.type === 'BinaryExpression'
        ? `(${generateExpr(node.left, context)})`
        : generateExpr(node.left, context);
      const right = node.right.type === 'BinaryExpression'
        ? `(${generateExpr(node.right, context)})`
        : generateExpr(node.right, context);
      return `${left} ${node.operator} ${right}`;
    }

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
      // Method call: receiver.method(args). Member access invoked with parens —
      // e.g. path.join("a", "b"), mrz.parse(line), fs.existsSync(("x")).
      if (node.callee) {
        const args = node.args.map(arg => generateExpr(arg, context)).join(', ');
        return `${generateExpr(node.callee, context)}(${args})`;
      }
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
    case 'OfExpression': {
      // v2.1.1 — "session of request" / "user of request" read server-side
      // state managed by the session and OAuth runtimes.
      if (node.object.type === 'Identifier' && node.object.name === 'request' &&
          node.property.type === 'Identifier') {
        if (node.property.name === 'session') {
          routeOnly('session of request', 'route get "/me"\n    show session of request');
          ensureBuiltin(context, 'sessions');
          return '__sessionOf(req)';
        }
        if (node.property.name === 'user') {
          routeOnly('user of request', 'route get "/me"\n    show user of request');
          ensureBuiltin(context, 'sessions');
          return '__userOf(req)';
        }
      }
      return `${generateExpr(node.object, context)}.${generateExpr(node.property, context)}`;
    }

    // v1.1 — Collection operations
    case 'AddCall':
      return `${generateExpr(node.collection, context)}.push(${generateExpr(node.value, context)})`;

    case 'RemoveCall':
      return `${generateExpr(node.collection, context)}.splice(${generateExpr(node.collection, context)}.indexOf(${generateExpr(node.value, context)}), 1)`;

    case 'WriteCall':
      ensureBuiltin(context, 'fs');
      return `fs.writeFileSync(${generateExpr(node.data, context)}, ${generateExpr(node.file, context)}, 'utf8')`;

    // v1.0.1 — record constructor: `create a Person with name "Ada" and age 17`
    // calls the kind factory that `define a kind called "Person"` registered.
    case 'CreateKindExpression': {
      const fields = node.pairs
        .map(p => `${JSON.stringify(p.key)}: ${generateExpr(p.value, context)}`)
        .join(', ');
      return `${node.kind}({ ${fields} })`;
    }

    // v1.0.1 — concurrency combinators: `all of [...]` / `any of [...]` /
    // `settled of [...]`. All are awaited; `settled` returns status records.
    case 'ConcurrencyExpression': {
      markAsync(context);
      const rhs = generateExpr(node.items, context);
      if (node.combo === 'any') return `(await Promise.race(${rhs}))`;
      if (node.combo === 'settled') return `(await Promise.allSettled(${rhs}))`;
      return `(await Promise.all(${rhs}))`;
    }

    // v1.0.1 — `spread of <collection>` → a fresh array from an iterable.
    case 'SpreadExpression':
      return `[...${generateExpr(node.collection, context)}]`;

    default:
      throw new Error(`Unknown expression type "${node.type}".`);
  }
}

module.exports = { generate, createGenerationContext, wrapAsync };
