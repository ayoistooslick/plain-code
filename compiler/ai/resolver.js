// Rule resolver (RFC-0020 §8, §36, §37).
//
// Deterministically selects the best rule for a Plain source that the
// deterministic compiler could not compile. Rules live in compiler/rules/ as
// versioned .md + .json pairs. The resolver must never rely on the AI to guess
// which rule file is relevant.

const fs   = require('fs');
const path = require('path');

const RULES_DIR = path.join(__dirname, '..', 'rules');

// Recursively collect every *.json rule-metadata file under a directory.
function listRuleFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listRuleFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

// Load every rule's machine-readable metadata.
// A broken rule file does not crash the compiler; it is skipped and reported.
function loadRules() {
  const rules = [];
  for (const file of listRuleFiles(RULES_DIR)) {
    try {
      const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
      meta._file = file;
      meta._id   = `${meta.category}/${meta.name}`;
      rules.push(meta);
    } catch (err) {
      rules.push({
        _file: file,
        _id: 'invalid',
        _error: err.message,
        name: 'invalid',
        category: 'invalid',
        version: 0,
      });
    }
  }
  return rules;
}

// Read the human-readable markdown companion of a rule, if present.
function ruleMarkdown(rule) {
  if (!rule || !rule._file) return '';
  const md = rule._file.replace(/\.json$/, '.md');
  try {
    return fs.readFileSync(md, 'utf8');
  } catch (_) {
    return '';
  }
}

// Lowercase, collapse whitespace. Used for keyword/trigger matching.
function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function regexMatch(pattern, normalizedSource) {
  try {
    return new RegExp(pattern).test(normalizedSource);
  } catch (_) {
    return false;
  }
}

// Score a rule against a normalized source. Triggers (3 points each) are
// stronger evidence than generic keywords (1 point each). A rule must have
// at least one trigger match to be eligible — keyword-only matches are not
// sufficient to invoke Complex Compilation.
function scoreRule(rule, norm) {
  let score = 0;
  let hasTrigger = false;
  for (const kw of rule.keywords || []) {
    if (norm.includes(String(kw).toLowerCase())) score += 1;
  }
  for (const t of rule.triggers || []) {
    if (t && t.type === 'regex' && regexMatch(t.pattern, norm)) {
      score += 3;
      hasTrigger = true;
    }
  }
  // Require at least one explicit trigger match. Keyword-only matches are
  // too weak to justify Complex Compilation — they risk misclassifying
  // arbitrary English as a Plain construct.
  return hasTrigger ? score : 0;
}

// Resolve ALL matching rules for `source`, sorted by descending score.
// A source may legitimately combine multiple capabilities (e.g. cron + fetch),
// so the compiler must account for every applicable rule.
// options:
//   - ruleName / rulePath: explicit selection (e.g. "telegram", "bots/telegram")
//   - rules: preloaded rule list (avoids re-reading the filesystem)
// Returns an array of rule objects (may be empty).
function resolveAllRules(source, rules, options) {
  const opts = options || {};
  const norm = normalize(source);
  const list = rules || loadRules();

  // 1. Explicit selection: return just that rule.
  if (opts.ruleName || opts.rulePath) {
    const want  = String(opts.ruleName || opts.rulePath).toLowerCase();
    const found = list.find((r) =>
      r._id === want ||
      r.name === want ||
      (Array.isArray(r.resolvablePaths) && r.resolvablePaths.some((p) => p.toLowerCase() === want))
    );
    return found ? [found] : [];
  }

  // 2. Score every rule; keep only matches; sort by descending score.
  return list
    .map((rule) => ({ rule, score: scoreRule(rule, norm) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.rule);
}

// Resolve the best (highest-scoring) rule for `source`.
// For backward compatibility — callers that need a single rule.
// options: same as resolveAllRules.
// Returns a rule object or null when nothing matches.
function resolveRule(source, rules, options) {
  const all = resolveAllRules(source, rules, options);
  return all.length > 0 ? all[0] : null;
}

module.exports = {
  RULES_DIR,
  listRuleFiles,
  loadRules,
  ruleMarkdown,
  resolveRule,
  resolveAllRules,
  normalize,
  scoreRule,
};
