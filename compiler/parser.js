// Parser: converts a token stream into an AST (Abstract Syntax Tree).

const { TOKEN } = require('./lexer');

// Statement-starting PlainScript keywords, used for "did you mean?" suggestions.
const STATEMENT_KEYWORDS = [
  'remember', 'show', 'if', 'make', 'give',
  'for', 'while', 'use', 'import', 'when', 'listen', 'reply', 'serve',
  'web', 'route', 'start', 'database', 'query', 'insert', 'update', 'delete', 'execute',
  'ask', 'javascript', 'bot', 'ocr', 'try', 'recover', 'retry',
  'gather', 'filter', 'total', 'match', 'emit', 'stream', 'run',
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

// HTTP methods accepted by the route statement (v2.1.0). Lowercase only —
// PlainScript keywords are lowercase by convention.
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// Time units accepted by the "every <n> <unit>" statement, in milliseconds
// (used by the generator to build the interval directly).
const TIME_UNITS = {
  second: 1000, seconds: 1000,
  minute: 60 * 1000, minutes: 60 * 1000,
  hour: 60 * 60 * 1000, hours: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000, days: 24 * 60 * 60 * 1000,
};

// v2.1.0 — split raw SQL into placeholder-free text and ordered parameter
// names. "{name}" marks a bound parameter; the generator renders "?" for
// SQLite or "$1…" for PostgreSQL.
function extractSqlParams(rawSql) {
  const params = [];
  const sql = String(rawSql).replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name) => {
    params.push(name);
    return '?';
  });
  return { sql, params };
}

// v2.1.1 — parse an upload size limit such as "5 MB", "512 KB", "1GB" or
// "100B" into a byte count. Returns null when the text is not a valid size.
const UPLOAD_SIZE_UNITS = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
function parseUploadSize(text) {
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i.exec(String(text).trim());
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * UPLOAD_SIZE_UNITS[match[2].toLowerCase()]);
}

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
  // v2.1.1 grammar (outermost first):
  //   condition   := andCondition ("or" andCondition)*
  //   andCondition:= notCondition ("and" notCondition)*
  //   notCondition:= "not" notCondition | comparison
  //   comparison  := the single-comparison forms below
  //
  // Node shapes produced by the comparison level:
  //   BinaryCondition  { type, left, op, right }      — left op right
  //   UnaryCondition   { type, left, op }              — left is empty / is not empty
  //   BetweenCondition { type, left, low, high }       — left between low and high
  //   StringCondition  { type, left, method, right }   — left contains/startsWith/endsWith right
  // plus LogicalCondition { type, op: "and"|"or", left, right } and
  //                      { type, op: "not", operand } from the combinator levels.

  // Entry point used by if/while.
  function parseCondition() {
    let left = parseAndCondition();
    while (peek().type === TOKEN.OR) {
      advance();
      const right = parseAndCondition();
      left = { type: 'LogicalCondition', op: 'or', left, right };
    }
    return left;
  }

  function parseAndCondition() {
    let left = parseNotCondition();
    while (peek().type === TOKEN.AND) {
      advance();
      const right = parseNotCondition();
      left = { type: 'LogicalCondition', op: 'and', left, right };
    }
    return left;
  }

  function parseNotCondition() {
    if (peek().type === TOKEN.NOT) {
      advance();
      return { type: 'LogicalCondition', op: 'not', operand: parseNotCondition() };
    }
    return parseComparisonCondition();
  }

  function parseComparisonCondition() {
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
    // v1.0.0-latest — generators: `yield <expr>` is only meaningful inside a function
    // body; the generator marks the enclosing `make ... done` as a function*.
    if (token.type === TOKEN.YIELD)       return parseYield();
    if (token.type === TOKEN.FOR)         return parseForEach();
    // v2.1.0 — every <n> <unit>s … done: interval scheduling. "every" also
    // lexes as TOKEN.EACH (the "for every" alias), so only the number+unit
    // form is intercepted; "for every item in list" keeps its meaning.
    if (token.type === TOKEN.EACH && peekAt(1).type === TOKEN.NUMBER &&
        peekAt(2).type === TOKEN.IDENTIFIER && TIME_UNITS[peekAt(2).value]) {
      return parseEvery();
    }
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
    // v2.0.1 — OCR capability
    if (token.type === TOKEN.OCR_KW)      return parseOcr();
    // v0.6
    if (token.type === TOKEN.WEB)         return parseWebApp();
    if (token.type === TOKEN.ROUTE_KW)    return parseSimpleRoute();
    if (token.type === TOKEN.START_KW)    return parseStart();
    if (token.type === TOKEN.DATABASE_KW) return parseDatabase();
    // v2.1.0 — query("field"): the HTTP query-string accessor. The SQLite
    // block form keeps priority when "query" stands alone on a line; a
    // call form is always the accessor.
    if (token.type === TOKEN.QUERY_KW && peekAt(1).type === TOKEN.LPAREN) {
      return { type: 'ExpressionStatement', expression: parseCallExpression() };
    }
    if (token.type === TOKEN.QUERY_KW)    return parseSqlBlock('query',   'QueryStatement');
    if (token.type === TOKEN.INSERT_KW)   return parseSqlBlock('insert',  'InsertStatement');
    if (token.type === TOKEN.UPDATE_KW)   return parseSqlBlock('update',  'UpdateStatement');
    // v2.1.1 — delete "<url>" is an HTTP DELETE request; a bare "delete"
    // starting a raw block keeps its SQL meaning.
    if (token.type === TOKEN.DELETE_KW && tokenStartsValue(peekAt(1))) {
      return { type: 'ExpressionStatement', expression: parseHttpCall('delete') };
    }
    if (token.type === TOKEN.DELETE_KW)   return parseSqlBlock('delete',  'DeleteStatement');
    if (token.type === TOKEN.EXECUTE_KW)  return parseSqlBlock('execute', 'ExecuteStatement');

    // IOPL-native features
    if (token.type === TOKEN.GATHER)     return parseGatherStatement();
    if (token.type === TOKEN.FILTER_KW)  return parseFilterStatement();
    if (token.type === TOKEN.TOTAL)      return parseTotalStatement();
    if (token.type === TOKEN.MATCH)      return parseMatchStatement();
    if (token.type === TOKEN.EMIT)       return parseEmitStatement();
    if (token.type === TOKEN.STREAM)     return parseStreamStatement();

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

      // v2.1.0 — allow cors: enables CORS middleware on the current app.
      // Contextual (not a reserved keyword): a variable named "allow" keeps
      // its ordinary meaning.
      if (token.value === 'allow' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'cors') {
        advance(); // allow
        advance(); // cors
        return { type: 'AllowCorsStatement' };
      }

      // v2.1.0 — group "<prefix>" ... done: composes routes under a shared
      // path prefix. Contextual like "bot": only intercepted when a quoted
      // prefix follows.
      if (token.value === 'group' && peekAt(1).type === TOKEN.STRING) {
        advance(); // group
        const prefix = advance().value; // consume STRING
        const body = parseBody('"group" block');
        return { type: 'GroupStatement', prefix, body };
      }

      // v2.1.0 — postgres "<connection>": binds the PostgreSQL driver.
      // Contextual: a variable named "postgres" keeps its meaning unless a
      // connection value follows on the same line.
      if (token.value === 'postgres' && (
          peekAt(1).type === TOKEN.STRING || peekAt(1).type === TOKEN.IDENTIFIER ||
          peekAt(1).type === TOKEN.LPAREN || peekAt(1).type === TOKEN.TEMPLATE_STRING)) {
        return parsePostgres();
      }

      // v2.1.0 — cache "<redis-url>" / cache env("REDIS_URL"): connects the
      // shared Redis client used by cacheGet / cacheSet / cacheDelete.
      // Contextual like "postgres": a variable named "cache" keeps its
      // meaning unless a connection value follows on the same line.
      if (token.value === 'cache' && (
          peekAt(1).type === TOKEN.STRING || peekAt(1).type === TOKEN.TEMPLATE_STRING ||
          peekAt(1).type === TOKEN.IDENTIFIER || peekAt(1).type === TOKEN.LPAREN)) {
        advance(); // cache
        const url = parseExpression();
        return { type: 'CacheStatement', url };
      }

      // v2.1.0 — transaction … done: groups database writes atomically.
      // Contextual: "transaction becomes x" and "transaction(...)" keep
      // their ordinary variable/function meanings.
      if (token.value === 'transaction' &&
          peekAt(1).type !== TOKEN.BECOMES && peekAt(1).type !== TOKEN.LPAREN) {
        advance(); // transaction
        const body = parseBody('"transaction" block');
        return { type: 'TransactionStatement', body };
      }

      // v2.1.0 — mail transport … done: configures the outgoing mailer.
      if (token.value === 'mail' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'transport') {
        advance(); // mail
        advance(); // transport
        return { type: 'MailTransportStatement', options: parsePropertyList('"mail transport" block') };
      }

      // v2.1.0 — send mail … done: sends one email through the transport.
      if (token.value === 'send' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'mail') {
        advance(); // send
        advance(); // mail
        return { type: 'SendMailStatement', fields: parsePropertyList('"send mail" block') };
      }

      // v2.1.0 — every <n> <unit>s … done: repeat work on an interval.
      // ("every" lexes as TOKEN.EACH — see the EACH dispatch above — so this
      // identifier-form branch only guards against future lexer changes.)
      if (token.value === 'every' && peekAt(1).type === TOKEN.NUMBER &&
          peekAt(2).type === TOKEN.IDENTIFIER && TIME_UNITS[peekAt(2).value]) {
        return parseEvery();
      }

      // v2.1.0 — schedule "<cron>" … done: run work on a cron schedule.
      if (token.value === 'schedule' && peekAt(1).type === TOKEN.STRING) {
        advance(); // schedule
        const expression = advance().value; // cron string
        const body = parseBody('"schedule" block');
        return { type: 'ScheduleStatement', expression, body };
      }

      // v2.1.0 — run background <call>: fire-and-forget execution.
      if (token.value === 'run' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'background') {
        advance(); // run
        advance(); // background
        const call = parsePrimary();
        if (call.type !== 'CallExpression') {
          throw new Error(makeError(
            'Expected a function call after "run background".\n\nExample:\n  run background resizeImage("photo.png")',
            peek()
          ));
        }
        return { type: 'RunBackgroundStatement', call };
      }

      // run in parallel ... done as <name>: worker threads with a result name.
      if (token.value === 'run' &&
          peekAt(1).type === TOKEN.IN && peekAt(2).type === TOKEN.PARALLEL) {
        return parseRunParallelStatement();
      }

      // v2.1.0 — websocket server on <port> … done: realtime endpoint.
      if (token.value === 'websocket' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'server') {
        return parseWebSocketServer();
      }

      // v2.1.1 — whatsapp bot … done: WhatsApp bot runtime (Baileys under
      // the hood). Contextual: a variable named "whatsapp" keeps its meaning;
      // only "whatsapp bot" opens the block.
      if (token.value === 'whatsapp' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'bot') {
        return parseWhatsAppBot();
      }

      // v2.1.1 — log message: prints the normalized message record inside an
      // "on message" handler. Generation rejects it everywhere else with a
      // teaching error.
      if (token.value === 'log' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'message') {
        advance(); // log
        advance(); // message
        return { type: 'WhatsAppLogStatement' };
      }

      // v2.1.0 — broadcast <expr>: sends to every connected socket.
      if (token.value === 'broadcast') {
        advance(); // broadcast
        const value = parseExpression();
        return { type: 'BroadcastStatement', value };
      }

      // v2.1.0 — send socket <expr>: replies to one connected socket.
      if (token.value === 'send' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'socket') {
        advance(); // send
        advance(); // socket
        const value = parseExpression();
        return { type: 'SendSocketStatement', value };
      }

      // v2.1.0 — status 404 / status <expr>: sets the HTTP response status.
      // Contextual: "status becomes 404" is still a normal reassignment of a
      // variable named "status", and "status(...)" remains a function call.
      if (token.value === 'status' && peekAt(1).type !== TOKEN.BECOMES &&
          (peekAt(1).type === TOKEN.NUMBER || peekAt(1).type === TOKEN.STRING ||
           peekAt(1).type === TOKEN.TEMPLATE_STRING ||
           peekAt(1).type === TOKEN.IDENTIFIER)) {
        advance(); // status
        const value = parseExpression();
        return { type: 'StatusStatement', value };
      }

      // v2.2.0 — redirect to "<url>": sends an HTTP redirect from a route
      // handler. "redirect(...)" calls and "redirect becomes x" stay ordinary.
      if (token.value === 'redirect' && peekAt(1).value === 'to') {
        advance(); // redirect
        advance(); // to
        const url = parseExpression();
        return { type: 'RedirectStatement', url };
      }

      // ── v2.1.1 statements (all contextual, following the v2.1.0 pattern) ──

      // try … [recover [as <name>]] … done: deterministic error handling.
      // "try(...)" calls and "try becomes x" keep their ordinary meaning.
      if (token.value === 'try' &&
          peekAt(1).type !== TOKEN.LPAREN && peekAt(1).type !== TOKEN.BECOMES) {
        return parseTryStatement();
      }

      // wait for <value>: await an async operation as a statement.
      if (token.value === 'wait' && peekAt(1).type === TOKEN.FOR) {
        advance(); // wait
        advance(); // for
        return { type: 'ExpressionStatement', expression: { type: 'AwaitExpression', value: parseUnary() } };
      }

      // retry <n> times [every <n> seconds] … done
      if (token.value === 'retry' && peekAt(1).type === TOKEN.NUMBER) {
        return parseRetry();
      }

      // accept uploads [limit "<size>"] [allow ["mime", ...]] [folder "<dir>"]
      if (token.value === 'accept' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'uploads') {
        return parseAcceptUploads();
      }

      // require api key from <expr>: rejects requests without a valid key.
      if (token.value === 'require' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'api') {
        return parseRequireApiKey();
      }

      // enable sessions <secret>: signed-cookie sessions on the current app.
      if (token.value === 'enable' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'sessions') {
        advance(); // enable
        advance(); // sessions
        return { type: 'EnableSessionsStatement', secret: parseExpression() };
      }

      // destroy session: clears the current session (inside a route).
      if (token.value === 'destroy' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'session') {
        advance(); // destroy
        advance(); // session
        return { type: 'DestroySessionStatement' };
      }

      // set cookie "<name>" to <expr> [expires in <n> <unit>] / clear cookie "<name>"
      if (token.value === 'set' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'cookie') {
        return parseSetCookie();
      }
      if (token.value === 'clear' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'cookie') {
        advance(); // clear
        advance(); // cookie
        const name = consume(TOKEN.STRING,
          'Expected a cookie name string after "clear cookie".\n\nExample:\n  clear cookie "theme"').value;
        return { type: 'ClearCookieStatement', name };
      }

      // limit requests to <n> per <unit>: rate limiting middleware.
      if (token.value === 'limit' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'requests') {
        return parseRateLimit();
      }

      // google oauth … done: explicit Google OAuth 2.0 semantics.
      if (token.value === 'google' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'oauth') {
        advance(); // google
        advance(); // oauth
        return { type: 'GoogleOAuthStatement', options: parsePropertyList('"google oauth" block') };
      }

      // ── v1.0.0-latest — capability-gap features (all contextual, IOPL-native) ──

      // define a kind called "Person" with … done  → record schema (classes)
      if (token.value === 'define' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'a') {
        return parseDefineKind();
      }

      // load env file "<path>" → apply .env KEY=VALUE pairs to process.env
      if (token.value === 'load' &&
          peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'env' &&
          peekAt(2).type === TOKEN.IDENTIFIER && peekAt(2).value === 'file') {
        advance(); // load
        advance(); // env
        advance(); // file
        const path = consume(TOKEN.STRING,
          'Expected an env file path string after "load env file".\n\nExample:\n  load env file ".env"');
        return { type: 'LoadEnvFileStatement', path: path.value };
      }

      // test "<name>" … done  → native test DSL
      if (token.value === 'test' && peekAt(1).type === TOKEN.STRING) {
        return parseTestStatement();
      }

      // check …  → assertion, only valid inside a test block
      if (token.value === 'check') {
        return parseCheckStatement();
      }

      // export <name>  → mark a top-level symbol for module.exports
      if (token.value === 'export' &&
          peekAt(1).type === TOKEN.IDENTIFIER &&
          peekAt(2).type !== TOKEN.LPAREN) {
        advance(); // export
        const name = advance().value;
        return { type: 'ExportStatement', name };
      }

      // throw <value>  → raise an error for the caller's try/recover to catch.
      // "throw(...)" calls and "throw becomes x" keep their ordinary meaning.
      if (token.value === 'throw' &&
          peekAt(1).type !== TOKEN.LPAREN && peekAt(1).type !== TOKEN.BECOMES) {
        advance(); // throw
        const value = parseExpression();
        return { type: 'ThrowStatement', value };
      }

      // break / continue → loop control flow. Contextual keywords: a variable
      // literally named break/continue is rejected by the teaching guard in
      // generateStatement when not inside a loop.
      if (token.value === 'break' &&
          peekAt(1).type !== TOKEN.BECOMES && peekAt(1).type !== TOKEN.LPAREN) {
        advance(); // break
        return { type: 'BreakStatement' };
      }
      if (token.value === 'continue' &&
          peekAt(1).type !== TOKEN.BECOMES && peekAt(1).type !== TOKEN.LPAREN) {
        advance(); // continue
        return { type: 'ContinueStatement' };
      }

      const expr = parsePrimary();

      if (peek().type === TOKEN.BECOMES) {
        advance();
        const value = parseExpression();
        return { type: 'BecomeStatement', target: expr, value };
      }

      if (expr.type === 'CallExpression' ||
          expr.type === 'AddCall' ||
          expr.type === 'RemoveCall' ||
          expr.type === 'WriteCall' ||
          expr.type === 'HttpCall' ||
          expr.type === 'AwaitExpression') {
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
        `Unexpected word "${word}". This is not a valid statement in PlainScript.`,
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

    // v2.1.0 — remember <name> as query|insert|update|delete … done
    // Captures the SQL result: rows for "query", the run info (changes /
    // lastInsertRowid) for the write forms. The call form query("field")
    // is the HTTP accessor and still parses as an expression below.
    if (
      [TOKEN.QUERY_KW, TOKEN.INSERT_KW, TOKEN.UPDATE_KW, TOKEN.DELETE_KW, TOKEN.EXECUTE_KW]
        .includes(peek().type) && peekAt(1).type === TOKEN.SQL_BODY
    ) {
      const kindToken = advance();
      const kind = kindToken.value;
      const sql = advance().value; // consume SQL_BODY
      consume(TOKEN.DONE, `Expected "done" to close the "${kind}" block.`);
      return { type: 'RememberSqlStatement', name, kind, ...extractSqlParams(sql) };
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

  // v2.0.1 — OCR capability.
  //
  //   ocr "<image>" as <variable>
  //   ocr "<image>" as <variable> using "<lang>"
  //
  // Extracts text from an image into a variable (mirrors `ask ... as name`).
  // The optional `using "<lang>"` selects a Tesseract language pack such as
  // "eng", "deu", or "deu+eng"; it defaults to "eng".
  function parseOcr() {
    consume(TOKEN.OCR_KW);
    const image = parseExpression();
    consume(TOKEN.AS,
      'Expected "as <name>" after the image in an ocr statement.\n\nExamples:\n  ocr "scan.png" as text\n  ocr "scan.png" as text using "deu"'
    );
    const variable = consume(TOKEN.IDENTIFIER,
      'Expected a variable name after "as".\n\nExample:\n  ocr "scan.png" as text'
    ).value;
    let lang = null;
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'using') {
      advance(); // consume using
      lang = consume(TOKEN.STRING,
        'Expected a language string after "using".\n\nExample:\n  ocr "scan.png" as text using "deu"'
      ).value;
    }
    return { type: 'OcrStatement', image, variable, lang };
  }

  function parseShow() {
    consume(TOKEN.SHOW);
    // Support both keyword form (show "text") and call form (show("text")).
    // A "(" after "show" only means a call when the matching ")" ends the
    // expression; otherwise it is a grouped value like show (2 + 3) * 4.
    if (peek().type === TOKEN.LPAREN && !groupContinuesAfterMatch()) {
      advance(); // consume (
      const value = parseExpression();
      consume(TOKEN.RPAREN, 'Expected ")" to close "show" call.');
      return { type: 'ShowStatement', value };
    }
    const value = parseExpression();
    return { type: 'ShowStatement', value };
  }

  // From the current "(" token, find its matching ")". Returns true when the
  // expression continues after the match (operator or postfix), meaning the
  // parenthesised group is part of a larger expression.
  function groupContinuesAfterMatch() {
    let depth = 0;
    for (let i = pos; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === TOKEN.LPAREN) depth++;
      else if (t.type === TOKEN.RPAREN) {
        depth--;
        if (depth === 0) {
          const after = tokens[i + 1];
          if (!after || after.type === TOKEN.EOF) return false;
          return (
            after.type === TOKEN.STAR || after.type === TOKEN.SLASH ||
            after.type === TOKEN.PERCENT || after.type === TOKEN.PLUS ||
            after.type === TOKEN.MINUS || after.type === TOKEN.LBRACKET ||
            after.type === TOKEN.DOT ||
            (after.type === TOKEN.IDENTIFIER &&
              ['of', 'length', 'above', 'below', 'contains', 'matches', 'becomes'].includes(after.value))
          );
        }
      }
    }
    return false;
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
    const firstName = consume(TOKEN.IDENTIFIER, 'Expected a parameter name.').value;
    const firstParam = { name: firstName };
    if (peek().type === TOKEN.AS) {
      advance(); // as
      const dv = parseDefaultValue();
      if (dv) firstParam.defaultValue = dv;
    }
    params.push(firstParam);
    while (peek().type === TOKEN.COMMA) {
      advance();
      const pName = consume(TOKEN.IDENTIFIER, 'Expected a parameter name after ",".').value;
      const param = { name: pName };
      if (peek().type === TOKEN.AS) {
        advance(); // as
        const dv = parseDefaultValue();
        if (dv) param.defaultValue = dv;
      }
      params.push(param);
    }
    return params;
  }

  function parseDefaultValue() {
    const token = peek();
    if (token.type === TOKEN.STRING) {
      advance();
      return { type: 'StringLiteral', value: token.value };
    }
    if (token.type === TOKEN.NUMBER) {
      advance();
      return { type: 'NumberLiteral', value: token.value };
    }
    if (token.type === TOKEN.TRUE_KW) {
      advance();
      return { type: 'BooleanLiteral', value: true };
    }
    if (token.type === TOKEN.FALSE_KW) {
      advance();
      return { type: 'BooleanLiteral', value: false };
    }
    if (token.type === TOKEN.NULL_KW) {
      advance();
      return { type: 'NullLiteral' };
    }
    return null;
  }

  function parseGive() {
    consume(TOKEN.GIVE);
    const value = parseExpression();
    return { type: 'GiveStatement', value };
  }

  // v1.0.0-latest — generators: `yield <expr>` (optionally bare `yield`).
  function parseYield() {
    consume(TOKEN.YIELD);
    let value = null;
    if (peek().type !== TOKEN.DONE && peek().type !== TOKEN.EOF) {
      value = parseExpression();
    }
    return { type: 'YieldStatement', value };
  }

  // v1.0.0-latest — record kinds: `define a kind called "Person" with … done`
  // The field block reuses the property-list grammar (`age is 0`), so each
  // field gets a default expression just like an object literal.
  function parseDefineKind() {
    advance(); // define
    const art = advance(); // "a" / "an"
    // `define a kind called "Person"` — the word "kind" is optional prose.
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'kind') {
      advance(); // kind
    } else if (peek().type === TOKEN.IDENTIFIER && peek().value === 'called') {
      advance(); // (implicit 'kind' omitted)
    } else {
      throw new Error(makeError(
        'Expected "kind" (or "called") after "define a ' + art.value + '".\n\nExample:\n  define a kind called "Person" with\n    name is ""\n  done',
        peek()
      ));
    }
    const called = peek();
    if (called.type !== TOKEN.IDENTIFIER || called.value !== 'called') {
      throw new Error(makeError(
        'Expected "called" after "define a kind".\n\nExample:\n  define a kind called "Person" with\n    name is ""\n  done',
        called
      ));
    }
    advance(); // called
    let name;
    if (peek().type === TOKEN.STRING) {
      name = advance().value;
    } else {
      const t = consume(TOKEN.IDENTIFIER, 'Expected a kind name after "kind called".');
      name = t.value;
    }
    consume(TOKEN.WITH, 'Expected "with" after the kind name.\n\nExample:\n  define a kind called "Person" with\n    name is ""\n  done');
    const fields = parsePropertyList('kind "' + name + '" definition');
    return { type: 'DefineKindStatement', name, fields };
  }

  // v1.0.0-latest — record constructor (expression): `create a Person with name "Ada" and age 17`
  function parseCreateKind() {
    advance(); // create
    advance(); // a / an
    const kind = consume(TOKEN.IDENTIFIER, 'Expected a kind name after "create a".').value;
    consume(TOKEN.WITH, 'Expected "with" after the kind name.\n\nExample:\n  create a Person with name "Ada" and age 17');
    const pairs = [];
    while (true) {
      const key = consume(TOKEN.IDENTIFIER, 'Expected a field name in "create a ' + kind + ' with ...".').value;
      const value = parsePrimary();
      pairs.push({ key, value });
      if (peek().type === TOKEN.AND) {
        advance();
        continue;
      }
      break;
    }
    return { type: 'CreateKindExpression', kind, pairs };
  }

  // v1.0.0-latest — native test DSL: `test "name" … done`
  function parseTestStatement() {
    advance(); // test
    const name = consume(TOKEN.STRING, 'Expected a test name string after "test".').value;
    const body = parseBody('"test" block');
    return { type: 'TestStatement', name, body };
  }

  // v1.0.0-latest — assertions: `check <a> (equals|is|contains|raises) <b>`
  function parseCheckStatement() {
    advance(); // check
    const a = parseExpression();
    const opToken = peek();
    if (!['equals', 'is', 'contains', 'raises'].includes(opToken.value)) {
      throw new Error(makeError(
        'Expected "equals", "is", "contains" or "raises" after the value in a "check".\n\nExample:\n  check score equals 42',
        opToken
      ));
    }
    const op = advance().value;
    const b = parseExpression();
    return { type: 'CheckStatement', a, op, b };
  }

  // for each <item> in <collection> ... done
  // for every <item> in <collection> ... done  (alias — "every" maps to EACH token)
  function parseForEach() {
    consume(TOKEN.FOR);

    // for index <name> from <start> to <end> [by <step>] ... done
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'index') {
      advance(); // index
      const name = consume(
        TOKEN.IDENTIFIER,
        'Expected an index name after "for index".\n\nExample:\n  for index i from 0 to 9\n    show i\n  done'
      ).value;
      if (peek().type === TOKEN.IN || (peek().type === TOKEN.IDENTIFIER && peek().value === 'in')) {
        // for index <name> in <collection> — zero-based index over a list.
        advance(); // in
        const collection = parseExpression();
        const body = parseBody('"for index" loop');
        return { type: 'ForIndexStatement', name, start: null, end: collection, step: null, over: collection, body };
      }
      if (peek().type !== TOKEN.IDENTIFIER || peek().value !== 'from') {
        throw new Error(makeError(
          'Expected "from" or "in" after the "for index" name.\n\nExample:\n  for index i from 0 to 9\n  for index i in players',
          peek()
        ));
      }
      advance(); // from
      const start = parseExpression();
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'to') {
        advance(); // to
      } else {
        throw new Error(makeError(
          'Expected "to" between the start and end of a "for index" loop.\n\nExample:\n  for index i from 0 to 9',
          peek()
        ));
      }
      const end = parseExpression();
      let step = null;
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'by') {
        advance(); // by
        step = parseExpression();
      }
      const body = parseBody('"for index" loop');
      return { type: 'ForIndexStatement', name, start, end, step, over: null, body };
    }

    consume(TOKEN.EACH,
      'Expected "each", "every" or "index" after "for".\n\nExample:\n  for each item in players\n    show item\n  done');
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

  // import "./file.ps"
  // import { name1, name2 } from "./file.ps"  (named imports — binds only the
  //   listed symbols; the whole file is still bundled as a dependency)
  function parseImport() {
    consume(TOKEN.IMPORT);

    // Named-import form: import { a, b } from "./file.ps"
    if (peek().type === TOKEN.LBRACE) {
      advance(); // {
      const names = [];
      while (true) {
        names.push(consume(
          TOKEN.IDENTIFIER,
          'Expected an exported name inside the import braces.\n\nExample:\n  import { helper } from "./util.ps"'
        ).value);
        if (peek().type === TOKEN.COMMA) { advance(); continue; }
        break;
      }
      consume(TOKEN.RBRACE,
        'Expected "}" to close the import braces.\n\nExample:\n  import { helper } from "./util.ps"');
      // The "from" is a plain identifier; tolerate its optional presence so
      // both "import { x } from "./f.ps"" and "import { x } "./f.ps"" read
      // naturally, but require it for the documented form.
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'from') {
        advance(); // from
      }
      const filePath = consume(
        TOKEN.STRING,
        'Expected a file path string after the import.\n\nExample:\n  import { helper } from "./util.ps"'
      ).value;
      return { type: 'ImportStatement', path: filePath, names };
    }

    // Whole-module form: import "./file.ps"
    const filePath = consume(
      TOKEN.STRING,
      'Expected a file path string after "import".\n\nExample:\n  import "./math.ps"'
    ).value;
    return { type: 'ImportStatement', path: filePath };
  }

  // use <module>            — side-effect or canonical binding
  // use <module> as <name>  — bind the package to a custom variable name
  // <module> may carry a version range: use left-pad@^1.3.0
  function parseUse() {
    consume(TOKEN.USE);
    const token = peek();
    if (token.type !== TOKEN.PACKAGE && token.type !== TOKEN.IDENTIFIER) {
      throw new Error(makeError(
        'Expected a module name after "use".\n\nExamples:\n  use express\n  use node-fetch as fetch\n  use left-pad@^1.3.0',
        token
      ));
    }
    advance();
    let alias = null;
    if (peek().type === TOKEN.AS) {
      advance(); // consume "as"
      alias = consume(TOKEN.IDENTIFIER,
        'Expected a variable name after "as".\n\nExample:\n  use node-fetch as fetch'
      ).value;
    }
    return { type: 'UseStatement', module: token.value, alias };
  }

  // when someone visits "<path>" ... done     → Express route
  // when someone sends "<command>" ... done    → Telegram command handler
  // when someone sends matching "<pattern>" ... done
  // when someone clicks "<data>" ... done      → Telegram callback handler
  // when socket connects|sends message|disconnects   → v2.1.0 websocket handlers
  function parseWhen() {
    consume(TOKEN.WHEN);

    // v2.1.1 — "when nothing matches … done" registers the 404 catch-all.
    // It must appear after every route in the source; the generated handler
    // keeps that position.
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'nothing') {
      advance(); // nothing
      const matchesToken = peek();
      if (matchesToken.type !== TOKEN.IDENTIFIER || matchesToken.value !== 'matches') {
        throw new Error(makeError(
          'Expected "matches" after "when nothing".\n\nExample:\n  when nothing matches\n    status 404\n    reply "Not found"\n  done',
          matchesToken
        ));
      }
      advance(); // matches
      const body = parseBody('"when nothing matches" block');
      return { type: 'NotFoundStatement', body };
    }

    // IOPL-native — "when \"event\" happens as data … done": event listener.
    // Must be checked before the "when someone" path.
    if (peek().type === TOKEN.STRING &&
        peekAt(1).type === TOKEN.HAPPENS) {
      const eventStr = advance().value;
      advance(); // happens
      let paramName = null;
      if (peek().type === TOKEN.AS) {
        advance(); // as
        paramName = consume(TOKEN.IDENTIFIER,
          'Expected a parameter name after "as".\n\nExample:\n  when "data.received" happens as data').value;
      }
      const body = parseBody('"when happens" block');
      return { type: 'WhenHappensStatement', event: eventStr, paramName, body };
    }

    // v2.1.0 — socket handlers inside a "websocket server" block come first:
    // they read "when socket …", not "when someone …".
    const whenToken = peek();
    if (whenToken.type === TOKEN.IDENTIFIER && whenToken.value === 'socket') {
      return parseSocketHandler();
    }

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

  // v2.1.0 — socket handlers inside a "websocket server" block:
  //   when socket connects … done
  //   when socket sends message … done
  //   when socket disconnects … done
  function parseSocketHandler() {
    advance(); // socket
    const event = peek();
    if (event.type !== TOKEN.IDENTIFIER ||
        !['connects', 'sends', 'disconnects'].includes(event.value)) {
      throw new Error(makeError(
        'Expected "connects", "sends message", or "disconnects" after "when socket".',
        event
      ));
    }
    const kind = event.value;
    advance(); // event word

    if (kind === 'sends') {
      const payload = peek();
      if (payload.type === TOKEN.IDENTIFIER && payload.value === 'message') {
        advance(); // optional word "message" naming the payload
      } else if (payload.type !== TOKEN.DONE) {
        throw new Error(makeError(
          'Expected the word "message" after "when socket sends".\n\nExample:\n  when socket sends message\n    send socket message\n  done',
          payload
        ));
      }
      const body = parseBody('"when socket sends message" block');
      return { type: 'SocketMessageStatement', body };
    }

    const body = parseBody(`"when socket ${kind}" block`);
    return kind === 'connects'
      ? { type: 'SocketConnectStatement', body }
      : { type: 'SocketDisconnectStatement', body };
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
      'Expected a button name string after "clicks".\n\nExample:\n  when someone clicks "about"\n    reply "About PlainScript"\n  done').value;
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

  // route "<path>" ... done              → GET route (v0.6 form)
  // route get|post|put|patch|delete "<path>" ... done   → v2.1.0 method routes
  function parseSimpleRoute() {
    consume(TOKEN.ROUTE_KW);
    // Optional HTTP method word before the path string. The plain form keeps
    // its v0.6 meaning (GET), so existing programs compile unchanged.
    // "delete" lexes as the SQL keyword token (DELETE_KW), so both spellings
    // of that one method are accepted.
    let method = 'get';
    const methodToken = peek();
    const methodWord = methodToken.type === TOKEN.IDENTIFIER ? methodToken.value
      : methodToken.type === TOKEN.DELETE_KW ? 'delete'
      : null;
    if (
      methodWord &&
      HTTP_METHODS.includes(methodWord) &&
      peekAt(1).type === TOKEN.STRING
    ) {
      method = methodWord;
      advance(); // method word
    }
    const routePath = consume(TOKEN.STRING,
      'Expected a route path after "route".\n\nExample:\n  route "/"\n    reply "Hello"\n  done').value;
    const body = parseBody('route');
    return { type: 'SimpleRouteStatement', method, path: routePath, body };
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

  // database "<file>" [using "<driver>"]
  //
  // v2.1.1 — the optional driver selects the SQLite engine without changing
  // any other PlainScript database semantics:
  //   "native" — better-sqlite3 (requires a working native binding)
  //   "wasm"   — sql.js WebAssembly build (runs anywhere Node runs)
  // The default ("auto") tries native first and falls back to the wasm
  // engine when the native binding is unavailable on this platform.
  function parseDatabase() {
    consume(TOKEN.DATABASE_KW);
    const file = consume(TOKEN.STRING,
      'Expected a database file path after "database".\n\nExample:\n  database "app.db"').value;
    let driver = null;
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'using') {
      advance(); // using
      driver = consume(TOKEN.STRING,
        'Expected a driver name after "using".\n\nDrivers: "native", "wasm"\n\nExample:\n  database "app.db" using "wasm"').value;
      if (!['native', 'wasm'].includes(driver)) {
        throw new Error(makeError(
          `Unknown SQLite driver "${driver}". Available drivers: "native", "wasm".`,
          peek()
        ));
      }
    }
    return { type: 'DatabaseStatement', file, driver };
  }

  // v2.1.0 — postgres "<connection-string>": binds the PostgreSQL pool to
  // "db". SQL statements afterwards compile to async pool queries.
  function parsePostgres() {
    // "postgres" is contextual: only a declaration when followed by a value.
    advance(); // postgres
    const connection = parseExpression();
    return { type: 'PostgresStatement', connection };
  }

  // query/insert/update/delete/execute SQL_BODY DONE
  //
  // v2.1.0 — the raw SQL may reference PlainScript variables with {name}
  // placeholders. They are extracted at parse time and replaced: SQLite gets
  // anonymous "?" markers, PostgreSQL numbered "$1…" markers (the generator
  // decides). Values are always passed as bound parameters — never spliced
  // into the SQL text.
  function parseSqlBlock(keyword, nodeType) {
    advance(); // consume the keyword token (QUERY_KW, INSERT_KW, etc.)
    const sqlToken = peek();
    if (sqlToken.type !== TOKEN.SQL_BODY) {
      throw new Error(makeError(
        `Expected a SQL block after "${keyword}".\n\nExample:\n  ${keyword}\n      SELECT * FROM users\n  done`,
        sqlToken
      ));
    }
    const rawSql = advance().value; // consume SQL_BODY
    consume(TOKEN.DONE, `Expected "done" to close the "${keyword}" block.`);
    return { type: nodeType, ...extractSqlParams(rawSql) };
  }

  // ── v2.1.1 — error handling, retries and backend middleware ───────────────

  // try … [recover [when <err> catches "<ErrorType>"]] … done
  function parseTryStatement() {
    advance(); // try
    const tryBody = [];
    while (!(peek().type === TOKEN.DONE ||
             (peek().type === TOKEN.IDENTIFIER && peek().value === 'recover'))) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the "try" block before end of file.',
          peek()
        ));
      }
      const stmt = parseStatement();
      if (stmt) tryBody.push(stmt);
    }
    const catches = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the "try" block before end of file.',
          peek()
        ));
      }
      advance(); // recover
      let paramName = null;
      let errorType = null;
      if (peek().type === TOKEN.AS) {
        advance(); // as
        paramName = consume(TOKEN.IDENTIFIER,
          'Expected a variable name after "recover as".\n\nExample:\n  recover as error').value;
      } else if (peek().type === TOKEN.WHEN) {
        advance(); // when
        paramName = consume(TOKEN.IDENTIFIER,
          'Expected a variable name after "when" in recover.\n\nExample:\n  recover when err catches "TypeError"').value;
        if (peek().type === TOKEN.CATCHES) {
          advance(); // catches
          errorType = consume(TOKEN.STRING,
            'Expected an error type string after "catches".\n\nExample:\n  recover when err catches "TypeError"').value;
        }
      }
      const recoverBody = [];
      while (peek().type !== TOKEN.DONE &&
             !(peek().type === TOKEN.IDENTIFIER && peek().value === 'recover')) {
        if (peek().type === TOKEN.EOF) {
          throw new Error(makeError(
            'Expected keyword "done" to close the "recover" block before end of file.',
            peek()
          ));
        }
        const stmt = parseStatement();
        if (stmt) recoverBody.push(stmt);
      }
      catches.push({ param: paramName, errorType, body: recoverBody });
    }
    advance(); // done
    return { type: 'TryStatement', body: tryBody, catches };
  }

  // retry <n> times [every <n> seconds] … done
  function parseRetry() {
    advance(); // retry
    const attemptsToken = advance(); // NUMBER
    if (attemptsToken.type !== TOKEN.NUMBER || attemptsToken.value < 1) {
      throw new Error(makeError(
        'The number of retries must be a number of at least 1.\n\nExample:\n  retry 3 times',
        attemptsToken
      ));
    }
    const timesToken = peek();
    if (timesToken.type !== TOKEN.IDENTIFIER || timesToken.value !== 'times') {
      throw new Error(makeError(
        'Expected "times" after the number of retries.\n\nExample:\n  retry 3 times',
        timesToken
      ));
    }
    advance(); // times
    let delaySeconds = 1;
    // ("every" lexes as the EACH keyword.)
    if ((peek().type === TOKEN.IDENTIFIER && peek().value === 'every') ||
        (peek().type === TOKEN.EACH && peek().value === 'every')) {
      advance(); // every
      const count = advance();
      // 0 seconds is allowed: it means "retry immediately".
      if (count.type !== TOKEN.NUMBER || count.value < 0) {
        throw new Error(makeError(
          'Expected a number of seconds (0 or more) after "every".\n\nExample:\n  retry 3 times every 5 seconds',
          count
        ));
      }
      const unit = peek();
      if (unit.type !== TOKEN.IDENTIFIER || !/^seconds?$/.test(unit.value)) {
        throw new Error(makeError(
          'Expected "seconds" or "second" after the delay in "retry".\n\nExample:\n  retry 3 times every 5 seconds',
          unit
        ));
      }
      advance(); // unit
      delaySeconds = count.value;
    }
    const body = parseBody('"retry" block');
    return { type: 'RetryStatement', attempts: attemptsToken.value, delaySeconds, body };
  }

  // accept uploads [limit "<size>"] [allow ["mime", ...]] [folder "<dir>"]
  function parseAcceptUploads() {
    advance(); // accept
    advance(); // uploads
    let limitBytes = null;
    let mimes = null;
    let folder = null;
    while (true) {
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'limit' && limitBytes === null) {
        advance(); // limit
        const sizeToken = consume(TOKEN.STRING,
          'Expected a size limit string after "limit".\n\nExamples:\n  accept uploads limit "5 MB"\n  accept uploads limit "512 KB"');
        limitBytes = parseUploadSize(sizeToken.value);
        if (limitBytes === null) {
          throw new Error(makeError(
            `Invalid upload size ${JSON.stringify(sizeToken.value)}. Use a number with a unit: B, KB, MB or GB.\n\nExample:\n  accept uploads limit "5 MB"`,
            sizeToken
          ));
        }
        continue;
      }
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'allow' && mimes === null) {
        advance(); // allow
        const list = parseArrayLiteral();
        for (const element of list.elements) {
          if (element.type !== 'StringLiteral') {
            throw new Error(makeError(
              'MIME types in "accept uploads allow [...]" must be strings.\n\nExample:\n  accept uploads allow ["image/png", "image/jpeg"]',
              peek()
            ));
          }
        }
        mimes = list.elements.map(element => element.value);
        continue;
      }
      // ("folder" lexes as the FOLDER keyword, so both token shapes count.)
      if ((peek().type === TOKEN.FOLDER ||
           (peek().type === TOKEN.IDENTIFIER && peek().value === 'folder')) && folder === null) {
        advance(); // folder
        folder = consume(TOKEN.STRING,
          'Expected a folder path string after "folder".\n\nExample:\n  accept uploads folder "uploads"').value;
        continue;
      }
      break;
    }
    return { type: 'AcceptUploadsStatement', limitBytes, mimes, folder };
  }

  // require api key from <expr>
  function parseRequireApiKey() {
    const startToken = advance(); // require
    const apiToken = advance();
    if (apiToken.type !== TOKEN.IDENTIFIER || apiToken.value !== 'api') {
      throw new Error(makeError('Expected "api key from <key>" after "require".', apiToken));
    }
    const keyToken = peek();
    if (keyToken.type !== TOKEN.IDENTIFIER || keyToken.value !== 'key') {
      throw new Error(makeError(
        'Expected "key" after "require api".\n\nExample:\n  require api key from env("API_KEY")',
        keyToken
      ));
    }
    advance(); // key
    const fromToken = peek();
    if (fromToken.type !== TOKEN.IDENTIFIER || fromToken.value !== 'from') {
      throw new Error(makeError(
        'Expected "from" before the key value.\n\nExample:\n  require api key from env("API_KEY")',
        fromToken
      ));
    }
    advance(); // from
    const key = parseExpression();
    return { type: 'RequireApiKeyStatement', key };
  }

  // set cookie "<name>" to <expr> [expires in <n> seconds|minutes|hours|days]
  function parseSetCookie() {
    advance(); // set
    advance(); // cookie
    const name = consume(TOKEN.STRING,
      'Expected a cookie name string after "set cookie".\n\nExample:\n  set cookie "theme" to "dark"').value;
    const toToken = peek();
    if (toToken.type !== TOKEN.IDENTIFIER || toToken.value !== 'to') {
      throw new Error(makeError(
        'Expected "to" after the cookie name.\n\nExample:\n  set cookie "theme" to "dark"',
        toToken
      ));
    }
    advance(); // to
    const value = parseExpression();
    let maxAgeSeconds = null;
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'expires') {
      advance(); // expires
      // ("in" lexes as the IN keyword.)
      const inToken = peek();
      if (inToken.type !== TOKEN.IN) {
        throw new Error(makeError(
          'Expected "in" after "expires".\n\nExample:\n  set cookie "theme" to "dark" expires in 7 days',
          inToken
        ));
      }
      advance(); // in
      const count = advance();
      if (count.type !== TOKEN.NUMBER || count.value <= 0) {
        throw new Error(makeError(
          'Expected a positive number after "expires in".\n\nExample:\n  set cookie "theme" to "dark" expires in 7 days',
          count
        ));
      }
      const unit = peek();
      if (unit.type !== TOKEN.IDENTIFIER || !TIME_UNITS[unit.value]) {
        throw new Error(makeError(
          'Expected a time unit after the number in "expires in".\n\nUnits: seconds, minutes, hours, days\n\nExample:\n  set cookie "theme" to "dark" expires in 7 days',
          unit
        ));
      }
      advance(); // unit
      maxAgeSeconds = Math.round(count.value * TIME_UNITS[unit.value] / 1000);
    }
    return { type: 'SetCookieStatement', name, value, maxAgeSeconds };
  }

  // limit requests to <n> per seconds|minutes|hours
  function parseRateLimit() {
    advance(); // limit
    advance(); // requests
    const toToken = peek();
    if (toToken.type !== TOKEN.IDENTIFIER || toToken.value !== 'to') {
      throw new Error(makeError(
        'Expected "to" after "limit requests".\n\nExample:\n  limit requests to 100 per minute',
        toToken
      ));
    }
    advance(); // to
    const maxToken = advance();
    if (maxToken.type !== TOKEN.NUMBER || maxToken.value < 1) {
      throw new Error(makeError(
        'Expected a positive number of requests.\n\nExample:\n  limit requests to 100 per minute',
        maxToken
      ));
    }
    const perToken = peek();
    if (perToken.type !== TOKEN.IDENTIFIER || perToken.value !== 'per') {
      throw new Error(makeError(
        'Expected "per" before the time window.\n\nExample:\n  limit requests to 100 per minute',
        perToken
      ));
    }
    advance(); // per
    const unit = advance();
    if (unit.type !== TOKEN.IDENTIFIER ||
        !['second', 'seconds', 'minute', 'minutes', 'hour', 'hours'].includes(unit.value)) {
      throw new Error(makeError(
        'Expected a time unit after "per".\n\nUnits: second(s), minute(s), hour(s)\n\nExample:\n  limit requests to 100 per minute',
        unit
      ));
    }
    return { type: 'RateLimitStatement', max: maxToken.value, windowMs: TIME_UNITS[unit.value] };
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
      // `otherwise if` is an else-if chain (sharing one `done`) ONLY when `if`
      // sits on the same line as `otherwise`; a newline-separated `if` is a
      // nested if statement with its own `done`.
      const otherwiseLine = peek().line;
      advance();
      if (peek().type === TOKEN.IF && peek().line === otherwiseLine) {
        alternate = [parseElseIfChain()];
      } else {
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
    }

    advance(); // consume DONE
    return { type: 'IfStatement', condition, consequent, alternate };
  }

  // `otherwise if <condition> ... [otherwise if ...] [otherwise ...] done`
  // Parses a single else-if branch; a following `otherwise if` recurses, and a
  // trailing `otherwise` supplies the final else. The trailing `done` belongs to
  // the outermost `if` and is consumed there, not here.
  function parseElseIfChain() {
    advance(); // consume IF
    const condition = parseCondition();

    const consequent = [];
    while (peek().type !== TOKEN.OTHERWISE && peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" before end of file to close the "otherwise if" block.',
          peek()
        ));
      }
      const stmt = parseStatement();
      if (stmt) consequent.push(stmt);
    }

    let alternate = null;
    if (peek().type === TOKEN.OTHERWISE) {
      const otherwiseLine = peek().line;
      advance();
      if (peek().type === TOKEN.IF && peek().line === otherwiseLine) {
        alternate = [parseElseIfChain()];
      } else {
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
    }

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

  // v2.1.1 — full arithmetic precedence:
  //   additive     := term (("+" | "-") term)*
  //   multiplicative ("term") := unary (("*" | "/" | "%") unary)*
  //   unary        := "-" unary | "wait for" unary | primary
  //   primary      := atom with postfix chains (indexing, members, of, length)
  function parseExpression() {
    let left = parseTerm();
    while (peek().type === TOKEN.PLUS || peek().type === TOKEN.MINUS) {
      const operator = advance().value;
      const right = parseTerm();
      left = { type: 'BinaryExpression', operator, left, right };
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (
      peek().type === TOKEN.STAR ||
      peek().type === TOKEN.SLASH ||
      peek().type === TOKEN.PERCENT
    ) {
      const operator = advance().value;
      const right = parseUnary();
      left = { type: 'BinaryExpression', operator, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (peek().type === TOKEN.MINUS) {
      advance();
      return { type: 'UnaryExpression', operator: '-', operand: parseUnary() };
    }
    // v2.1.1 — await semantics: "wait for <value>" awaits an async operation.
    // The operand binds tightly (a full postfix chain), so
    // "wait for loadUser(id) + 1" means "(await loadUser(id)) + 1".
    // ("for" lexes as the FOR keyword, not an identifier.)
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'wait' &&
        peekAt(1).type === TOKEN.FOR) {
      advance(); // wait
      advance(); // for
      return { type: 'AwaitExpression', value: parseUnary() };
    }
    return parsePrimary();
  }

  // primary → itemExpr | atom (postfix)*
  function parsePrimary() {
    // v1.0.0-latest — record constructor: `create a Person with name "Ada" and age 17`.
    // `create` then an article ("a"/"an") then a kind name then "with" pairs.
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'create') {
      const a1 = peekAt(1);
      const a2 = peekAt(2);
      const a3 = peekAt(3);
      if (a1.type === TOKEN.IDENTIFIER &&
          (a1.value === 'a' || a1.value === 'an') &&
          a2.type === TOKEN.IDENTIFIER &&
          (a3.value === 'with')) {
        return parseCreateKind();
      }
    }

    // v1.0.0-latest — concurrency combinators: `all of [a(), b()]`, `any of [...]`,
    // `settled of [...]`. Guard on the identifier + "of" lookahead so plain
    // property reads like `all of the_list` still work as well as prose.
    if (peek().type === TOKEN.IDENTIFIER &&
        (peek().value === 'all' || peek().value === 'any' || peek().value === 'settled') &&
        peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'of') {
      const comboKw = advance().value; // all | any | settled
      advance(); // of
      const items = parseExpression();
      return { type: 'ConcurrencyExpression', combo: comboKw, items };
    }

    // v1.0.0-latest — `spread of <collection>` unfolds an iterable into a new array.
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'spread' &&
        peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'of') {
      advance(); // spread
      advance(); // of
      const collection = parsePrimary();
      return { type: 'SpreadExpression', collection };
    }

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
        // After ".", any word is a valid JS property/method name — including
        // words that are PlainScript keywords in other contexts (e.g. crypto
        // .update(...), obj .delete()). So accept any word token, not just an
        // identifier.
        const propToken = peek();
        if (propToken.type === TOKEN.EOF || !/^[A-Za-z_$]/.test(propToken.value)) {
          throw new Error(makeError('Expected a property name after ".".', propToken));
        }
        advance();
        const property = propToken.value;
        node = { type: 'MemberExpression', object: node, property };
        // Method call: object.method(args). Only member access may introduce
        // a call here; plain `name(args)` is handled in parseAtom.
        if (peek().type === TOKEN.LPAREN) {
          advance(); // (
          const { separator, args } = parseArgList();
          consume(TOKEN.RPAREN, 'Expected ")" to close the method call.');
          if (separator) {
            throw new Error(makeError(
              'Method calls cannot use "to"/"from" arguments.\n\nExample:\n  mrz.parse(line)',
              peek()
            ));
          }
          node = { type: 'CallExpression', callee: node, args };
        }
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

  // atom → STRING | NUMBER | true | false | null | '(' expr ')' |
  //        '[' ... ']' | '{' ... '}' | httpCall | IDENTIFIER '(' args ')' | IDENTIFIER
  function parseAtom() {
    const token = peek();

    if (token.type === TOKEN.STRING)   { advance(); return { type: 'StringLiteral',  value: token.value }; }
    if (token.type === TOKEN.TEMPLATE_STRING) { advance(); return { type: 'TemplateLiteral',  value: token.value }; }
    if (token.type === TOKEN.NUMBER)   { advance(); return { type: 'NumberLiteral',  value: token.value }; }
    // v2.1.1 — boolean and null literals
    if (token.type === TOKEN.TRUE_KW)  { advance(); return { type: 'BooleanLiteral', value: true }; }
    if (token.type === TOKEN.FALSE_KW) { advance(); return { type: 'BooleanLiteral', value: false }; }
    if (token.type === TOKEN.NULL_KW)  { advance(); return { type: 'NullLiteral' }; }
    // v2.1.1 — parenthesised grouping: (a + b) * c
    if (token.type === TOKEN.LPAREN) {
      advance();
      const inner = parseExpression();
      consume(TOKEN.RPAREN, 'Expected ")" to close the grouped expression.');
      return inner;
    }
    if (token.type === TOKEN.LBRACKET) { return parseArrayLiteral(); }
    if (token.type === TOKEN.LBRACE)   { return parseInlineObjectLiteral(); }

    // v2.1.1 — HTTP client prefix form:
    //   get "<url>"            post urlExpr with <body>
    //   put/patch/delete …     optional "headers { … }" and "timeout <ms>" clauses
    // The call form get(...) stays an ordinary user/builtin call.
    const httpMethod = httpMethodWord(token);
    if (httpMethod && peekAt(1).type !== TOKEN.LPAREN && tokenStartsValue(peekAt(1))) {
      return parseHttpCall(httpMethod);
    }

    if (token.type === TOKEN.IDENTIFIER) {
      if (peekAt(1).type === TOKEN.LPAREN) return parseCallExpression();
      advance();
      return { type: 'Identifier', name: token.value };
    }

    // v2.1.0 — query("field") as a value: the HTTP query-string accessor.
    // The SQLite block form only applies when "query" stands alone.
    if (token.type === TOKEN.QUERY_KW && peekAt(1).type === TOKEN.LPAREN) {
      return parseCallExpression();
    }

    throw new Error(makeError(
      `Expected a value (a word, number, string, or array) but got "${token.value || token.type}".`,
      token
    ));
  }

  // v2.1.1 — "get", "post", "put", "patch" lex as identifiers; "delete" lexes
  // as the SQL keyword token. All five introduce an HTTP request when followed
  // by a URL value instead of "(".
  function httpMethodWord(token) {
    if (token.type === TOKEN.IDENTIFIER &&
        ['get', 'post', 'put', 'patch'].includes(token.value)) return token.value;
    if (token.type === TOKEN.DELETE_KW) return 'delete';
    return null;
  }

  // True when a token can begin a value expression.
  function tokenStartsValue(token) {
    return [
      TOKEN.STRING, TOKEN.TEMPLATE_STRING, TOKEN.NUMBER,
      TOKEN.IDENTIFIER, TOKEN.LBRACKET, TOKEN.LBRACE,
      TOKEN.TRUE_KW, TOKEN.FALSE_KW, TOKEN.NULL_KW,
    ].includes(token.type);
  }

  // v2.1.1 — parse one HTTP request expression after its method word.
  //
  //   get <url> [headers <object>] [timeout <ms>]
  //   post|put|patch|delete <url> [with <body>] [headers <object>] [timeout <ms>]
  //
  // The response is a record: ok, status, headers, data (JSON-parsed when the
  // server sends JSON, otherwise the response text).
  function parseHttpCall(method) {
    advance(); // consume the method word (get/post/put/patch/delete)
    const urlToken = peek();
    if (!tokenStartsValue(urlToken)) {
      throw new Error(makeError(
        `Expected a URL after "${method}".\n\nExample:\n  ${method} "https://api.example.com/items"`,
        urlToken
      ));
    }
    const url = parsePrimary();
    let body = null;
    let headers = null;
    let timeout = null;
    while (true) {
      if (peek().type === TOKEN.WITH && body === null) {
        advance();
        body = parseExpression();
        continue;
      }
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'headers' && headers === null) {
        advance();
        headers = parseExpression();
        continue;
      }
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'timeout' && timeout === null) {
        advance();
        timeout = parseExpression();
        continue;
      }
      break;
    }
    return { type: 'HttpCall', method, url, body, headers, timeout };
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

  // v2.1.0 — "key is value" pairs until "done", shared by the mail
  // statements. Returns [{ key, value }] and consumes the closing DONE.
  function parsePropertyList(contextName) {
    const properties = [];
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          `Expected keyword "done" to close the ${contextName} before end of file.`,
          peek()
        ));
      }
      const key = consume(TOKEN.IDENTIFIER, 'Expected a property name.').value;
      consume(TOKEN.IS, `Expected "is" after property name "${key}".\n\nExample:\n  ${key} is "value"`);
      const value = parseExpression();
      properties.push({ key, value });
    }
    advance(); // consume DONE
    return properties;
  }

  // v2.1.0 — every <n> <unit>s … done: repeat work on an interval.
  // The unit is resolved to milliseconds at parse time; the generator emits
  // a plain setInterval with count * unit.
  function parseEvery() {
    advance(); // every (TOKEN.EACH)
    const count = advance().value; // NUMBER
    const unitToken = peek();
    if (count <= 0) {
      throw new Error(makeError('The count in "every" must be at least 1.\n\nExample:\n  every 5 minutes\n    show "tick"\n  done', unitToken));
    }
    if (unitToken.type !== TOKEN.IDENTIFIER || !TIME_UNITS[unitToken.value]) {
      throw new Error(makeError(
        'Expected a time unit after the number in "every".\n\nUnits: seconds, minutes, hours, days\n\nExample:\n  every 5 minutes',
        unitToken
      ));
    }
    const unit = TIME_UNITS[advance().value];
    const body = parseBody('"every" block');
    return { type: 'EveryStatement', count, unit, body };
  }

  // v2.1.0 — websocket server on <port> … done
  //
  //   websocket server on 8081
  //       when socket connects … done
  //       when socket sends message … done
  //       when socket disconnects … done
  //   done
  //
  // Handlers are optional and may appear in any order.
  function parseWebSocketServer() {
    advance(); // websocket
    advance(); // server
    const onToken = peek();
    const isOn = (onToken.type === TOKEN.IDENTIFIER && onToken.value === 'on') || onToken.type === TOKEN.ON;
    if (!isOn) {
      throw new Error(makeError(
        'Expected "on <port>" after "websocket server".\n\nExample:\n  websocket server on 8081',
        onToken
      ));
    }
    advance(); // on
    const port = parseExpression();

    let connectBody = null;
    let messageBody = null;
    let disconnectBody = null;

    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the websocket block before end of file.',
          peek()
        ));
      }
      const stmt = parseStatement();
      if (!stmt) continue;
      if (stmt.type === 'SocketConnectStatement')    connectBody = stmt.body;
      else if (stmt.type === 'SocketMessageStatement') messageBody = stmt.body;
      else if (stmt.type === 'SocketDisconnectStatement') disconnectBody = stmt.body;
      else {
        throw new Error(makeError(
          'A websocket block may only contain "when socket connects", "when socket sends message", and "when socket disconnects" handlers.',
          peek()
        ));
      }
    }
    advance(); // consume DONE

    return { type: 'WebSocketServerStatement', port, connectBody, messageBody, disconnectBody };
  }

  // v2.1.1 — whatsapp bot … done
  //
  //   whatsapp bot
  //       auth "session"                       (optional; session folder name)
  //       login qr                             — or —
  //       login pairing "2348012345678"        (literal) — or —
  //       login pairing phone                  (any value, e.g. from ask)
  //
  //       on message
  //           log message
  //           if message.text is "/start"
  //               reply "Welcome!"
  //           done
  //       done
  //   done
  //
  // The Baileys runtime, its socket, events and auth APIs stay hidden: this
  // block is the whole surface. Defaults: auth folder "plainscript-whatsapp-auth",
  // QR login when no `login` line is present.
  function parseWhatsAppBot() {
    advance(); // whatsapp
    advance(); // bot

    let authFolder = null;
    let login = null;
    const handlers = [];

    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the "whatsapp bot" block before end of file.',
          peek()
        ));
      }

      // auth "<folder>" — where WhatsApp session credentials persist.
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'auth' &&
          peekAt(1).type === TOKEN.STRING) {
        advance(); // auth
        authFolder = advance().value; // folder name
        continue;
      }

      // login qr  |  login pairing "<phone>"
      if (peek().type === TOKEN.IDENTIFIER && peek().value === 'login') {
        advance(); // login
        const modeToken = peek();
        if (modeToken.type === TOKEN.IDENTIFIER && modeToken.value === 'qr') {
          advance();
          login = { mode: 'qr' };
          continue;
        }
        if (modeToken.type === TOKEN.IDENTIFIER && modeToken.value === 'pairing') {
          advance(); // pairing
          // v2.1.2 — the phone may be a string literal (validated here at
          // compile time) or any PlainScript value, typically a variable filled by
          // `ask`:
          //
          //   ask "WhatsApp number: " as phone
          //   whatsapp bot
          //       auth "session"
          //       login pairing phone
          //   done
          //
          // Expression phones are validated at runtime before connecting.
          if (peek().type === TOKEN.STRING) {
            const phoneToken = advance();
            login = { mode: 'pairing', phone: validatePairingPhone(phoneToken.value, phoneToken) };
          } else {
            login = { mode: 'pairing', phoneExpr: parseExpression() };
          }
          continue;
        }
        throw new Error(makeError(
          'Expected "qr" or "pairing \\"<number>\\"" after "login".\n\nExamples:\n  login qr\n  login pairing "2348012345678"',
          modeToken
        ));
      }

      // on message … done — the message handler.
      if (peek().type === TOKEN.ON && peekAt(1).type === TOKEN.IDENTIFIER && peekAt(1).value === 'message') {
        advance(); // on
        advance(); // message
        const body = parseBody('"on message" block');
        handlers.push({ type: 'WhatsAppOnMessageStatement', body });
        continue;
      }

      throw new Error(makeError(
        'A "whatsapp bot" block may only contain an "auth", a "login", and "on message" statements.\n\nExample:\n  whatsapp bot\n      auth "session"\n      login qr\n\n      on message\n          log message\n      done\n  done',
        peek()
      ));
    }
    advance(); // consume DONE

    return {
      type: 'WhatsAppBotStatement',
      authFolder: authFolder || 'plainscript-whatsapp-auth',
      login: login || { mode: 'qr' },
      handlers,
    };
  }

  // Baileys requires the pairing phone number in international format:
  // digits only (country code included), no leading "+", at most 15 digits
  // (E.164). Common separators are accepted in source and stripped here so
  // both "2348012345678" and "+234 801-234-5678" compile to the same value.
  function validatePairingPhone(raw, token) {
    const cleaned = String(raw).replace(/[\s()+\-\.]/g, '');
    if (!/^[0-9]+$/.test(cleaned)) {
      throw new Error(makeError(
        `"${raw}" is not a valid phone number for "login pairing".\n\nUse the full international number, digits only — country code first, no "+" and no spaces:\n\nExample:\n  login pairing "2348012345678"`,
        token
      ));
    }
    if (cleaned.length < 8 || cleaned.length > 15) {
      throw new Error(makeError(
        `"${raw}" is not a valid phone number for "login pairing".\n\nThe international number must be 8 to 15 digits long (country code included):\n\nExample:\n  login pairing "2348012345678"`,
        token
      ));
    }
    return cleaned;
  }

  // ── IOPL-native features ──────────────────────────────────────────────────

  // gather each item in list giving expr
  function parseGatherStatement() {
    advance(); // gather
    consume(TOKEN.EACH,
      'Expected "each" after "gather".\n\nExample:\n  gather each item in names giving item + "!"');
    const item = consume(TOKEN.IDENTIFIER,
      'Expected an item name after "each".').value;
    consume(TOKEN.IN,
      `Expected "in" after "${item}".\n\nExample:\n  gather each item in names giving item + "!"`);
    const collection = parseExpression();
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'giving') {
      advance(); // giving
    } else {
      throw new Error(makeError(
        'Expected "giving" after the collection expression.\n\nExample:\n  gather each item in names giving item + "!"',
        peek()
      ));
    }
    const body = parseExpression();
    return { type: 'GatherStatement', item, collection, body };
  }

  // filter each item in list when condition
  function parseFilterStatement() {
    advance(); // filter
    consume(TOKEN.EACH,
      'Expected "each" after "filter".\n\nExample:\n  filter each item in numbers when item is above 5');
    const item = consume(TOKEN.IDENTIFIER,
      'Expected an item name after "each".').value;
    consume(TOKEN.IN,
      `Expected "in" after "${item}".\n\nExample:\n  filter each item in numbers when item is above 5`);
    const collection = parseExpression();
    if (peek().type === TOKEN.WHEN ||
        (peek().type === TOKEN.IDENTIFIER && peek().value === 'when')) {
      advance(); // when
    } else {
      throw new Error(makeError(
        'Expected "when" after the collection expression.\n\nExample:\n  filter each item in numbers when item is above 5',
        peek()
      ));
    }
    const condition = parseAndCondition();
    return { type: 'FilterStatement', item, collection, condition };
  }

  // total each item in list giving expr
  function parseTotalStatement() {
    advance(); // total
    consume(TOKEN.EACH,
      'Expected "each" after "total".\n\nExample:\n  total each item in numbers giving running + item');
    const item = consume(TOKEN.IDENTIFIER,
      'Expected an item name after "each".').value;
    consume(TOKEN.IN,
      `Expected "in" after "${item}".\n\nExample:\n  total each item in numbers giving running + item`);
    const collection = parseExpression();
    if (peek().type === TOKEN.IDENTIFIER && peek().value === 'giving') {
      advance(); // giving
    } else {
      throw new Error(makeError(
        'Expected "giving" after the collection expression.\n\nExample:\n  total each item in numbers giving running + item',
        peek()
      ));
    }
    const body = parseExpression();
    return { type: 'TotalStatement', item, collection, body };
  }

  // match <expr> against ... done
  //   "case1" → show "one"
  //   "case2" → show "two"
  //   otherwise → show "other"
  // match pattern "regex" in text as name
  function parseMatchStatement() {
    advance(); // match

    // Regex match form: match pattern "regex" in text as name
    if (peek().type === TOKEN.PATTERN_KW) {
      advance(); // pattern
      const pattern = consume(TOKEN.STRING,
        'Expected a regex pattern string after "pattern".\n\nExample:\n  match pattern "^(\\d+)$" in text as result').value;
      const inToken = peek();
      if (inToken.type !== TOKEN.IN) {
        throw new Error(makeError(
          'Expected "in" after the pattern string.\n\nExample:\n  match pattern "^(\\d+)$" in text as result',
          inToken
        ));
      }
      advance(); // in
      const source = parseExpression();
      const asToken = peek();
      if (asToken.type !== TOKEN.AS) {
        throw new Error(makeError(
          'Expected "as" after the source expression.\n\nExample:\n  match pattern "^(\\d+)$" in text as result',
          asToken
        ));
      }
      advance(); // as
      const name = consume(TOKEN.IDENTIFIER,
        'Expected a variable name after "as".\n\nExample:\n  match pattern "^(\\d+)$" in text as result').value;
      return { type: 'RegexMatchStatement', pattern, source, name };
    }

    // Pattern matching form: match expr against ... done
    const value = parseExpression();
    consume(TOKEN.AGAINST,
      'Expected "after" the expression.\n\nExample:\n  match color against\n    "red" → show "stop"\n  done');
    const cases = [];
    let defaultCase = null;
    while (peek().type !== TOKEN.DONE) {
      if (peek().type === TOKEN.EOF) {
        throw new Error(makeError(
          'Expected keyword "done" to close the "match" block before end of file.',
          peek()
        ));
      }
      // otherwise → body
      if (peek().type === TOKEN.OTHERWISE) {
        advance(); // otherwise
        consume(TOKEN.ARROW,
          'Expected "->" after "otherwise".\n\nExample:\n  otherwise → show "other"');
        defaultCase = [];
        while (peek().type !== TOKEN.DONE) {
          if (peek().type === TOKEN.EOF) {
            throw new Error(makeError(
              'Expected keyword "done" to close the "match" block before end of file.',
              peek()
            ));
          }
          const stmt = parseStatement();
          if (stmt) defaultCase.push(stmt);
        }
        break;
      }
      const test = parseExpression();
      consume(TOKEN.ARROW,
        'Expected "->" after the case expression.\n\nExample:\n  "red" → show "stop"');
      const caseBody = [];
      while (peek().type !== TOKEN.DONE && peek().type !== TOKEN.OTHERWISE &&
             !(peek().type === TOKEN.STRING || peek().type === TOKEN.NUMBER ||
               peek().type === TOKEN.TRUE_KW || peek().type === TOKEN.FALSE_KW ||
               peek().type === TOKEN.NULL_KW)) {
        if (peek().type === TOKEN.EOF) {
          throw new Error(makeError(
            'Expected keyword "done" to close the "match" block before end of file.',
            peek()
          ));
        }
        const stmt = parseStatement();
        if (stmt) caseBody.push(stmt);
      }
      cases.push({ test, body: caseBody });
    }
    advance(); // done
    return { type: 'MatchStatement', value, cases, defaultCase };
  }

  // emit "event.name" with data
  function parseEmitStatement() {
    advance(); // emit
    const eventToken = peek();
    const event = consume(TOKEN.STRING,
      'Expected an event name string after "emit".\n\nExample:\n  emit "data.received" with payload').value;
    const withToken = peek();
    if (withToken.type !== TOKEN.WITH) {
      throw new Error(makeError(
        'Expected "with" after the event name.\n\nExample:\n  emit "data.received" with payload',
        withToken
      ));
    }
    advance(); // with
    const data = parseExpression();
    return { type: 'EmitStatement', event, data };
  }

  // stream "file.txt" as line ... done
  function parseStreamStatement() {
    advance(); // stream
    const filename = parseExpression();
    const asToken = peek();
    if (asToken.type !== TOKEN.AS) {
      throw new Error(makeError(
        'Expected "as" after the filename.\n\nExample:\n  stream "data.txt" as line\n    show line\n  done',
        asToken
      ));
    }
    advance(); // as
    const paramName = consume(TOKEN.IDENTIFIER,
      'Expected a variable name after "as".\n\nExample:\n  stream "data.txt" as line').value;
    const body = parseBody('"stream" block');
    return { type: 'StreamStatement', filename, paramName, body };
  }

  // run in parallel ... done as results
  function parseRunParallelStatement() {
    advance(); // run (already checked by caller)
    advance(); // in
    advance(); // parallel
    const body = parseBody('"run in parallel" block');
    let resultName = null;
    if (peek().type === TOKEN.AS) {
      advance(); // as
      resultName = consume(TOKEN.IDENTIFIER,
        'Expected a variable name after "as".\n\nExample:\n  run in parallel\n    remember a as wait for slowJob()\n  done as results').value;
    }
    return { type: 'RunParallelStatement', body, resultName };
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
      `"${name}" is not a valid PlainScript collection expression.\n\nPlain supports:\n  add(item to collection)\n  remove(item from collection)\n  write(data to "file")`,
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
