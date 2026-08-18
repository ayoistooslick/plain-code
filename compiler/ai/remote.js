// Hosted compiler service client (RFC-0020 §46).
//
// Plain ships with a hosted AI compiler service that owns the provider
// credential, so CLI users never need their own API key. When the deterministic
// compiler cannot compile a source and no local provider is configured, this
// module POSTs the source to the hosted service and returns the validated
// output contract.
//
// The hosted response is re-validated locally before it can be used — the same
// validation pipeline (structure, JS syntax, forbidden patterns, require()
// allowlist) protects the local path (defense in depth). No API key is ever
// sent by the client; the service owns it.

const { postJson } = require('./client');
const { validateTranslation } = require('./validator');

const HOSTED_URL = 'https://plain-code-compiler.onrender.com';
const DEFAULT_TIMEOUT_MS = 120000;

// The hosted service endpoint. Overridable so self-hosted deployments and
// tests can point Plain at a different instance.
function remoteUrl() {
  return (process.env.PLAIN_AI_REMOTE_URL || HOSTED_URL).replace(/\/+$/, '');
}

// Translate `source` through the hosted service.
// Returns the same output contract shape as the local pipeline:
//   { deterministic: false, javascript, dependencies, imports, async, rule, ... }
// Throws layer-specific errors (rule / validation / provider / network).
async function translateRemote(source, options = {}) {
  const body = { source };
  if (options.rulePath) body.rule = options.rulePath;
  if (options.noCache) body.options = { noCache: true };

  const url = `${remoteUrl()}/translate`;
  let data;
  try {
    data = await postJson(url, body, null, options.timeoutMs || DEFAULT_TIMEOUT_MS);
  } catch (err) {
    const e = new Error(
      `AI compilation error: the hosted compiler service could not be reached.\n${err.message}`
    );
    // Preserve the layer from the service response when available (e.g. 422
    // rule/validation errors).  network / timeout errors fall back to 'provider'.
    e.layer = (err.response && err.response.error && err.response.error.layer) || 'provider';
    throw e;
  }

  if (data && data.error && typeof data.error.message === 'string') {
    const e = new Error(`AI compilation error (hosted service): ${data.error.message}`);
    e.layer = data.error.layer || 'provider';
    throw e;
  }

  return validateTranslation(data);
}

module.exports = { HOSTED_URL, DEFAULT_TIMEOUT_MS, remoteUrl, translateRemote };
