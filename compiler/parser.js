// Parser: converts a token stream into an AST (Abstract Syntax Tree).

const { TOKEN } = require('./lexer');

// Statement-starting Plain keywords, used for "did you mean?" suggestions.
const STATEMENT_KEYWORDS = [
  'remember', 'show', 'if', 'make', 'give',
  'for', 'while', 'use', 'import', 'when', 'listen', 'reply', 'serve',
  'web', 'route', 'start', 'database', 'query', 'insert', 'update', 'delete', 'execute',
  'ask', 'javascript', 'bot',
];

// Number words used by the numbered item expression (v1.1):
//   player one from players   → players[0]
//   player two from players   → players[1]
// Zero-based indexing is never exposed to the programmer.
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};

// Returns the Levenshtein edit distance between two strings.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns the closest keyword within edit distance 2, or null.
function closestKeyword(word) {
  let best = null, bestDist = Infinity;
  for (const kw of STATEMENT_KEYWORDS) {
    const d = levenshtein(word.toLowerCase(), kw);
    if (d < bestDist) { bestDist = d; best = kw; }
  }
  return bestDist <= 2 ? best : null;
}

// Format an error message with position info from a token when available.
function makeError(message, token) {
  if (token && token.line) {
    return `Line ${token.line}, Column ${token.col}: ${message}`;
  }
  return message;
}

function parse(tokens) {
  let pos = 0;

  function peek()         { return tokens[pos]; }
  function peekAt(offset) { return tokens[pos + offset] || { type: TOKEN.EOF }; }
  function advance()      { return tokens[pos++]; }

  function consume(expectedType, hint) {
    const token = tokens[pos];
    if (token.type !== expectedType) {
      throw new Error(makeError(
        hint || `Expected ${expectedType} but got "${token.value || token.type}".`,
        token
      ));
    }
    return advance();
  }

  // ── Condition parsing ───────────────────────────────────────────────────────
  //
  // Returns a condition node (used by if and while):
  //   BinaryCondition  { type, left, op, right }      — left op right
  //   UnaryCondition   { type, left, op }              — left is empty / is not empty
  //   BetweenCondition { type, left, low, high }       — left between low and high
  //   StringCondition  { type, left, method, right }   — left contains/startsWith/endsWith right

  function parseCondition() {
    const left = parseExpression();

    // ── Non-"is" operators ──────────────────────────────────────────────────
    if (peek().type === TOKEN.CONTAINS) {
      advance();
      const right = parseExpression();
      return { type: 'StringCondition', left, method: 'includes', right };
    }

    if (peek().type === TOKEN.STARTS) {
      advance();
      consume(TOKEN.WITH, makeError('Expected "with" after "starts". Use: starts with', peek()));
      const right = parseExpression();
      return { type: 'StringCondition', left, method: 'startsWith', right };
    }

    if (peek().type === TOKEN.ENDS) {
      advance();
      consume(TOKEN.WITH, makeError('Expected "with" after "ends". Use: ends with', peek()));
      const right = parseExpression();
      return { type: 'StringCondition', left, method: 'endsWith', right };
    }

    if (peek().type === TOKEN.BETWEEN) {
      advance();
      const low = parseExpression();
      consume(TOKEN.AND, makeError('Expected "and" after the lower bound in "between" expression.\n\nExample:\n  if x between 1 and 10', peek()));
      const high = parseExpression();
      return { type: 'BetweenCondition', left, low, high };
    }

    // ── "is ..." comparisons ────────────────────────────────────────────────
    const isToken = peek();
    consume(TOKEN.IS, makeError(
      'Expected a comparison after the value. Use "is", "is above", "is below", "contains", "starts with", etc.',
      isToken
    ));

    // is not empty / is not <expr>
    if (peek().type === TOKEN.NOT) {
      advance();
      if (peek().type === TOKEN.EMPTY) {
        advance();
        return { type: 'UnaryCondition', left, op: 'isNotEmpty' };
      }
      const right = parseExpression();
      return { type: 'BinaryCondition', left, op: '!==', right };
    }

    // is empty
    if (peek().type === TOKEN.EMPTY) {
      advance();
      return { type: 'UnaryCondition', left, op: 'isEmpty' };
    }

    // is above  (alias: >)
    if (peek().type === TOKEN.ABOVE) {
      advance();
      const right = parseExpression();
      return { type: 'BinaryCondition', left, op: '>', right };
    }

    // is below  (alias: <)
    if (peek().type === TOKEN.BELOW) {
      advance();
      const right = parseExpression();
      return { type: 'BinaryCondition', left, op: '<', right };
    }

    // is at least  (>=) / is at most  (<=)
    if (peek().type === TOKEN.AT) {
      advance();
      if (peek().type === TOKEN.LEAST) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryCondition', left, op: '>=', right };
      }
      if (peek().type === TOKEN.MOST) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryCondition', left, op: '<=', right };
      }
      throw new Error(makeError('Expected "least" or "most" after "at". Use: is at least / is at most', peek()));
    }

    // is greater than
    if (peek().type === TOKEN.GREATER) {
      advance();
      consume(TOKEN.THAN, 'Expected "than" after "greater". Use: is greater than');
      const right = parseExpression();
      return { type: 'BinaryCondition', left, op: '>', right };
    }

    // is less than
    if (peek().type === TOKEN.LESS) {
      advance();
      consume(TOKEN.THAN, 'Expected "than" after "less". Use: is less than');
      const right = parseExpression();
      return { type: 'BinaryCondition', left, op: '<', right };
    }

    // is <expr>  (equality)
    const right = parseExpression();
    return { type: 'BinaryCondition', left, op: '===', right };
  }

  // ── Statements ─────────────────────────────────────────────────────────────

  function parseStatement() {
    const token = peek();

    if (token.type === TOKEN.REMEMBER)    return parseRemember();
    if (token.type === TOKEN.SHOW)        return parseShow();
    if (token.type === TOKEN.IF)          return parseIf();
    if (token.type === TOKEN.MAKE)        return parseMake();
    if (token.type === TOKEN.GIVE)        return parseGive();
    if (token.type === TOKEN.FOR)         return parseForEach();
    if (token.type === TOKEN.WHILE)       return parseWhile();
    if (token.type === TOKEN.USE)         return parseUse();
    if (token.type === TOKEN.IMPORT)      return parseImport();
    if (token.type === TOKEN.WHEN)        return parseWhen();
    if (token.type === TOKEN.LISTEN)      return parseListen();
    if (token.type === TOKEN.REPLY)       return parseReply();
    if (token.type === TOKEN.SERVE)       return parseServeFolder();
    // v1.1.1 — JavaScript Gateway
    if (token.type === TOKEN.ASK)         return parseAsk();
    if (token.type === TOKEN.JAVASCRIPT_KW) return parseJavaScriptBlock();
    // v0.6
    if (token.type === TOKEN.WEB)         return parseWebApp();
    if (token.type === TOKEN.ROUTE_KW)    return parseSimpleRoute();
    if (token.type === TOKEN.START_KW)    return parseStart();
    if (token.type === TOKEN.DATABASE_KW) return parseDatabase();
    if (token.type === TOKEN.QUERY_KW)    return parseSqlBlock('query',   'QueryStatement');
    if (token.type === TOKEN.INSERT_KW)   return parseSqlBlock('insert',  'InsertStatement');
    if (token.type === TOKEN.UPDATE_KW)   return parseSqlBlock('update',  'UpdateStatement');
    if (token.type === TOKEN.DELETE_KW)   return parseSqlBlock('delete',  'DeleteStatement');
    if (token.type === TOKEN.EXECUTE_KW)  return parseSqlBlock('execute', 'ExecuteStatement');

    if (token.type === TOKEN.EOF) return null;

    // Statements starting with an identifier: call, becomes, index/member becomes
    if (token.type === TOKEN.IDENTIFIER) {
      // v1.2 — bot "<token>" / bot <expr>: creates the polling Telegram bot.
      // Bound to BOT by the generator's `bot` stdlib. Only intercepts when a
      // value follows; bot(...) calls and ordinary identifiers (e.g. a
      // variable named bot) keep their normal meaning.
      const nextIsValue =
        peekAt(1).type === TOKEN.STRING  || peekAt(1).type === TOKEN.NUMBER ||
        peekAt(1).type === TOKEN.IDENTIFIER ||
        peekAt(1).type === TOKEN.LBRACKET || peekAt(1).type === TOKEN.LBRACE;
      if (token.value === 'bot' && nextIsValue) return parseBot();

      const expr = parsePrimary();

      if (peek().type === TOKEN.BECOMES) {
        advance();
        const value = parseExpression();
        return { type: 'BecomeStatement', target: expr, value };
      }

      if (expr.type === 'CallExpression' ||
          expr.type === 'AddCall' ||
          expr.type === 'RemoveCall' ||
          expr.type === 'WriteCall') {
        return { type: 'ExpressionStatement', expression: expr };
      }

      const word = expr.type === 'Identifier' ? expr.name : token.value;
      const suggestion = closestKeyword(word);
      if (suggestion) {
        throw new Error(makeError(
          `Unknown keyword "${word}". Did you mean "${suggestion}"?`,
          token
        ));
      }
      throw new Error(makeError(
        `Unexpected word "${word}". This is not a valid statement in Plain.`,
        token
      ));
    }

    throw new Error(makeError(`Unexpected keyword "${token.value}".`, token));
  }

  // remember <name> as <value>
  // remember <name> as\n  <key> is <val>\n...\ndone   (object literal)
  // remember <name> as javascript\n  <raw JS>\ndone      (v1.1.1 JavaScript block)
  function parseRemember() {
    consume(TOKEN.REMEMBER);
    const name = consume(
      TOKEN.IDENTIFIER,
      'Expected a variable name after "remember".\n\nExample:\n  remember age as 16'
    ).value;
    consume(
      TOKEN.AS,
      'Expected keyword "as" after the variable name.\n\nExample:\n  remember age as 16'
    );

    // JavaScript block: remember <name> as javascript … done
    if (peek().type === TOKEN.JAVASCRIPT_KW) {
      advance(); // consume javascript
      const bodyToken = peek();
      if (bodyToken.type !== TOKEN.JS_BODY) {
        throw new Error(makeError(
          'Expected a JavaScript block after "javascript".\n\nExample:\n  remember result as javascript\n      await axios.get(url)\n  done',
          bodyToken
        ));
      }
      const body = advance().value; // consume JS_BODY
      consume(TOKEN.DONE, 'Expected "done" to close the JavaScript block.');
      return { type: 'JavaScriptBlock', name, body };
    }

    // Object literal: next token is IDENTIFIER followed by IS
    if (peek().type === TOKEN.IDENTIFIER && peekAt(1).type === TOKEN.IS) {
      return { type: 'RememberStatement', name, value: parseObjectLiteral() };
    }

    const value = parseExpression();
    return { type: 'RememberStatement', name, value };
  }

  // ask <variable>
  // ask "<prompt>" as <variable>
  function parseAsk() {
    consume(TOKEN.ASK);
    if (peek().type === TOKEN.STRING) {
      const prompt = advance().value;
      consume(TOKEN.AS,
        'Expected "as" after the prompt.\n\nExample:\n  ask "What is your name?" as name');
      const variable = consume(TOKEN.IDENTIFIER,
        'Expected a variable name after "as".\n\nExample:\n  ask "What is your name?" as name').value;
      return { type: 'AskStatement', prompt, variable };
    }
    const variable = consume(TOKEN.IDENTIFIER,
      'Expected a variable name after "ask".\n\nExample:\n  ask name').value;
    return { type: 'AskStatement', variable };
  }

  // javascript\n  <raw JS>\ndone  — statement-level JavaScript block.
  // Mirrors the `remember <name> as javascript` form but produces no value.
  function parseJavaScriptBlock() {
    consume(TOKEN.JAVASCRIPT_KW);
    const bodyToken = peek();
    if (bodyToken.type !== TOKEN.JS_BODY) {
      throw new Error(makeError(
        'Expected a JavaScript block after "javascript".\n\nExample:\n  javascript\n    console.log("hi")\n  done',
        bodyToken
      ));
    }
    const body = advance().value; // consume JS_BODY
    consume(TOKEN.DONE, 'Expected "done" to close the JavaScript block.');
    return { type: 'JavaScriptBlock', name: null, body };
  }

  function parseShow() {
    consume(TOKEN.SHOW);
    // Support both keyword form (show "text") and call form (show("text")).
    if (peek().type === TOKEN.LPAREN) {
      advance(); // consume (
      const value = parseExpression();
      consume(TOKEN.RPAREN, 'Expected ")" to close "show" call.');
      return { type: 'ShowStatement', value };
    }
    const value = parseExpression();
    return { type: 'ShowStatement', value };
  }

  // make name(params) ... done
  function parseMake() {
    consume(TOKEN.MAKE);
    const name = consume(
      TOKEN.IDENTIFIER,
      'Expected a function name after "make".\n\nExample:\n  make greet()\n    show "Hello"\n  done'
    ).value;
    consume(TOKEN.LPAREN, `Expected "(" after function name "${name}".`);
    const params = parseParamList();
    consume(TOKEN.RPAREN, 'Expected ")" to close the parameter list.');
    const body = parseBody(`function "${name}"`);
    return { type: 'FunctionDeclaration', name, params, body };
  }

  function parseParamList() {
    const params = [];
    if (peek().type === TOKEN.RPAREN) return params;
    params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name.').value);
    while (peek().type === TOKEN.COMMA) {
      advance();
      params.push(consume(TOKEN.IDENTIFIER, 'Expected a parameter name after ",".').value);
    }
    return params;
  }

  function parseGive() {
    consume(TOKEN.GIVE);
    const value = parseExpression();
    return { type: 'GiveStatement', value };
  }

  // for each <item> in <collection> ... done
  // for every <item> in <collection> ... done  (alias — "every" maps to EACH token)
  function parseForEach() {
    consume(TOKEN.FOR);
    consume(TOKEN.EACH,
      'Expected "each" or "every" after "for".\n\nExample:\n  for each item in players\n    show item\n  done');
    const item = consume(TOKEN.IDENTIFIER, 'Expected an item name after "each" or "every".').value;
    consume(TOKEN.IN, `Expected "in" after "${item}".\n\nExample:\n  for each item in players`);
    const collection = parseExpression();
    const body = parseBody('"for each" loop');
    return { type: 'ForEachStatement', item, collection, body };
  }

  // while <condition> ... done
  function parseWhile() {
    consume(TOKEN.WHILE);
    const condition = parseCondition();
    const body      = parseBody('"while" loop');
    return { type: 'WhileStatement', condition, body };
  }

  // import "./file.pln"
  function parseImport() {
    consume(TOKEN.IMPORT);
    const filePath = consume(
      TOKEN.STRING,
      'Expected a file path string after "import".\n\nExample:\n  import "./math.pln"'
    ).value;
    return { type: 'ImportStatement', path: filePath };
  }

  // use <module>
  function parseUse() {
    consume(TOKEN.USE);
    const token = peek();
    if (token.type !== TOKEN.PACKAGE && token.type !== TOKEN.IDENTIFIER) {
      throw new Error(makeError(
        'Expected a module name after "use".\n\nExample:\n  use express',
        token
      ));
    }
    advance();
    return { type: 'UseStatement', module: token.value };
  }

  // when someone visits "<path>" ... done     → Express route
  // when someone sends "<command>" ... done    → Telegram command handler
  // when someone sends matching "<pattern>" ... done
  // when someone clicks "<data>" ... done      → Telegram callback handler
  function parseWhen() {
    consume(TOKEN.WHEN);
    consume(TOKEN.SOMEONE,
      'Expected "someone" after "when".\n\nExample:\n  when someone visits "/"\n    reply "Hello"\n  done');
    const next = peek();

    if (next.type === TOKEN.VISITS) return parseRouteBody();

    if (next.type === TOKEN.IDENTIFIER && next.value === 'sends') {
      advance();
      return parseTelegramCommand();
    }

    if (next.type === TOKEN.IDENTIFIER && next.value === 'clicks') {
      advance();
      return parseTelegramCallback();
    }

    throw new Error(makeError(
      'Expected "visits", "sends", or "clicks" after "when someone".\n\nExamples:\n  when someone visits "/"\n  when someone sends "/start"\n  when someone clicks "about"',
      next
    ));
  }

  // Parses the route body after `when someone visits "<path>"`.
  function parseRouteBody() {
    consume(TOKEN.VISITS,
      'Expected "visits" after "someone".\n\nExample:\n  when someone visits "/"');
    const routePath = consume(TOKEN.STRING,
      'Expected a route path string after "visits".\n\nExample:\n  when someone visits "/"').value;
    const body = parseBody('route');
    return { type: 'RouteStatement', path: routePath, body };
  }

  // when someone sends "<command>" ... done
  // when someone sends matching "<pattern>" ... done
  function parseTelegramCommand() {
    let isPattern = false;
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'matching') {
      isPattern = true;
      advance();
    }
    const command = consume(TOKEN.STRING,
      isPattern
        ? 'Expected a pattern string after "matching".\n\nExample:\n  when someone sends matching "/echo (.+)"'
        : 'Expected a command string after "sends".\n\nExample:\n  when someone sends "/start"\n    reply "Hello"\n  done').value;
    const body = parseBody('"when someone sends" block');
    return { type: 'TelegramCommandStatement', command, isPattern, body };
  }

  // when someone clicks "<data>" ... done
  function parseTelegramCallback() {
    const data = consume(TOKEN.STRING,
      'Expected a button name string after "clicks".\n\nExample:\n  when someone clicks "about"\n    reply "About Plain"\n  done').value;
    const body = parseBody('"when someone clicks" block');
    return { type: 'TelegramCallbackStatement', data, body };
  }

  // listen on <port> ... done
  function parseListen() {
    consume(TOKEN.LISTEN);
    consume(TOKEN.ON,
      'Expected "on" after "listen".\n\nExample:\n  listen on 3000\n    show "Running"\n  done');
    const port = parseExpression();
    const body = parseBody('"listen" block');
    return { type: 'ListenStatement', port, body };
  }

  // reply <expr>
  // reply json\n  <key> is <val>\n...\ndone
  function parseReply() {
    consume(TOKEN.REPLY);
    if (peek().type === TOKEN.JSON_KW) {
      advance(); // consume json
      const properties = [];
      while (peek().type !== TOKEN.DONE) {
        if (peek().type === TOKEN.EOF) {
          throw new Error(makeError(
            'Expected keyword "done" to close "reply json" block before end of file.',
            peek()
          ));
        }
        const key = consume(TOKEN.IDENTIFIER, 'Expected a property name.').value;
        consume(TOKEN.IS, `Expected "is" after property name "${key}".`);
        const value = parseExpression();
        properties.push({ key, value });
      }
      advance(); // consume DONE
      return { type: 'ReplyJsonStatement', properties };
    }
    const value = parseExpression();

    // reply <value> with buttons ... done → Telegram inline keyboard block.
    if (peek().type === TOKEN.WITH &&
        peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'buttons') {
      advance(); // with
      advance(); // buttons
      const buttons = parseButtonBlock();
      return { type: 'ReplyWithButtonsStatement', value, buttons };
    }

    return { type: 'ReplyStatement', value };
  }

  // Inline keyboard rows inside a "reply ... with buttons ... done" block.
  // Each line is one button; a comma joins buttons on the same line into one
  // row; a blank line between button lines starts a new row.
  function parseButtonBlock() {
    const rows = [];
    let currentRow = [];
    let prevLine = null;
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected "done" to close the buttons block before end of file.',
          peek()
        ));
      }
      if (currentRow.length > 0 && prevLine !== null && peek().line > prevLine + 1) {
        rows.push(currentRow);
        currentRow = [];
      }
      const text = consume(TOKEN.STRING,
        'Expected a button label string inside the buttons block.\n\nExample:\n  reply "Choose" with buttons\n    "About" -> "about"\n  done');
      consume(TOKEN.ARROW,
        'Expected "->" after the button label.\n\nExample:\n  "About" -> "about"');
      const data = consume(TOKEN.STRING,
        'Expected a callback string after "->".\n\nExample:\n  "About" -> "about"');
      currentRow.push({ text: text.value, data: data.value });
      prevLine = data.line;
      if (peek().type === TOKEN.COMMA) advance();
    }
    if (currentRow.length > 0) rows.push(currentRow);
    advance(); // consume DONE
    return rows;
  }

  // serve folder "<path>"
  function parseServeFolder() {
    consume(TOKEN.SERVE);
    consume(TOKEN.FOLDER,
      'Expected "folder" after "serve".\n\nExample:\n  serve folder "public"');
    const folder = consume(TOKEN.STRING,
      'Expected a folder path string after "serve folder".\n\nExample:\n  serve folder "public"').value;
    return { type: 'ServeFolderStatement', folder };
  }

  // ── v0.6 — Express DX ──────────────────────────────────────────────────────

  // web app
  function parseWebApp() {
    consume(TOKEN.WEB);
    const appToken = peek();
    if (appToken.type !== TOKEN.IDENTIFIER || appToken.value !== 'app') {
      throw new Error(makeError(
        'Expected "app" after "web".\n\nExample:\n  web app', appToken
      ));
    }
    advance(); // consume "app"
    return { type: 'WebAppStatement' };
  }

  // route "<path>" ... done
  function parseSimpleRoute() {
    consume(TOKEN.ROUTE_KW);
    const routePath = consume(TOKEN.STRING,
      'Expected a route path after "route".\n\nExample:\n  route "/"\n    reply "Hello"\n  done').value;
    const body = parseBody('route');
    return { type: 'SimpleRouteStatement', path: routePath, body };
  }

  // bot "<token>"  /  bot env("BOT_TOKEN")
  // Creates the polling Telegram bot and binds it to BOT (v1.2). The token
  // argument may be any expression — the token literal is never required to
  // appear in source, and the runtime falls back to TELEGRAM_BOT_TOKEN.
  function parseBot() {
    advance(); // consume "bot"
    const token = parseExpression();
    return { type: 'ExpressionStatement', expression: { type: 'CallExpression', name: 'bot', args: [token] } };
  }

  // start <port>
  // start telegram bot  — explicit Telegram startup marker. Polling keeps
  // the bot alive, so this form is only for documentation/intent.
  function parseStart() {
    consume(TOKEN.START_KW);
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'telegram') {
      advance();
      const botToken = peek();
      if (botToken.type !== TOKEN.IDENTIFIER || botToken.value !== 'bot') {
        throw new Error(makeError(
          'Expected "bot" after "telegram".\n\nExample:\n  start telegram bot',
          botToken
        ));
      }
      advance();
      return { type: 'TelegramStartStatement' };
    }
    const port = parseExpression();
    return { type: 'StartStatement', port };
  }

  // ── v0.6 — SQLite DX ───────────────────────────────────────────────────────

  // database "<file>"
  function parseDatabase() {
    consume(TOKEN.DATABASE_KW);
    const file = consume(TOKEN.STRING,
      'Expected a database file path after "database".\n\nExample:\n  database "app.db"').value;
    return { type: 'DatabaseStatement', file };
  }

  // query/insert/update/delete/execute SQL_BODY DONE
  function parseSqlBlock(keyword, nodeType) {
    advance(); // consume the keyword token (QUERY_KW, INSERT_KW, etc.)
    const sqlToken = peek();
    if (sqlToken.type !== TOKEN.SQL_BODY) {
      throw new Error(makeError(
        `Expected a SQL block after "${keyword}".\n\nExample:\n  ${keyword}\n      SELECT * FROM users\n  done`,
        sqlToken
      ));
    }
    const sql = advance().value; // consume SQL_BODY
    consume(TOKEN.DONE, `Expected "done" to close the "${keyword}" block.`);
    return { type: nodeType, sql };
  }

  // ── Conditions ─────────────────────────────────────────────────────────────

  function parseIf() {
    consume(TOKEN.IF);
    const condition = parseCondition();

    const consequent = [];
    while (peek().type !== TOKEN.OTHERWISE && peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" before end of file to close the "if" block.',
          peek()
        ));
      }
      const stmt = parseStatement();
      if (stmt) consequent.push(stmt);
    }

    let alternate = null;
    if (peek().type === TOKEN.OTHERWISE) {
      advance();
      alternate = [];
      while (peek().type !== TOKEN.DONE) {
        if (peek().type === TOKEN.EOF) {
          throw new Error(makeError(
            'Expected keyword "done" before end of file to close the "otherwise" block.',
            peek()
          ));
        }
        const stmt = parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }

    advance(); // consume DONE
    return { type: 'IfStatement', condition, consequent, alternate };
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  function parseBody(context) {
    const body = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          `Expected keyword "done" to close the ${context} before end of file.`,
          peek()
        ));
      }
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    advance(); // consume DONE
    return body;
  }

  // ── Expressions ────────────────────────────────────────────────────────────

  // expression → primary ('+' primary)*
  function parseExpression() {
    let left = parsePrimary();
    while (peek().type === TOKEN.PLUS) {
      advance();
      const right = parsePrimary();
      left = { type: 'BinaryExpression', operator: '+', left, right };
    }
    return left;
  }

  // primary → itemExpr | atom (postfix)*
  function parsePrimary() {
    const item = tryParseItemExpression();
    if (item) return item;
    let node = parseAtom();
    while (true) {
      if (peek().type === TOKEN.LBRACKET) {
        advance();
        const index = parseExpression();
        consume(TOKEN.RBRACKET, 'Expected "]" to close the index.');
        node = { type: 'IndexExpression', object: node, index };
      } else if (peek().type === TOKEN.DOT) {
        advance();
        const property = consume(TOKEN.IDENTIFIER, 'Expected a property name after ".".').value;
        node = { type: 'MemberExpression', object: node, property };
      } else if (peek().type === TOKEN.IDENTIFIER && peek().value === 'of') {
        if (node.type !== 'Identifier') {
          throw new Error(makeError(
            'Expected a property name before "of".\n\nExample:\n  name of user',
            peek()
          ));
        }
        advance();
        const object = parsePrimary();
        node = { type: 'OfExpression', property: node, object };
      } else if (peek().type === TOKEN.IDENTIFIER && peek().value === 'length') {
        advance();
        node = { type: 'LengthExpression', object: node };
      } else {
        break;
      }
    }
    return node;
  }

  // v1.1 — Item expressions, detected before parseAtom:
  //   first player from players    → players[0]
  //   last player from players     → players[players.length - 1]
  //   player one from players      → players[0]
  // Shape: three identifiers, the third being "from".
  function tryParseItemExpression() {
    const first  = peek();
    const second = peekAt(1);
    const third  = peekAt(2);
    if (first.type  !== TOKEN.IDENTIFIER) return null;
    if (second.type !== TOKEN.IDENTIFIER) return null;
    if (third.type  !== TOKEN.IDENTIFIER) return null;

    // "first from players" / "last from players" — missing noun
    if ((first.value === 'first' || first.value === 'last') && second.value === 'from') {
      throw new Error(makeError(
        `Expected a noun after "${first.value}".\n\nExample:\n  ${first.value} player from players`,
        second
      ));
    }

    if (third.value !== 'from') return null;

    if (first.value === 'first') {
      advance(); // first
      advance(); // noun
      advance(); // from
      const collection = parsePrimary();
      return { type: 'FirstItem', collection };
    }

    if (first.value === 'last') {
      advance(); // last
      advance(); // noun
      advance(); // from
      const collection = parsePrimary();
      return { type: 'LastItem', collection };
    }

    if (second.value in NUMBER_WORDS) {
      const index = NUMBER_WORDS[second.value] - 1;
      advance(); // noun
      advance(); // number word
      advance(); // from
      const collection = parsePrimary();
      return { type: 'NumberedItem', index, collection };
    }

    throw new Error(makeError(
      `Expected a number word after "${first.value}" before "from".\n\nUse number words like "one", "two", "three".\n\nExample:\n  ${first.value} one from players`,
      second
    ));
  }

  // atom → STRING | NUMBER | '[' ... ']' | IDENTIFIER '(' args ')' | IDENTIFIER
  function parseAtom() {
    const token = peek();

    if (token.type === TOKEN.STRING)   { advance(); return { type: 'StringLiteral',  value: token.value }; }
    if (token.type === TOKEN.TEMPLATE_STRING) { advance(); return { type: 'TemplateLiteral',  value: token.value }; }
    if (token.type === TOKEN.NUMBER)   { advance(); return { type: 'NumberLiteral',  value: token.value }; }
    if (token.type === TOKEN.LBRACKET) { return parseArrayLiteral(); }
    if (token.type === TOKEN.LBRACE)   { return parseInlineObjectLiteral(); }

    if (token.type === TOKEN.IDENTIFIER) {
      if (peekAt(1).type === TOKEN.LPAREN) return parseCallExpression();
      advance();
      return { type: 'Identifier', name: token.value };
    }

    throw new Error(makeError(
      `Expected a value (a word, number, string, or array) but got "${token.value || token.type}".`,
      token
    ));
  }

  // [ expr, expr, ... ]
  function parseArrayLiteral() {
    consume(TOKEN.LBRACKET);
    const elements = [];
    while (peek().type !== TOKEN.RBRACKET) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError('Expected "]" to close the array before end of file.', peek()));
      }
      elements.push(parseExpression());
      if (peek().type === TOKEN.COMMA) advance();
    }
    consume(TOKEN.RBRACKET, 'Expected "]" to close the array.');
    return { type: 'ArrayLiteral', elements };
  }

  // v1.2 — Inline object literal: { key: value, ... }
  function parseInlineObjectLiteral() {
    consume(TOKEN.LBRACE);
    const properties = [];
    while (peek().type !== TOKEN.RBRACE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected "}" to close the inline object before end of file.',
          peek()
        ));
      }
      const keyToken = peek();
      if (keyToken.type !== TOKEN.IDENTIFIER && keyToken.type !== TOKEN.STRING) {
        throw new Error(makeError(
          'Expected a property name inside the inline object.\n\nExample:\n  { text: "hi" }',
          keyToken
        ));
      }
      advance();
      const key = keyToken.value;
      consume(TOKEN.COLON, `Expected ":" after property name "${key}".\n\nExample:\n  { ${key}: "hi" }`);
      const value = parseExpression();
      properties.push({ key, value });
      if (peek().type === TOKEN.COMMA) advance();
    }
    consume(TOKEN.RBRACE, 'Expected "}" to close the inline object.');
    return { type: 'InlineObjectLiteral', properties };
  }

  // Object literal body: key is value  ...  done
  function parseObjectLiteral() {
    const properties = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the object literal before end of file.',
          peek()
        ));
      }
      const key = consume(TOKEN.IDENTIFIER, 'Expected a property name.').value;
      consume(TOKEN.IS, `Expected "is" after property name "${key}".\n\nExample:\n  name is "Ayokunle"`);
      const value = parseExpression();
      properties.push({ key, value });
    }
    advance(); // consume DONE
    return { type: 'ObjectLiteral', properties };
  }

  // name(arg, arg, ...)
  // name(value to collection)  → v1.1 collection/io forms (add, remove, write)
  function parseCallExpression() {
    const nameToken = peek();
    const name = advance().value;
    consume(TOKEN.LPAREN, `Expected "(" after function name "${name}".`);
    const { separator, args } = parseArgList();
    consume(TOKEN.RPAREN, 'Expected ")" to close the argument list.');
    if (separator) return buildSpecialCall(name, separator, args, nameToken);
    // remove(last player from players): the item expression already consumed
    // "from <collection>", so reinterpret the single item argument as the
    // remove(value from collection) operation.
    if (name === 'remove' && args.length === 1 &&
        (args[0].type === 'FirstItem' || args[0].type === 'LastItem' || args[0].type === 'NumberedItem')) {
      return { type: 'RemoveCall', value: args[0], collection: args[0].collection };
    }
    return { type: 'CallExpression', name, args };
  }

  function parseArgList() {
    const args = [];
    let separator = null;
    if (peek().type === TOKEN.RPAREN) return { separator, args };
    if (peek().type === TOKEN.EOF) {
      throw new Error(makeError('Expected ")" to close the argument list before end of file.', peek()));
    }
    args.push(parseExpression());
    while (peek().type === TOKEN.COMMA) {
      advance();
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError('Expected ")" to close the argument list before end of file.', peek()));
      }
      args.push(parseExpression());
    }
    // v1.1 — collection expressions: add(item to list) / remove(item from list) / write(data to "file")
    if (args.length === 1 && peek().type === TOKEN.IDENTIFIER &&
        (peek().value === 'to' || peek().value === 'from')) {
      separator = peek().value;
      advance();
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(`Expected a value after "${separator}".`, peek()));
      }
      args.push(parseExpression());
    }
    return { separator, args };
  }

  // v1.1 — Build a collection or I/O expression from a "to"/"from" special form.
  function buildSpecialCall(name, separator, args, nameToken) {
    if (separator === 'to' && name === 'add') {
      return { type: 'AddCall', value: args[0], collection: args[1] };
    }
    if (separator === 'from' && name === 'remove') {
      return { type: 'RemoveCall', value: args[0], collection: args[1] };
    }
    if (separator === 'to' && name === 'write') {
      return { type: 'WriteCall', data: args[0], file: args[1] };
    }
    throw new Error(makeError(
      `"${name}" is not a valid Plain collection expression.\n\nPlain supports:\n  add(item to collection)\n  remove(item from collection)\n  write(data to "file")`,
      nameToken
    ));
  }

  // ── Program ────────────────────────────────────────────────────────────────

  const body = [];
  while (peek().type !== TOKEN.EOF) {
    const stmt = parseStatement();
    if (stmt) body.push(stmt);
  }
  return { type: 'Program', body };
}

module.exports = { parse };
