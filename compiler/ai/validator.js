// AI output validator (RFC-0020 §13).
//
// AI-generated JavaScript must never be trusted blindly. Every translation is
// checked here before it can reach the bundler/runtime path:
//
//   1. response structure
//   2. required fields
//   3. JavaScript syntax (vm.Script — parsed, never executed)
//   4. unsupported / forbidden output patterns
//   5. require() allowlist (dependencies + Node built-ins)
//
// All errors are layer-specific ("Generated JavaScript validation error") so
// diagnostics identify exactly where compilation failed (RFC-0020 §39).

const vm = require('vm');

const { isBuiltinModule } = require('../dependency-detector');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name  = 'ValidationError';
    this.layer = 'validation';
  }
}

// Patterns that are never acceptable in compiler output. Keep this strict and
// expandable — safety is the point of this module.
const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /\b(?:exec|execSync|spawn|spawnSync|execFile|execFileSync|fork)\s*\(/,
  /child_process/,
  /process\.(?:exit|abort|binding)\b/,
  /require\(\s*["'](?:\.\.?\/|https?:\/\/)/,
];

const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;

function declaredDependencies(output) {
  const deps = output && output.dependencies;
  if (deps === undefined || deps === null) return [];
  return Array.isArray(deps) ? deps : [];
}

// Extract the root package name ("@scope/pkg" stays as one unit).
function rootName(name) {
  return name.startsWith('@')
    ? name.split('/').slice(0, 2).join('/')
    : name.split('/')[0];
}

function validateTranslation(output) {
  // 1. Structure
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    throw new ValidationError('Generated JavaScript validation error: the AI output is not an object.');
  }

  // 2. Required fields
  if (typeof output.javascript !== 'string' || !output.javascript.trim()) {
    throw new ValidationError('Generated JavaScript validation error: "javascript" is missing or empty.');
  }
  if (output.async !== undefined && typeof output.async !== 'boolean') {
    throw new ValidationError('Generated JavaScript validation error: "async" must be a boolean.');
  }
  if (output.dependencies !== undefined && !Array.isArray(output.dependencies)) {
    throw new ValidationError('Generated JavaScript validation error: "dependencies" must be an array.');
  }
  if (output.imports !== undefined && !Array.isArray(output.imports)) {
    throw new ValidationError('Generated JavaScript validation error: "imports" must be an array.');
  }

  const code = output.javascript;

  // 3. Syntax (parsed, not executed). Top-level await is only valid inside
  //    async module bodies, so async output is wrapped in an async IIFE
  //    for syntax validation — mirroring the runtime wrapping applied by
  //    the generator/bundler.
  try {
    if (output.async) {
      new vm.Script(`(async () => {\n${code}\n})()`);
    } else {
      new vm.Script(code);
    }
  } catch (err) {
    throw new ValidationError(`Generated JavaScript validation error: invalid JavaScript syntax.\n${err.message}`);
  }

  // 4. Forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      throw new ValidationError(
        `Generated JavaScript validation error: the output contains a forbidden pattern (${pattern}).`
      );
    }
  }

  // 5. require() allowlist — every dependency must be declared or a built-in.
  const allowed = new Set(declaredDependencies(output));
  REQUIRE_RE.lastIndex = 0;
  let match;
  while ((match = REQUIRE_RE.exec(code)) !== null) {
    const root = rootName(match[1]);
    if (!allowed.has(root) && !isBuiltinModule(root)) {
      throw new ValidationError(
        `Generated JavaScript validation error: require("${match[1]}") is not listed in "dependencies".`
      );
    }
  }

  return output;
}

module.exports = { validateTranslation, ValidationError, FORBIDDEN_PATTERNS };
