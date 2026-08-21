// Lexer: converts Plain source text into a stream of tokens.
// Each token includes { type, value, line, col } for diagnostic reporting.

const TOKEN = {
  // Core keywords (v0.1–v0.4)
  REMEMBER:    'REMEMBER',
  SHOW:        'SHOW',
  AS:          'AS',
  IF:          'IF',
  OTHERWISE:   'OTHERWISE',
  DONE:        'DONE',
  IS:          'IS',
  GREATER:     'GREATER',
  LESS:        'LESS',
  THAN:        'THAN',
  MAKE:        'MAKE',
  GIVE:        'GIVE',
  BECOMES:     'BECOMES',
  FOR:         'FOR',
  EACH:        'EACH',   // also used for "every" alias
  IN:          'IN',
  WHILE:       'WHILE',
  USE:         'USE',
  IMPORT:      'IMPORT',
  // v0.3 — Express runtime
  WHEN:        'WHEN',
  SOMEONE:     'SOMEONE',
  VISITS:      'VISITS',
  LISTEN:      'LISTEN',
  ON:          'ON',
  REPLY:       'REPLY',
  JSON_KW:     'JSON_KW',
  SERVE:       'SERVE',
  FOLDER:      'FOLDER',
  // v0.6 — Extended comparisons
  ABOVE:       'ABOVE',
  BELOW:       'BELOW',
  AT:          'AT',
  LEAST:       'LEAST',
  MOST:        'MOST',
  NOT:         'NOT',
  EMPTY:       'EMPTY',
  CONTAINS:    'CONTAINS',
  STARTS:      'STARTS',
  ENDS:        'ENDS',
  WITH:        'WITH',
  BETWEEN:     'BETWEEN',
  AND:         'AND',
  // v0.6 — Express DX
  WEB:         'WEB',
  ROUTE_KW:    'ROUTE_KW',
  START_KW:    'START_KW',
  // v0.6 — SQLite DX
  DATABASE_KW: 'DATABASE_KW',
  QUERY_KW:    'QUERY_KW',
  INSERT_KW:   'INSERT_KW',
  UPDATE_KW:   'UPDATE_KW',
  DELETE_KW:   'DELETE_KW',
  EXECUTE_KW:  'EXECUTE_KW',
  SQL_BODY:    'SQL_BODY',   // raw SQL collected between a block keyword and "done"
  // v1.1.1 — JavaScript Gateway (RFC-0011)
  JAVASCRIPT_KW: 'JAVASCRIPT_KW', // the "javascript" keyword introducing a raw JS block
  JS_BODY:       'JS_BODY',       // raw JavaScript collected between "javascript" and "done"
  ASK:           'ASK',           // interactive input: ask name / ask "prompt" as name
  PACKAGE:       'PACKAGE',       // bare npm package name after "use" (may contain -, _, ., /, @)
  // Punctuation
  LBRACE:      'LBRACE',   // { — inline object literal (v1.2)
  RBRACE:      'RBRACE',   // }
  COLON:       'COLON',    // : — inline object property separator (v1.2)
  ARROW:       'ARROW',    // -> — Telegram inline keyboard button (v1.2)
  LPAREN:      'LPAREN',
  RPAREN:      'RPAREN',
  LBRACKET:    'LBRACKET',
  RBRACKET:    'RBRACKET',
  COMMA:       'COMMA',
  DOT:         'DOT',
  PLUS:        'PLUS',
  // Literals & identifiers
  IDENTIFIER:  'IDENTIFIER',
  STRING:      'STRING',
  NUMBER:      'NUMBER',
  TEMPLATE_STRING: 'TEMPLATE_STRING', // backtick-delimited string with interpolation
  // End of input
  EOF:         'EOF',
};

const KEYWORDS = {
  // Core
  remember:  TOKEN.REMEMBER,
  show:      TOKEN.SHOW,
  as:        TOKEN.AS,
  if:        TOKEN.IF,
  otherwise: TOKEN.OTHERWISE,
  done:      TOKEN.DONE,
  is:        TOKEN.IS,
  greater:   TOKEN.GREATER,
  less:      TOKEN.LESS,
  than:      TOKEN.THAN,
  make:      TOKEN.MAKE,
  give:      TOKEN.GIVE,
  becomes:   TOKEN.BECOMES,
  for:       TOKEN.FOR,
  each:      TOKEN.EACH,
  every:     TOKEN.EACH,    // alias: "for every" = "for each"
  in:        TOKEN.IN,
  while:     TOKEN.WHILE,
  use:       TOKEN.USE,
  import:    TOKEN.IMPORT,
  // v0.3
  when:      TOKEN.WHEN,
  someone:   TOKEN.SOMEONE,
  visits:    TOKEN.VISITS,
  listen:    TOKEN.LISTEN,
  on:        TOKEN.ON,
  reply:     TOKEN.REPLY,
  json:      TOKEN.JSON_KW,
  serve:     TOKEN.SERVE,
  folder:    TOKEN.FOLDER,
  // v0.6 — comparisons
  above:     TOKEN.ABOVE,
  below:     TOKEN.BELOW,
  at:        TOKEN.AT,
  least:     TOKEN.LEAST,
  most:      TOKEN.MOST,
  not:       TOKEN.NOT,
  empty:     TOKEN.EMPTY,
  contains:  TOKEN.CONTAINS,
  starts:    TOKEN.STARTS,
  ends:      TOKEN.ENDS,
  with:      TOKEN.WITH,
  between:   TOKEN.BETWEEN,
  and:       TOKEN.AND,
  // v0.6 — Express DX
  web:       TOKEN.WEB,
  route:     TOKEN.ROUTE_KW,
  start:     TOKEN.START_KW,
  // v0.6 — SQLite DX
  database:  TOKEN.DATABASE_KW,
  // v1.1.1 — JavaScript Gateway (RFC-0011)
  javascript: TOKEN.JAVASCRIPT_KW,
  ask:        TOKEN.ASK,
};

// Keywords that introduce raw SQL blocks (content up to "done" is collected verbatim).
const SQL_BLOCK_WORDS = {
  query:   TOKEN.QUERY_KW,
  insert:  TOKEN.INSERT_KW,
  update:  TOKEN.UPDATE_KW,
  delete:  TOKEN.DELETE_KW,
  execute: TOKEN.EXECUTE_KW,
};

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let pendingUse = false; // true between a "use" keyword and its package name

  function col() { return i - lineStart + 1; }

  while (i < source.length) {
    // Skip whitespace (track newlines for line counting)
    if (/\s/.test(source[i])) {
      if (source[i] === '\n') { line++; lineStart = i + 1; }
      i++;
      continue;
    }

    // Single-line comment: skip to end of line
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    const tokenLine = line;
    const tokenCol  = col();

    // Package name after "use": a bare npm specifier may contain hyphens,
    // underscores, dots, slashes, and a scope ("@scope/package-name").
    if (pendingUse) {
      if (/[A-Za-z0-9@]/.test(source[i])) {
        let pkg = '';
        while (i < source.length && /[A-Za-z0-9_.@/-]/.test(source[i])) pkg += source[i++];
        tokens.push({ type: TOKEN.PACKAGE, value: pkg, line: tokenLine, col: tokenCol });
        pendingUse = false;
        continue;
      }
      pendingUse = false; // not a package start — tokenize normally
    }

    // String literal
    if (source[i] === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\n') { line++; lineStart = i + 1; }
        str += source[i++];
      }
      if (i >= source.length) {
        throw new Error(
          `Line ${tokenLine}, Column ${tokenCol}: Unterminated string: the closing " is missing.`
        );
      }
      i++; // skip closing quote
      tokens.push({ type: TOKEN.STRING, value: str, line: tokenLine, col: tokenCol });
      continue;
    }

    // Backtick string (template literal): preserves whitespace and supports interpolation
    if (source[i] === '`') {
      let content = '';
      i++; // skip opening backtick
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '\n') { line++; lineStart = i + 1; }
        content += source[i++];
      }
      if (i >= source.length) {
        throw new Error(
          `Line ${tokenLine}, Column ${tokenCol}: Unterminated backtick string: the closing \` is missing.`
        );
      }
      i++; // skip closing backtick
      tokens.push({ type: TOKEN.TEMPLATE_STRING, value: content, line: tokenLine, col: tokenCol });
      continue;
    }

    // Number literal (may include decimal point)
    if (/[0-9]/.test(source[i])) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) num += source[i++];
      tokens.push({ type: TOKEN.NUMBER, value: Number(num), line: tokenLine, col: tokenCol });
      continue;
    }

    // Word: keyword, SQL-block keyword, or identifier
    if (/[a-zA-Z_]/.test(source[i])) {
      let word = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) word += source[i++];

      // SQL block keywords: collect raw content up to "done"
      if (SQL_BLOCK_WORDS[word]) {
        const kwType = SQL_BLOCK_WORDS[word];
        tokens.push({ type: kwType, value: word, line: tokenLine, col: tokenCol });

        // Check if the rest of this line is blank (raw block mode)
        let j = i;
        while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

        if (j >= source.length || source[j] === '\n' || source[j] === '\r') {
          // Advance past the newline
          i = j;
          if (i < source.length && source[i] === '\n') { i++; line++; lineStart = i; }

          // Collect raw lines until a line whose trimmed content is exactly "done"
          let sql = '';
          while (i < source.length) {
            const lineEnd  = source.indexOf('\n', i);
            const realEnd  = lineEnd === -1 ? source.length : lineEnd;
            const lineText = source.slice(i, realEnd);
            const trimmed  = lineText.trim();

            if (trimmed === 'done') {
              i = realEnd < source.length ? realEnd + 1 : realEnd;
              if (realEnd < source.length) { line++; lineStart = i; }
              break;
            }

            sql += lineText + '\n';
            i = realEnd < source.length ? realEnd + 1 : realEnd;
            if (realEnd < source.length) { line++; lineStart = i; }
          }

          tokens.push({ type: TOKEN.SQL_BODY,  value: sql.trimEnd(), line: tokenLine, col: tokenCol });
          tokens.push({ type: TOKEN.DONE,       value: 'done',         line, col: col() });
        }
        // else: stays on same line — parsed normally by the parser as kwType + next tokens
        continue;
      }

      // "javascript" introduces a raw JavaScript block: collect every line
      // verbatim until a line whose trimmed content is exactly "done".
      // This mirrors the SQL block behaviour so the lexer never has to
      // understand the JavaScript grammar inside the block.
      if (word === 'javascript') {
        tokens.push({ type: TOKEN.JAVASCRIPT_KW, value: word, line: tokenLine, col: tokenCol });

        let j = i;
        while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

        if (j >= source.length || source[j] === '\n' || source[j] === '\r') {
          // Raw block mode — advance past the newline and collect until "done"
          i = j;
          if (i < source.length && source[i] === '\n') { i++; line++; lineStart = i; }

          let js = '';
          while (i < source.length) {
            const lineEnd  = source.indexOf('\n', i);
            const realEnd  = lineEnd === -1 ? source.length : lineEnd;
            const lineText = source.slice(i, realEnd);
            const trimmed  = lineText.trim();

            if (trimmed === 'done') {
              i = realEnd < source.length ? realEnd + 1 : realEnd;
              if (realEnd < source.length) { line++; lineStart = i; }
              break;
            }

            js += lineText + '\n';
            i = realEnd < source.length ? realEnd + 1 : realEnd;
            if (realEnd < source.length) { line++; lineStart = i; }
          }

          tokens.push({ type: TOKEN.JS_BODY,  value: js.trimEnd(), line: tokenLine, col: tokenCol });
          tokens.push({ type: TOKEN.DONE,      value: 'done',       line, col: col() });
        }
        // else: "javascript" on its own line is followed by a value —
        // parsed normally by the parser (used as a remembered value).
        continue;
      }

      const type = KEYWORDS[word] || TOKEN.IDENTIFIER;
      if (type === TOKEN.USE) pendingUse = true;
      tokens.push({ type, value: word, line: tokenLine, col: tokenCol });
      continue;
    }

    // Single-character punctuation
    if (source[i] === '{') { tokens.push({ type: TOKEN.LBRACE, value: '{', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === '}') { tokens.push({ type: TOKEN.RBRACE, value: '}', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === ':') { tokens.push({ type: TOKEN.COLON, value: ':', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === '-' && source[i + 1] === '>') { tokens.push({ type: TOKEN.ARROW, value: '->', line: tokenLine, col: tokenCol }); i += 2; continue; }
    if (source[i] === '(') { tokens.push({ type: TOKEN.LPAREN,   value: '(', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === ')') { tokens.push({ type: TOKEN.RPAREN,   value: ')', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === '[') { tokens.push({ type: TOKEN.LBRACKET, value: '[', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === ']') { tokens.push({ type: TOKEN.RBRACKET, value: ']', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === ',') { tokens.push({ type: TOKEN.COMMA,    value: ',', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === '.') { tokens.push({ type: TOKEN.DOT,      value: '.', line: tokenLine, col: tokenCol }); i++; continue; }
    if (source[i] === '+') { tokens.push({ type: TOKEN.PLUS,     value: '+', line: tokenLine, col: tokenCol }); i++; continue; }

    throw new Error(
      `Line ${line}, Column ${col()}: Unexpected character "${source[i]}". Plain only uses letters, numbers, strings, and known symbols.`
    );
  }

  tokens.push({ type: TOKEN.EOF, line, col: col() });
  return tokens;
}

module.exports = { tokenize, TOKEN };
