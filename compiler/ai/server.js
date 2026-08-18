#!/usr/bin/env node
// Hosted AI compiler HTTP service (RFC-0020 §46).
//
// Serves the deterministic-first AI compilation pipeline over HTTP so Plain
// CLI users never need their own provider credential — the provider API key
// lives only in this service's environment (MISTRAL_API_KEY) and is never
// returned, logged, or embedded in generated JavaScript.
//
//   POST /translate   { "source": "...", "rule": "bots/telegram"?, "options": {...}? }
//   GET  /            service health
//   GET  /health      service health
//
// Run with:  npm start   (or: node compiler/ai/server.js)
// Listens on $PORT (Render provides it) or 3000.

const http = require('http');

const { compileSource } = require('./translator');
const { config } = require('./client');
const { VERSION } = require('../version');

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const err = new Error('Request body too large (max 1 MiB).');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text.trim() ? JSON.parse(text) : {});
      } catch (_) {
        const err = new Error('Request body must be valid JSON.');
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Never let the provider key escape into error text or logs.
function scrubKey(text, apiKey) {
  if (!apiKey || apiKey.length < 4 || typeof text !== 'string') return text;
  return text.split(apiKey).join('[REDACTED]');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  try {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end(body);
  } catch (_) {
    // The socket may already be closed; nothing more can be sent.
  }
}

function layerStatus(layer) {
  switch (layer) {
    case 'rule':
    case 'validation':
      return 422;
    case 'config':
      return 500;
    default:
      return 502;
  }
}

function health() {
  return { ok: true, service: 'plain-code-compiler', version: VERSION };
}

function handleTranslate(req, res, client) {
  readBody(req).then(async (body) => {
    const source = typeof body.source === 'string' ? body.source : '';
    if (!source.trim()) {
      return sendJson(res, 400, {
        error: { layer: 'request', message: '"source" is required.' },
      });
    }

    // The service owns the provider credential. A test-injected client also
    // counts as a provider. Without either, refuse — never loop back to the
    // hosted service, and never ask the client for a key.
    if (!client && !config().enabled) {
      return sendJson(res, 500, {
        error: {
          layer: 'config',
          message: 'The compiler service is not configured. Set MISTRAL_API_KEY on the server.',
        },
      });
    }

    const options = {};
    if (body.rule) options.rulePath = body.rule;
    if (body.options && body.options.noCache === true) options.noCache = true;
    if (client) options.client = client;

    try {
      const result = await compileSource(source, options);

      // Defense against a provider leaking the credential into generated code.
      const apiKey = config().apiKey;
      if (apiKey && typeof result.javascript === 'string' && result.javascript.includes(apiKey)) {
        return sendJson(res, 502, {
          error: {
            layer: 'validation',
            message: 'The provider leaked a credential into the generated code. Refusing to serve it.',
          },
        });
      }

      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, layerStatus(err.layer), {
        error: { layer: err.layer || 'server', message: scrubKey(err.message, config().apiKey) },
      });
    }
  }).catch((err) => {
    sendJson(res, err.statusCode || 500, {
      error: { layer: 'server', message: scrubKey(err.message, config().apiKey) },
    });
  });
}

function createServer(options = {}) {
  const client = options.client || null;
  return http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const method = req.method || 'GET';

    if (method === 'OPTIONS') return sendJson(res, 204, {});
    if (method === 'GET' && (url === '/' || url === '/health')) return sendJson(res, 200, health());
    if (method === 'POST' && url === '/translate') return handleTranslate(req, res, client);

    sendJson(res, 404, { error: { layer: 'request', message: `Not found: ${method} ${url}` } });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Plain AI compiler service listening on port ${port}`);
    if (!config().enabled) {
      console.warn('Warning: MISTRAL_API_KEY is not set. /translate will refuse requests until it is.');
    }
  });
}

module.exports = { createServer, health, layerStatus, MAX_BODY_BYTES };
