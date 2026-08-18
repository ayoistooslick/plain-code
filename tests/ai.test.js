// Tests for the Plain AI-assisted compilation layer (RFC-0020).
//
// Covers the rule resolver, AI output validator, translation cache, the
// deterministic-first translator (with a mocked provider), and the public AI
// API. Run with: node tests/ai.test.js
//
// The provider is always mocked — these tests never make network calls and
// never require MISTRAL_API_KEY.

const fs   = require('fs');
const http = require('http');
const os   = require('os');
const path = require('path');

// Isolate the AI cache into a temp directory before the modules load.
const TMP_CACHE = path.join(os.tmpdir(), `plain-ai-test-${process.pid}`);
process.env.PLAIN_AI_CACHE_DIR = TMP_CACHE;

const { loadRules, resolveRule, ruleMarkdown } = require('../compiler/ai/resolver');
const { validateTranslation } = require('../compiler/ai/validator');
const { computeKey, get, set, list, clear } = require('../compiler/ai/cache');
const { translateSource, compileSource } = require('../compiler/ai/translator');
const { extractJson } = require('../compiler/ai/agent');
const ai = require('../compiler/ai');
const { createServer } = require('../compiler/ai/server');
const { translateRemote, HOSTED_URL } = require('../compiler/ai/remote');

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      pending.push(r.then(
        () => { console.log(`  PASS  ${name}`); passed++; },
        (e) => { console.log(`  FAIL  ${name}`); console.log(`        ${e.message}`); failed++; }
      ));
    } else {
      console.log(`  PASS  ${name}`);
      passed++;
    }
  } catch (e) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

// ── Rule resolver ───────────────────────────────────────────────────────────

console.log('\nRule resolver');

test('resolver: loads the shipped rules with metadata', () => {
  const rules = loadRules();
  const ids = rules.map(r => r._id).sort();
  if (!ids.includes('bots/telegram')) throw new Error(`missing telegram rule: ${ids.join(', ')}`);
  if (!ids.includes('http/fetch')) throw new Error(`missing fetch rule: ${ids.join(', ')}`);
  if (!ids.includes('web/rest-api')) throw new Error(`missing rest-api rule: ${ids.join(', ')}`);
  const tg = rules.find(r => r._id === 'bots/telegram');
  if (!tg.dependencies.includes('node-telegram-bot-api')) throw new Error('telegram dependency missing');
  if (typeof tg.version !== 'number') throw new Error('rule version must be a number');
});

test('resolver: matches telegram source', () => {
  const rule = resolveRule('remember bot as telegram bot with token');
  if (!rule || rule._id !== 'bots/telegram') throw new Error(`wrong rule: ${rule && rule._id}`);
});

test('resolver: matches fetch source', () => {
  const rule = resolveRule('remember response as await fetch "https://facts.com"');
  if (!rule || rule._id !== 'http/fetch') throw new Error(`wrong rule: ${rule && rule._id}`);
});

test('resolver: matches rest-api source', () => {
  const rule = resolveRule('remember app as express app');
  if (!rule || rule._id !== 'web/rest-api') throw new Error(`wrong rule: ${rule && rule._id}`);
});

test('resolver: returns null for unsupported source', () => {
  const rule = resolveRule('wibble wobble nonsense');
  if (rule) throw new Error(`expected null, got ${rule._id}`);
});

test('resolver: explicit rulePath selection wins', () => {
  const rule = resolveRule('anything at all', null, { rulePath: 'bots/telegram' });
  if (!rule || rule._id !== 'bots/telegram') throw new Error('explicit selection failed');
});

test('resolver: rule markdown companion is loadable', () => {
  const rule = resolveRule('remember bot as telegram bot with token');
  const md = ruleMarkdown(rule);
  if (!md.includes('node-telegram-bot-api')) throw new Error('markdown missing dependency docs');
});

// ── Output validator ─────────────────────────────────────────────────────────

console.log('\nOutput validator');

test('validator: accepts a valid telegram translation', () => {
  const out = {
    javascript:
      'const TelegramBot = require("node-telegram-bot-api");\n' +
      'const bot = new TelegramBot(token, { polling: true });\n' +
      'bot.onText(/^\\/start$/, async (msg) => {\n' +
      '  const chatId = msg.chat.id;\n' +
      '  await bot.sendMessage(chatId, "Hello from Plain!");\n' +
      '});',
    dependencies: ['node-telegram-bot-api'],
    imports: [],
    async: true,
  };
  validateTranslation(out); // must not throw
});

test('validator: rejects non-object output', () => {
  let threw = false;
  try { validateTranslation('nope'); } catch (e) { threw = true; if (e.layer !== 'validation') throw new Error('wrong layer'); }
  if (!threw) throw new Error('expected a throw');
});

test('validator: rejects missing javascript', () => {
  let threw = false;
  try { validateTranslation({ dependencies: [] }); } catch (e) { threw = true; if (!/javascript/.test(e.message)) throw new Error(`wrong message: ${e.message}`); }
  if (!threw) throw new Error('expected a throw');
});

test('validator: rejects invalid JS syntax', () => {
  let threw = false;
  try { validateTranslation({ javascript: 'const = ;' }); } catch (e) { threw = true; if (!/syntax/i.test(e.message)) throw new Error(`wrong message: ${e.message}`); }
  if (!threw) throw new Error('expected a throw');
});

test('validator: rejects eval', () => {
  let threw = false;
  try { validateTranslation({ javascript: 'eval(userInput)' }); } catch (e) { threw = true; if (!/forbidden/i.test(e.message)) throw new Error(`wrong message: ${e.message}`); }
  if (!threw) throw new Error('expected a throw');
});

test('validator: rejects undeclared require', () => {
  let threw = false;
  try { validateTranslation({ javascript: 'require("crypto-secret-lib")' }); } catch (e) { threw = true; if (!/dependencies/i.test(e.message)) throw new Error(`wrong message: ${e.message}`); }
  if (!threw) throw new Error('expected a throw');
});

// ── Agent response parsing ───────────────────────────────────────────────────

console.log('\nAgent response parsing');

test('agent: extractJson tolerates markdown fences', () => {
  const out = extractJson('```json\n{"javascript":"const x = 1;","dependencies":[],"imports":[],"async":false}\n```');
  if (out.javascript !== 'const x = 1;') throw new Error(`failed to parse fenced json: ${JSON.stringify(out)}`);
});

test('agent: extractJson rejects non-JSON prose', () => {
  let threw = false;
  try { extractJson('Sure, here is the code you asked for!'); } catch (e) { threw = true; }
  if (!threw) throw new Error('expected a throw');
});

// ── Translation cache ────────────────────────────────────────────────────────

console.log('\nTranslation cache');

test('cache: set/get roundtrip and key sensitivity', () => {
  clear();
  const k1 = computeKey({ a: 1, source: 'one' });
  const k2 = computeKey({ a: 1, source: 'two' });
  if (k1 === k2) throw new Error('keys must differ when the source differs');
  set(k1, { value: 42 });
  const v = get(k1);
  if (!v || v.value !== 42) throw new Error('cache get failed');
  clear();
  if (get(k1)) throw new Error('cache clear failed');
});

// ── Translator (deterministic-first, mocked provider) ───────────────────────

console.log('\nTranslator');

test('compileSource: deterministic source never touches the AI layer', async () => {
  const client = { chat: async () => { throw new Error('AI must not be called for deterministic syntax'); } };
  const result = await compileSource('show "hello"', { client });
  if (!result.deterministic) throw new Error('expected a deterministic result');
  if (!result.javascript.includes('console.log')) throw new Error('expected console.log in output');
});

test('translator: telegram source produces validated output via mock provider', async () => {
  const source = 'remember bot as telegram bot with token';
  const client = { chat: async () => JSON.stringify({
    javascript:
      'const TelegramBot = require("node-telegram-bot-api");\n' +
      'const bot = new TelegramBot(token, { polling: true });',
    dependencies: ['node-telegram-bot-api'],
    imports: [],
    async: true,
  }) };
  const result = await translateSource(source, { client, noCache: true });
  if (result.deterministic !== false) throw new Error('expected the AI path');
  if (!result.javascript.includes('TelegramBot')) throw new Error('missing generated code');
  if (!result.dependencies.includes('node-telegram-bot-api')) throw new Error('missing dependency');
  if (result.rule !== 'bots/telegram') throw new Error(`wrong rule: ${result.rule}`);
});

test('translator: cache hit avoids a second provider call', async () => {
  clear();
  let calls = 0;
  const client = { chat: async () => { calls++; return JSON.stringify({ javascript: 'const x = 1;', dependencies: [], imports: [], async: false }); } };
  const source = 'remember bot as telegram bot with token';
  await translateSource(source, { client });
  const second = await translateSource(source, { client });
  if (!second.cached) throw new Error('expected a cache hit');
  if (calls !== 1) throw new Error(`expected 1 provider call, got ${calls}`);
  clear();
});

test('translator: missing rule produces a layer-specific rule error', async () => {
  let threw = null;
  try {
    await translateSource('some totally unsupported wording', { noCache: true });
  } catch (e) {
    threw = e;
  }
  if (!threw) throw new Error('expected a throw');
  if (threw.layer !== 'rule') throw new Error(`expected rule layer, got ${threw.layer}`);
  if (!/no rule covers/.test(threw.message)) throw new Error(`wrong message: ${threw.message}`);
});

test('translator: malformed AI output fails compilation cleanly', async () => {
  const client = { chat: async () => '{"javascript": oops}' };
  let threw = null;
  try {
    await translateSource('remember bot as telegram bot with token', { client, noCache: true });
  } catch (e) {
    threw = e;
  }
  if (!threw) throw new Error('expected a throw');
  if (!/malformed/i.test(threw.message)) throw new Error(`wrong message: ${threw.message}`);
});

// ── Public AI API ────────────────────────────────────────────────────────────

console.log('\nPublic AI API');

test('ai index: status reports rules and cache', () => {
  const s = ai.aiStatus();
  if (s.ruleCount < 3) throw new Error(`expected at least 3 rules, got ${s.ruleCount}`);
  if (typeof s.enabled !== 'boolean') throw new Error('enabled must be a boolean');
  if (typeof s.model !== 'string' || !s.model) throw new Error('model must be a string');
});

test('ai index: aiRules lists rule metadata', () => {
  const rules = ai.aiRules();
  const tg = rules.find(r => r.id === 'bots/telegram');
  if (!tg) throw new Error('telegram rule missing from aiRules');
  if (!Array.isArray(tg.dependencies)) throw new Error('dependencies must be an array');
});

// ── Hosted compiler service (HTTP) ───────────────────────────────────────────

console.log('\nHosted compiler service (HTTP)');

// These tests start a real HTTP service (compiler/ai/server.js) on an ephemeral
// port and exercise the same shared pipeline over the wire. Several of them
// mutate MISTRAL_API_KEY / PLAIN_AI_REMOTE_URL, so they are serialized on a
// chain to guarantee deterministic ordering.

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function stop(server) {
  return new Promise((resolve) => server.close(resolve));
}

function httpRequest(port, method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      } : {},
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, data: parsed || data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function mockTelegramClient() {
  return { chat: async () => JSON.stringify({
    javascript:
      'const TelegramBot = require("node-telegram-bot-api");\n' +
      'const bot = new TelegramBot(token, { polling: true });',
    dependencies: ['node-telegram-bot-api'],
    imports: [],
    async: true,
  }) };
}

const TELEGRAM_SOURCE = 'remember bot as telegram bot with token';

const pendingHttp = [];
let lastHttpTest = Promise.resolve();

function testHttp(name, fn) {
  const run = () => fn().then(
    () => { console.log(`  PASS  ${name}`); passed++; },
    (e) => { console.log(`  FAIL  ${name}`); console.log(`        ${e.message}`); failed++; },
  );
  lastHttpTest = lastHttpTest.then(run, run);
  pendingHttp.push(lastHttpTest);
}

test('hosted service: HOSTED_URL points at the Render deployment', () => {
  if (HOSTED_URL !== 'https://plain-code-compiler.onrender.com') {
    throw new Error(`unexpected hosted URL: ${HOSTED_URL}`);
  }
});

testHttp('hosted service: /health reports the service', async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'GET', '/health');
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    if (!res.data || res.data.ok !== true) throw new Error('missing ok flag');
    if (!res.data.service) throw new Error('missing service name');
  } finally {
    await stop(server);
  }
});

testHttp('hosted service: /translate returns a validated contract via the shared pipeline', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'POST', '/translate',
      { source: TELEGRAM_SOURCE, options: { noCache: true } });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.deterministic !== false) throw new Error('expected the AI path');
    if (!res.data.javascript.includes('TelegramBot')) throw new Error('missing generated code');
    if (!res.data.dependencies.includes('node-telegram-bot-api')) throw new Error('missing dependency');
    if (res.data.rule !== 'bots/telegram') throw new Error(`wrong rule: ${res.data.rule}`);
  } finally {
    await stop(server);
  }
});

testHttp('hosted service: rejects requests when no provider is configured', async () => {
  const hadKey = process.env.MISTRAL_API_KEY;
  delete process.env.MISTRAL_API_KEY;
  delete process.env.PLAIN_AI_API_KEY;
  const server = createServer();
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'POST', '/translate', { source: TELEGRAM_SOURCE });
    if (res.status !== 500) throw new Error(`expected 500, got ${res.status}`);
    if (!res.data.error || !/MISTRAL_API_KEY|PLAIN_AI_API_KEY/.test(res.data.error.message)) {
      throw new Error(`expected a config error, got: ${JSON.stringify(res.data)}`);
    }
  } finally {
    await stop(server);
    if (hadKey) process.env.MISTRAL_API_KEY = hadKey;
    else delete process.env.MISTRAL_API_KEY;
  }
});

testHttp('hosted service: missing source is a 400', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'POST', '/translate', {});
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  } finally {
    await stop(server);
  }
});

testHttp('hosted service: no matching rule maps to a 422 rule error', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'POST', '/translate', { source: 'wibble wobble nonsense' });
    if (res.status !== 422) throw new Error(`expected 422, got ${res.status}`);
    if (!res.data.error || res.data.error.layer !== 'rule') {
      throw new Error(`expected a rule-layer error, got: ${JSON.stringify(res.data)}`);
    }
  } finally {
    await stop(server);
  }
});

testHttp('hosted service: validation failures map to a 422', async () => {
  const server = createServer({
    client: { chat: async () => JSON.stringify({
      javascript: 'const = ;',
      dependencies: [],
      imports: [],
      async: false,
    }) },
  });
  const port = await listen(server);
  try {
    const res = await httpRequest(port, 'POST', '/translate', { source: TELEGRAM_SOURCE });
    if (res.status !== 422) throw new Error(`expected 422, got ${res.status}: ${JSON.stringify(res.data)}`);
    if (!/validation/i.test(res.data.error.message)) {
      throw new Error(`expected a validation error, got: ${JSON.stringify(res.data)}`);
    }
  } finally {
    await stop(server);
  }
});

testHttp('remote: translateRemote posts to the service and returns the validated contract', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  const hadRemote = process.env.PLAIN_AI_REMOTE_URL;
  process.env.PLAIN_AI_REMOTE_URL = `http://127.0.0.1:${port}`;
  try {
    const result = await translateRemote(TELEGRAM_SOURCE, { noCache: true });
    if (!result.javascript.includes('TelegramBot')) throw new Error('missing generated code');
    if (result.rule !== 'bots/telegram') throw new Error(`wrong rule: ${result.rule}`);
  } finally {
    if (hadRemote) process.env.PLAIN_AI_REMOTE_URL = hadRemote;
    else delete process.env.PLAIN_AI_REMOTE_URL;
    await stop(server);
  }
});

testHttp('remote: a rule-layer error from the service is surfaced with its layer', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  const hadRemote = process.env.PLAIN_AI_REMOTE_URL;
  process.env.PLAIN_AI_REMOTE_URL = `http://127.0.0.1:${port}`;
  let threw = null;
  try {
    await translateRemote('wibble wobble nonsense', { noCache: true });
  } catch (e) {
    threw = e;
  } finally {
    if (hadRemote) process.env.PLAIN_AI_REMOTE_URL = hadRemote;
    else delete process.env.PLAIN_AI_REMOTE_URL;
    await stop(server);
  }
  if (!threw) throw new Error('expected a throw');
  if (threw.layer !== 'rule') throw new Error(`expected rule layer, got ${threw.layer}`);
});

testHttp('translator: routes to the hosted service when no local key is configured', async () => {
  const server = createServer({ client: mockTelegramClient() });
  const port = await listen(server);
  const hadKey = process.env.MISTRAL_API_KEY;
  const hadRemote = process.env.PLAIN_AI_REMOTE_URL;
  delete process.env.MISTRAL_API_KEY;
  delete process.env.PLAIN_AI_API_KEY;
  process.env.PLAIN_AI_REMOTE_URL = `http://127.0.0.1:${port}`;
  try {
    const result = await translateSource(TELEGRAM_SOURCE, { noCache: true });
    if (result.deterministic !== false) throw new Error('expected the AI path');
    if (!result.javascript.includes('TelegramBot')) throw new Error('missing generated code');
    if (result.rule !== 'bots/telegram') throw new Error(`wrong rule: ${result.rule}`);
  } finally {
    if (hadKey) process.env.MISTRAL_API_KEY = hadKey;
    else delete process.env.MISTRAL_API_KEY;
    if (hadRemote) process.env.PLAIN_AI_REMOTE_URL = hadRemote;
    else delete process.env.PLAIN_AI_REMOTE_URL;
    await stop(server);
  }
});

testHttp('translator: an injected client uses the local pipeline, never the hosted service', async () => {
  const hadKey = process.env.MISTRAL_API_KEY;
  const hadRemote = process.env.PLAIN_AI_REMOTE_URL;
  process.env.MISTRAL_API_KEY = 'test-local-key';
  process.env.PLAIN_AI_REMOTE_URL = 'http://127.0.0.1:1';
  try {
    const result = await translateSource(TELEGRAM_SOURCE, { noCache: true, client: mockTelegramClient() });
    if (result.deterministic !== false) throw new Error('expected the AI path');
    if (!result.javascript.includes('TelegramBot')) throw new Error('missing generated code');
  } finally {
    if (hadKey) process.env.MISTRAL_API_KEY = hadKey;
    else delete process.env.MISTRAL_API_KEY;
    if (hadRemote) process.env.PLAIN_AI_REMOTE_URL = hadRemote;
    else delete process.env.PLAIN_AI_REMOTE_URL;
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────

Promise.all(pending.concat(pendingHttp)).then(() => {
  try { clear(); fs.rmSync(TMP_CACHE, { recursive: true, force: true }); } catch (_) {}
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
