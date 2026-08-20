// AI-assisted compilation layer (RFC-0020).
//
// The deterministic compiler always runs first and is authoritative. Only when
// it cannot compile a Plain source does this module orchestrate:
//
//   rule retrieval → provider translation → JavaScript syntax/structure
//   validation → dependency extraction → security / forbidden-pattern
//   validation → (bounded repair) → return the validated output contract.
//
// AI-generated JavaScript is never executed before every validation stage has
// passed, and failed output is fed back to the provider for repair up to a
// hard maximum — there is no execution path around validation.

const fs = require('fs');
const path = require('path');

const { VERSION } = require('../version');
const { resolveRule, resolveAllRules, ruleMarkdown } = require('./resolver');
const { translate: agentTranslate } = require('./agent');
const { translateRemote } = require('./remote');
const { validateTranslation } = require('./validator');
const { computeKey, get, set } = require('./cache');
const { config } = require('./client');
const { detectDependencies } = require('../dependency-detector');

const MAX_RETRIES = 3;

// The deterministic compiler runs first. Its output is trusted — it never
// passes through AI validation because it is the authoritative compiler.
function runDeterministicCompiler(source) {
  try {
    const { tokenize } = require('../lexer');
    const { parse }    = require('../parser');
    const { generate } = require('../generator');
    return generate(parse(tokenize(source)));
  } catch (_) {
    return null;
  }
}

// Translate a Plain source into a validated JavaScript output contract.
//
// Returns:
//   { deterministic: true, javascript, dependencies }          — deterministic
//   { deterministic: false, javascript, dependencies, imports,
//     async, rule, ruleVersion, cached? }                      — AI-assisted
//
// Throws layer-specific errors (RFC-0020 §39):
//   - "rule":        no rule covers the source
//   - "validation":  AI output failed the validation pipeline
//   - otherwise:     provider / network / malformed-output errors
async function translateSource(source, options = {}) {
  const { noCache = false } = options;

  // 1. Deterministic compiler. Known Plain syntax must never be routed to AI.
  const deterministic = runDeterministicCompiler(source);
  if (deterministic) {
    return {
      deterministic: true,
      javascript: deterministic,
      dependencies: detectDependencies(source),
    };
  }

  // 2. Rule retrieval (RFC-0020 §8, §37). No rule → clean, layer-specific error.
  //    A Plain source may combine multiple capabilities; resolve ALL matching rules.
  const allRules = resolveAllRules(source, null, { rulePath: options.rulePath });
  if (allRules.length === 0) {
    const err = new Error(
      'AI compilation error: no rule covers this source. ' +
      'Add a matching rule under compiler/rules/.'
    );
    err.layer = 'rule';
    throw err;
  }
  const rule = allRules[0]; // primary rule for backward compat

  // 3. Translation cache (RFC-0020 §15). Key covers the rule version, the
  //    compiler version, and the model so stale semantics can never be reused.
  //    For multi-rule sources the key includes all matched rule IDs.
  const ruleIds = allRules.map((r) => r._id).sort().join('+');
  const ruleVersions = allRules.map((r) => r.version).sort((a, b) => a - b).join('+');
  const keyParts = {
    source,
    rules: ruleIds,
    ruleVersion: ruleVersions,
    compiler: VERSION,
    model: config().model,
    route: options.client ? 'local' : config().enabled ? 'local' : 'remote',
  };
  const key = computeKey(keyParts);
  if (!noCache) {
    const cached = get(key);
    if (cached) return { ...cached, cached: true };
  }

  // 3b. Provider routing (RFC-0020 §46). An injected client always uses the
  //     local pipeline (tests, service injection). A locally configured
  //     provider key uses the local pipeline too. Otherwise Plain compiles
  //     through the hosted service at plain-code-compiler.onrender.com, which
  //     owns the provider credential — Plain users never need their own key.
  if (!options.client && !config().enabled) {
    const remote = await translateRemote(source, {
      rulePath: options.rulePath,
      noCache,
    });
    const ruleDependencies = allRules.flatMap((r) => r.dependencies || []);
    const mergedDeps = [...new Set([...ruleDependencies, ...(remote.dependencies || [])])];

    const result = {
      deterministic: false,
      javascript: remote.javascript,
      dependencies: mergedDeps,
      imports: remote.imports || [],
      async: Boolean(remote.async),
      rule: remote.rule || rule._id,
      rules: allRules.map((r) => r._id),
      ruleVersion: remote.ruleVersion || rule.version,
    };
    if (!noCache) set(key, result);
    return result;
  }

  // 4. Bounded repair loop. Every attempt runs the full validation pipeline;
  //    failure feeds the error back to the provider, up to MAX_RETRIES.
  //    All matching rules' markdown is included so the AI preserves every construct.
  const allMarkdowns = allRules.map((r) => ruleMarkdown(r));
  let repairHint = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let output;
    try {
      const agentOptions = options.client ? { client: options.client } : undefined;
      output = await agentTranslate({
        source,
        rule,
        rules: allRules,
        ruleMarkdown: allMarkdowns[0],
        rulesMarkdown: allMarkdowns,
        context: repairHint,
        options: agentOptions,
      });
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        const e = new Error(
          `AI compilation error: the provider did not return valid output after ${MAX_RETRIES} attempts.\n${err.message}`
        );
        e.layer = 'provider';
        throw e;
      }
      repairHint = `The previous attempt failed. Fix it and return the full output contract again.\n${err.message}`;
      continue;
    }

    // Validation pipeline: structure, syntax, forbidden patterns, require()
    // allowlist — centralized in validator.js (RFC-0020 §13). The AI's claim
    // that its JS is valid is never trusted.
    let validated;
    try {
      validated = validateTranslation(output);
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        const e = new Error(
          `AI compilation error: generated JavaScript failed validation after ${MAX_RETRIES} attempts.\n${err.message}`
        );
        e.layer = 'validation';
        throw e;
      }
      repairHint = `The previous output failed validation. Return the corrected output.\n${err.message}`;
      continue;
    }

    // Dependency extraction + async flag come from the validated contract.
    // Collect dependencies from ALL matched rules as a baseline, then merge
    // with what the AI generated (the AI may add runtime-specific deps).
    const ruleDependencies = allRules.flatMap((r) => r.dependencies || []);
    const mergedDeps = [...new Set([...ruleDependencies, ...(validated.dependencies || [])])];

    const result = {
      deterministic: false,
      javascript: validated.javascript,
      dependencies: mergedDeps,
      imports: validated.imports || [],
      async: Boolean(validated.async),
      rule: rule._id,
      rules: allRules.map((r) => r._id),
      ruleVersion: rule.version,
    };
    if (!noCache) set(key, result);
    return result;
  }

  throw new Error('Translation failed: no attempts made.');
}

// Compile a source string. Deterministic first; AI only as a fallback.
async function compileSource(source, options = {}) {
  return translateSource(source, options);
}

// Compile a file. Missing files fail before the AI layer is invoked.
async function compileFile(filePath, options = {}) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    const err = new Error(`File not found: ${filePath}`);
    err.layer = 'rule';
    throw err;
  }
  const source = await fs.promises.readFile(absPath, 'utf8');
  return translateSource(source, options);
}

module.exports = {
  compileFile,
  compileSource,
  translateSource,
  runDeterministicCompiler,
  MAX_RETRIES,
};
