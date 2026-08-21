// Stream-language spec for the Plain programming language.
//
// Pure CommonJS with no external dependencies so it can be:
//  1. unit-tested by tests/compiler.test.js (plain Node.js), and
//  2. wrapped by plain-acode/main.js in @codemirror/language's StreamLanguage.
//
// Every construct below is derived from the ACTUAL current compiler:
//   compiler/lexer.js     — keyword list, SQL_BLOCK_WORDS, punctuation, `use`
//   compiler/parser.js    — statement keywords, comparisons, v1.1 expressions,
//                           NUMBER_WORDS, special calls (add/remove/write)
//   compiler/generator.js — STDLIB runtime function names
// Where the older VS Code/mt2 grammars drift from the compiler (e.g. `equal`,
// `or`, `-`/`*`/`/`/`%` operators), this spec follows the compiler.

// Structural keywords — statements, control flow, web and database.
// (Comparison/expression words live in OPERATOR_WORDS so they highlight as
// operators, matching the existing editor grammars.)
const KEYWORDS = new Set([
  // core
  'remember', 'show', 'make', 'give', 'use', 'import',
  // control flow
  'if', 'otherwise', 'done', 'for', 'each', 'every', 'in', 'while',
  // web (Express)
  'when', 'someone', 'visits', 'listen', 'on', 'reply', 'json', 'serve',
  'folder', 'web', 'route', 'start',
  // v1.2 Telegram
  'sends', 'clicks', 'matching',
  // database (SQLite)
  'database', 'query', 'insert', 'update', 'delete', 'execute',
  // v1.1.1 gateway
  'ask', 'javascript',
]);

// SQL block keywords begin a raw SQL body that ends at a line that is
// exactly `done` (compiler/lexer.js SQL_BLOCK_WORDS).
const SQL_BLOCK_WORDS = new Set(['query', 'insert', 'update', 'delete', 'execute']);

// Comparison phrase words (v0.6), assignment words and v1.1 expression words.
// These lex as identifiers/keywords but only have meaning inside Plain's
// natural-language operator phrases, so they highlight as operators.
const OPERATOR_WORDS = new Set([
  // v0.6 comparisons
  'is', 'not', 'empty', 'above', 'below', 'at', 'least', 'most',
  'greater', 'less', 'than', 'contains', 'starts', 'ends', 'with',
  'between', 'and',
  // assignment
  'becomes', 'as',
  // v1.1 expressions: first/last <noun> from <list>, <prop> of <obj>,
  // <list> length, <value> to/from <collection>
  'of', 'from', 'to', 'first', 'last', 'length',
]);

// Number words used by numbered item expressions (parser.js NUMBER_WORDS):
//   player one from players  →  players[0]
const NUMBER_WORDS = new Set([
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]);

// Literal words.
const ATOMS = new Set(['true', 'false', 'null', 'undefined']);

// Standard-library function names (generator.js STDLIB) plus `write`, the
// documented v1.1 file-operation alias (SPECIAL_CALLS → fs.writeFileSync).
// Highlighted as builtins only when used as calls (followed by `(`).
const STDLIB_FUNCTIONS = new Set([
  'length', 'uppercase', 'lowercase', 'random', 'round', 'sqlite',
  'print', 'readFile', 'writeFile', 'fileExists', 'read', 'write',
  'sleep', 'time', 'date', 'jsonEncode', 'jsonDecode', 'env', 'exit', 'uuid',
  // v1.2 Telegram
  'bot', 'sendMessage', 'sendPhoto', 'getChat', 'getMyChats', 'editMessage',
]);

// JavaScript keywords used inside `javascript ... done` gateway blocks.
const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

const JS_ATOMS = new Set(['true', 'false', 'null', 'undefined']);

// Scan a quoted string starting at stream.peek(). Handles backslash escapes
// (cosmetic only — matches the VS Code grammar; the compiler lexer itself
// does not process escapes).
function scanString(stream, quote) {
  stream.next(); // opening quote
  while (!stream.eol()) {
    const ch = stream.next();
    if (ch === '\\') {
      if (!stream.eol()) stream.next();
      continue;
    }
    if (ch === quote) return;
  }
}

// Plain-language tokenizer. Runs at the start of a token; must always
// advance the stream (directly or through a match).
function token(stream, state) {
  // JavaScript gateway block: highlight JS until a line that is exactly
  // `done` (mirrors compiler/lexer.js raw-block collection).
  if (state.inJavaScript) return tokenJavaScript(stream, state);
  // SQL block: highlight as raw SQL body until a line exactly `done`.
  if (state.inSQL) return tokenSQL(stream, state);

  // Inside a `${...}` interpolation inside a template string.
  // Handle the closing `}` here, then fall through to Plain tokenization
  // for the inner expression tokens (skips tokenTemplate to avoid recursion).
  if (state.inTemplateExpr) {
    if (stream.eat('}')) { state.inTemplateExpr = false; return 'punctuation'; }
    // Fall through below for normal Plain tokenization of the inner expression.
  } else if (state.inTemplate) {
    return tokenTemplate(stream, state);
  }

  // `//` line comments.
  if (stream.match('//')) {
    stream.skipToEnd();
    return 'comment';
  }

  // `note:` documentation comments — line-start only (VS Code grammar uses
  // `^\s*note\s*:.*$`). `note` is reserved in the spec but not a keyword.
  if (stream.sol() && stream.match(/^[ \t]*note\s*:/)) {
    stream.skipToEnd();
    return 'comment';
  }

  // Skip whitespace.
  if (stream.eatSpace()) return null;

  // Package name directly after `use` (bare module specifier, may be scoped
  // or hyphenated — compiler/lexer.js `pendingUse` handling).
  if (state.afterUse) {
    state.afterUse = false;
    if (stream.match(/^[A-Za-z0-9@][A-Za-z0-9_.@/-]*/)) return 'builtin';
  }

  // Strings. Route paths (after `visits` or `route`) get a distinct
  // special-string style via the `string-2` legacy token name.
  if (stream.peek() === '"') {
    const isRoute = state.pendingRoute;
    state.pendingRoute = false;
    scanString(stream, '"');
    return isRoute ? 'string-2' : 'string';
  }
  state.pendingRoute = false;

  // Template strings (backtick-delimited, multi-line).
  if (stream.peek() === '`') {
    stream.next(); // consume opening backtick
    state.inTemplate = true;
    return tokenTemplate(stream, state);
  }

  // Numbers (Plain has no negative-number literal syntax).
  if (stream.match(/^\d+(\.\d+)?/)) return 'number';

  // Punctuation — exactly the set the compiler lexer accepts.
  if (stream.eat('(')) return 'punctuation';
  if (stream.eat(')')) return 'punctuation';
  if (stream.eat('[')) return 'punctuation';
  if (stream.eat(']')) return 'punctuation';
  if (stream.eat(',')) return 'punctuation';
  // v1.2 — inline object literals and button arrows.
  if (stream.eat('{')) return 'punctuation';
  if (stream.eat('}')) return 'punctuation';
  if (stream.eat(':')) return 'punctuation';

  // Operators: `.` accessor, `+` arithmetic and `->` button arrow (the only
  // ones the compiler tokenizes; `-`, `*`, `/`, `%` are NOT Plain and fall
  // through to invalid).
  if (stream.match('->')) return 'operator';
  if (stream.eat('.')) return 'operator';
  if (stream.eat('+')) return 'operator';

  // Words.
  const match = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
  if (match) {
    const word = match[0];

    if (KEYWORDS.has(word)) {
      if (word === 'use') state.afterUse = true;
      if (word === 'web') state.afterWeb = true;
      if (word === 'visits' || word === 'route' || word === 'sends' || word === 'clicks') state.pendingRoute = true;
      // `javascript` begins a gateway block when the rest of the line is
      // blank (the only form the compiler collects — fixture gateway_js.pln).
      if (word === 'javascript' && stream.match(/[ \t]*$/)) state.inJavaScript = true;
      // SQL block keywords likewise require a blank rest of line.
      if (SQL_BLOCK_WORDS.has(word) && stream.match(/[ \t]*$/)) state.inSQL = true;
      return 'keyword';
    }

    // Stdlib calls: `length(...)`, `readFile(...)`, `jsonEncode(...)`, etc.
    if (STDLIB_FUNCTIONS.has(word) && stream.peek() === '(') return 'builtin';

    if (OPERATOR_WORDS.has(word)) return 'operator';

    if (NUMBER_WORDS.has(word)) return 'number';

    if (ATOMS.has(word)) return 'atom';

    // `web app` — the app identifier is part of the shorthand.
    if (word === 'app' && state.afterWeb) {
      state.afterWeb = false;
      return 'keyword';
    }
    state.afterWeb = false;

    // Function calls: any identifier immediately followed by `(`.
    if (stream.peek() === '(') return 'function';

    return 'variable';
  }

  // Any other character is rejected by the compiler lexer, so flag it.
  stream.next();
  return 'invalid';
}

// Tokenizer for `javascript ... done` gateway blocks. Highlights the body as
// JavaScript; a line whose trimmed content is exactly `done` ends the block
// and returns to Plain (mirrors compiler/lexer.js raw-block collection).
function tokenJavaScript(stream, state) {
  // Block-comment continuation (started on a previous line).
  if (state.inJSComment) {
    let closed = false;
    while (!stream.eol()) {
      if (stream.match('*/')) { closed = true; break; }
      stream.next();
    }
    if (closed) state.inJSComment = false;
    return 'comment';
  }

  // Terminator line.
  if (stream.match(/^[ \t]*done[ \t]*$/)) {
    state.inJavaScript = false;
    return 'keyword';
  }

  if (stream.eatSpace()) return null;

  if (stream.match('//')) {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.match('/*')) {
    let closed = false;
    while (!stream.eol()) {
      if (stream.match('*/')) { closed = true; break; }
      stream.next();
    }
    if (!closed) state.inJSComment = true;
    return 'comment';
  }

  const ch = stream.peek();
  if (ch === '"' || ch === "'") {
    scanString(stream, ch);
    return 'string';
  }
  if (ch === '`') {
    scanString(stream, '`');
    return 'string-2';
  }

  if (stream.match(/^0[xX][0-9a-fA-F]+/)) return 'number';
  if (stream.match(/^\d+(\.\d+)?/)) return 'number';

  // Operators (multi-char first so `===` wins over `=`).
  if (stream.match(/^(?:===|!==|==|!=|<=|>=|=>|\+\+|--|\?\?|\?\.|\+=|-=|\*=|\/=|%=|[=+\-*\/%<>!?&|^~:])/)) return 'operator';

  if (stream.eat(/[()\[\]{},;]/)) return 'punctuation';

  if (stream.eat('.')) {
    if (stream.match(/^[A-Za-z_$][A-Za-z0-9_$]*/)) return 'property';
    return 'operator';
  }

  const match = stream.match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
  if (match) {
    const word = match[0];
    if (JS_KEYWORDS.has(word)) return 'keyword';
    if (JS_ATOMS.has(word)) return 'atom';
    if (stream.peek() === '(') return 'function';
    return 'variable';
  }

  stream.next();
  return 'invalid';
}

// Tokenizer for SQL blocks. The raw SQL body is emitted as `meta` tokens so
// it stays visually distinct from Plain code; the block ends at `done`.
function tokenSQL(stream, state) {
  if (stream.match(/^[ \t]*done[ \t]*$/)) {
    state.inSQL = false;
    return 'keyword';
  }
  if (stream.eatSpace()) return null;
  stream.skipToEnd();
  return 'meta';
}

// Tokenizer for template strings (backtick-delimited). Highlights string
// content and `${...}` interpolation as operators. Multi-line: the block
// continues across lines until a closing backtick is found.
function tokenTemplate(stream, state) {
  // Inside a `${...}` expression — Plain tokenization is handled by the
  // main token() function (which checks inTemplateExpr before entering here).
  if (state.inTemplateExpr) return null;

  // Scan template string content until `${`, closing backtick, or EOL.
  while (!stream.eol()) {
    if (stream.match('${')) {
      state.inTemplateExpr = true;
      return 'operator';
    }
    if (stream.match('`')) {
      state.inTemplate = false;
      return 'string-2';
    }
    stream.next();
  }
  return 'string-2';
}

// Exported spec consumed by plain-acode/main.js (StreamLanguage.define).
module.exports = {
  name: 'plain',
  startState: () => ({
    inJavaScript: false,
    inSQL: false,
    inJSComment: false,
    inTemplate: false,
    inTemplateExpr: false,
    afterUse: false,
    afterWeb: false,
    pendingRoute: false,
  }),
  token,
};
