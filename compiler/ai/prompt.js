// AI prompt builder (RFC-0020 §11).
//
// Builds a strict, focused prompt from the Plain source, the matching rule,
// and the minimum compiler context needed. Never includes secret values: at
// most a variable name is referenced (e.g. `token`), never its runtime value.

function buildPrompt({ source, rule, ruleMarkdown, context, project }) {
  const lines = [];
  lines.push('You are the Plain compiler.');
  lines.push('You are a deterministic compiler. You translate Plain source code into JavaScript. You must produce identical output for identical input every time. You do not design or modify the Plain language.');
  lines.push('Follow the supplied Plain rule exactly. Do not invent syntax or semantics. Your output is validated through a pipeline: structure check, syntax check, forbidden pattern scan, and require() allowlist. You handle repair by refining failed output. You rely on caching for repeated translations. You respect the public API contract: return exactly the JSON shape specified, nothing else.');
  lines.push('Produce only the requested JavaScript representation.');
  lines.push('');
  lines.push('OUTPUT CONTRACT');
  lines.push('Respond with ONLY a single JSON object and no other text, with exactly this shape:');
  lines.push('{"javascript": "<complete JavaScript>", "dependencies": ["npm packages"], "imports": [], "async": true}');
  lines.push('');
  lines.push('OUTPUT RULES');
  lines.push('- "javascript" must be valid Node.js/CommonJS JavaScript that implements exactly the Plain source below.');
  lines.push('- Use require("pkg") for any npm package and list "pkg" in "dependencies".');
  lines.push('- Never require a package that is not listed in "dependencies" or a Node built-in.');
  lines.push('- Set "async" to true when the code uses top-level await or async handlers.');
  lines.push('- Keep variable names from the Plain source where possible.');
  lines.push('- Do not add prose, code fences, or any text outside the JSON object.');
  lines.push('- Do not invent Plain syntax; translate only what the matching rule supports.');
  lines.push('');
  lines.push('MATCHING RULE');
  lines.push(ruleMarkdown || (rule && (rule.title || rule.name)) || '(no rule text available)');
  lines.push('');
  lines.push('PLAIN SOURCE TO COMPILE');
  lines.push(source);
  if (context) {
    lines.push('');
    lines.push('RELEVANT CONTEXT');
    lines.push(context);
  }
  if (project) {
    lines.push('');
    lines.push('PROJECT CONTEXT');
    lines.push(project);
  }
  return lines.join('\n');
}

module.exports = { buildPrompt };
