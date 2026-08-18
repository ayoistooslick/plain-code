// AI provider client (RFC-0020 §9–§10).
//
// A thin, provider-agnostic HTTP client. The default configuration targets
// Mistral and everything is read from the environment —
// no secrets are hard-coded anywhere in the repository.
//
//   MISTRAL_API_KEY=...
//   PLAIN_AI_BASE_URL=https://api.mistral.ai
//   PLAIN_AI_MODEL=mistral-small-latest
//
// The endpoint speaks the OpenAI-compatible chat completions protocol so that
// future providers (Groq, etc.) can be used without changing the compiler.

const http  = require('http');
const https = require('https');

const DEFAULTS = {
  baseUrl: 'https://api.mistral.ai',
  model:   'mistral-small-latest',
};

// Current provider configuration from the environment (RFC-0020 §9).
// Accepts MISTRAL_API_KEY (preferred) or PLAIN_AI_API_KEY (legacy).
function config() {
  const apiKey = process.env.MISTRAL_API_KEY || process.env.PLAIN_AI_API_KEY || '';
  return {
    apiKey,
    baseUrl: process.env.PLAIN_AI_BASE_URL || DEFAULTS.baseUrl,
    model:   process.env.PLAIN_AI_MODEL   || DEFAULTS.model,
    enabled: Boolean(apiKey),
  };
}

function postJson(url, payload, apiKey, timeoutMs) {
  return new Promise((resolve, reject) => {
    const lib    = url.startsWith('https:') ? https : http;
    const parsed = new URL(url);
    const body   = JSON.stringify(payload);
    const req = lib.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      timeout: timeoutMs || 60000,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (_) {
            reject(new Error(`AI provider returned a non-JSON response: ${data.slice(0, 200)}`));
          }
        } else {
          const err = new Error(`AI provider error ${res.statusCode}: ${data.slice(0, 300)}`);
          err.statusCode = res.statusCode;
          try { err.response = JSON.parse(data); } catch (_) {}
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('AI provider request timed out')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Send a single chat request. Returns the assistant's text content.
async function chat(prompt) {
  const { apiKey, baseUrl, model } = config();
  if (!apiKey) {
    throw new Error(
      'No AI provider key is set (MISTRAL_API_KEY or PLAIN_AI_API_KEY).\n' +
      'AI-assisted compilation needs a provider. Configure MISTRAL_API_KEY\n' +
      'in your environment or .env file (see .env.example).'
    );
  }
  const url  = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
  const data = await postJson(url, {
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are the Plain compiler — a deterministic JavaScript compiler. You translate Plain source code into JavaScript only. You must be deterministic: return the same output for the same input every time. You validate your output structure before returning it. You rely on caching of previous translations for identical inputs. You handle repair by refining output when validation fails. You respect the public API contract: output exactly the JSON shape specified, nothing else. You never design new language syntax, never invent features, and never modify the Plain language.' },
      { role: 'user', content: prompt },
    ],
  });
  const text = data && data.choices && data.choices[0]
    && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('AI provider returned an empty or malformed response.');
  }
  return text.trim();
}

module.exports = { config, chat, postJson, DEFAULTS };
