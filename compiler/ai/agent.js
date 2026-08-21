// AI agent (RFC-0020 §10).
//
// Implements the provider-facing interface:
//
//   translate({ source, rule, ruleMarkdown, context, project })
//
// It builds the prompt, calls the provider, and extracts the structured JSON
// output contract from the model's response. The provider is injected through
// options.client (default: the OpenAI-compatible HTTP client) so the rest of
// the compiler never needs to know which provider is in use.

const { buildPrompt } = require('./prompt');
const { chat }        = require('./client');

// Extract a JSON object from a model response, tolerating markdown fences.
function extractJson(text) {
  let t = String(text || '').trim();
  if (!t) {
    throw new Error('AI compilation error: the provider returned an empty response.');
  }

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();

  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'AI compilation error: the provider did not return a JSON output contract.'
    );
  }

  const json = t.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch (err) {
    throw new Error(`AI compilation error: the provider returned malformed JSON.\n${err.message}`);
  }
}

async function translate({ source, rule, rules, ruleMarkdown, rulesMarkdown, context, project, options }) {
  const prompt = buildPrompt({ source, rule, rules, ruleMarkdown, rulesMarkdown, context, project });
  const client = (options && options.client) ? options.client : { chat };
  const text   = await client.chat(prompt);
  return extractJson(text);
}

module.exports = { translate, extractJson };
