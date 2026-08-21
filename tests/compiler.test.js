// Tests for the Plain compiler

const fs   = require('fs');
const path = require('path');
const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');
const { bundle, resolveDependencies } = require('../compiler/bundler');
const { detectDependencies, splitPackageSpec } = require('../compiler/dependency-detector');
const { format } = require('../compiler/formatter');

// Helper: bundle a fixture file and return the generated JS
function bundleFixture(name) {
  return bundle(path.join(__dirname, 'fixtures', name));
}

// Helper: expect a bundle to throw with a message matching substr
function bundleThrows(label, fixtureName, substr) {
  test(label, () => {
    try {
      bundleFixture(fixtureName);
      throw new Error('expected an error but none was thrown');
    } catch (e) {
      if (!e.message.toLowerCase().includes(substr.toLowerCase())) {
        throw new Error(`Expected error to include "${substr}" but got: ${e.message}`);
      }
    }
  });
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

function assert(actual, expected) {
  const a = actual.trim();
  const e = expected.trim();
  if (a !== e) {
    throw new Error(`Expected:\n        ${e}\n        Got:\n        ${a}`);
  }
}

function compile(source) {
  return generate(parse(tokenize(source)));
}

// ── Runtime dependency detection ────────────────────────────────────────────

console.log('\nRuntime dependency detection');

test('detects express as an npm dependency', () => {
  assert(JSON.stringify(detectDependencies('use express')), '["express"]');
});

test('maps sqlite to better-sqlite3', () => {
  assert(JSON.stringify(detectDependencies('use sqlite')), '["better-sqlite3"]');
});

test('ignores Node built-in modules', () => {
  assert(JSON.stringify(detectDependencies('use fs\nuse path')), '[]');
});

test('removes duplicate runtime dependencies', () => {
  assert(
    JSON.stringify(detectDependencies('use express\nuse sqlite\nuse express\nuse sqlite')),
    '["express","better-sqlite3"]'
  );
});

test('returns an empty list for a project without use statements', () => {
  assert(JSON.stringify(detectDependencies('show "Hello"')), '[]');
});

test('detects better-sqlite3 from database shorthand', () => {
  assert(JSON.stringify(detectDependencies('database "app.db"')), '["better-sqlite3"]');
});

test('detects Express from web app shorthand', () => {
  assert(JSON.stringify(detectDependencies('web app')), '["express"]');
});

test('deduplicates shorthand and explicit runtime dependencies', () => {
  assert(JSON.stringify(detectDependencies('web app\nuse express\ndatabase "app.db"\nuse sqlite')),
    '["express","better-sqlite3"]');
});

// ── Lexer ────────────────────────────────────────────────────────────────────

console.log('\nLexer');

test('tokenizes remember keyword', () => {
  const tokens = tokenize('remember');
  if (tokens[0].type !== TOKEN.REMEMBER) throw new Error('wrong type');
});

test('tokenizes show keyword', () => {
  const tokens = tokenize('show');
  if (tokens[0].type !== TOKEN.SHOW) throw new Error('wrong type');
});

test('tokenizes string literal', () => {
  const tokens = tokenize('"Hello"');
  if (tokens[0].type !== TOKEN.STRING) throw new Error('wrong type');
  if (tokens[0].value !== 'Hello') throw new Error('wrong value');
});

test('tokenizes number literal', () => {
  const tokens = tokenize('42');
  if (tokens[0].type !== TOKEN.NUMBER) throw new Error('wrong type');
  if (tokens[0].value !== 42) throw new Error('wrong value');
});

test('tokenizes if / otherwise / done keywords', () => {
  const tokens = tokenize('if otherwise done');
  if (tokens[0].type !== TOKEN.IF)        throw new Error('if wrong');
  if (tokens[1].type !== TOKEN.OTHERWISE) throw new Error('otherwise wrong');
  if (tokens[2].type !== TOKEN.DONE)      throw new Error('done wrong');
});

test('tokenizes is / greater / than / less keywords', () => {
  const tokens = tokenize('is greater than less');
  if (tokens[0].type !== TOKEN.IS)      throw new Error('is wrong');
  if (tokens[1].type !== TOKEN.GREATER) throw new Error('greater wrong');
  if (tokens[2].type !== TOKEN.THAN)    throw new Error('than wrong');
  if (tokens[3].type !== TOKEN.LESS)    throw new Error('less wrong');
});

test('throws on unterminated string', () => {
  try {
    tokenize('"oops');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes('Unterminated')) throw e;
  }
});

test('skips single-line comments', () => {
  const tokens = tokenize('// comment\nshow "Hi"');
  if (tokens[0].type !== TOKEN.SHOW) throw new Error('wrong token after comment');
});

// ── Day 1: remember + show ───────────────────────────────────────────────────

console.log('\nDay 1 — remember + show');

test('remember string compiles to let', () => {
  assert(compile('remember name as "Ayokunle"'), 'let name = "Ayokunle";');
});

test('show identifier compiles to console.log', () => {
  assert(compile('show name'), 'console.log(name);');
});

test('show string literal', () => {
  assert(compile('show "Hello"'), 'console.log("Hello");');
});

test('show("text") call form compiles identically', () => {
  assert(compile('show("Hello")'), 'console.log("Hello");');
});

test('show("expr") call form with expression', () => {
  assert(
    compile('remember name as "World"\nshow("Hello " + name)'),
    'let name = "World";\nconsole.log("Hello " + name);'
  );
});

test('show(call) call form with function argument', () => {
  assert(compile('show(add(5, 7))'), 'console.log(add(5, 7));');
});

test('remember then show (day1 example)', () => {
  assert(
    compile('remember name as "Ayokunle"\nshow name'),
    'let name = "Ayokunle";\nconsole.log(name);'
  );
});

// ── Day 2: if / otherwise / done ─────────────────────────────────────────────

console.log('\nDay 2 — if / otherwise / done');

test('"is" compiles to ===', () => {
  const src = 'remember x as "a"\nif x is "a"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('===')) throw new Error('expected ===');
});

test('"is greater than" compiles to >', () => {
  const src = 'remember age as 16\nif age is greater than 12\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('>')) throw new Error('expected >');
});

test('"is less than" compiles to <', () => {
  const src = 'remember age as 5\nif age is less than 12\n  show "young"\ndone';
  const js = compile(src);
  if (!js.includes('<')) throw new Error('expected <');
});

test('if/otherwise/done compiles to if/else block', () => {
  const src = [
    'remember age as 16',
    'if age is greater than 12',
    '  show "Teenager"',
    'otherwise',
    '  show "Child"',
    'done',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('if (age > 12)'))   throw new Error('missing if condition');
  if (!js.includes('"Teenager"'))       throw new Error('missing consequent');
  if (!js.includes('} else {'))         throw new Error('missing else');
  if (!js.includes('"Child"'))          throw new Error('missing alternate');
});

test('if without otherwise compiles to if without else', () => {
  const src = 'remember x as 5\nif x is less than 10\n  show "small"\ndone';
  const js = compile(src);
  if (!js.includes('if (x < 10)')) throw new Error('missing if');
  if (js.includes('else'))         throw new Error('unexpected else');
});

test('throws on missing done', () => {
  try {
    compile('remember x as 1\nif x is 1\n  show "oops"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── Day 3: make / give / function calls ──────────────────────────────────────

console.log('\nDay 3 — make / give / function calls');

test('tokenizes make and give keywords', () => {
  const tokens = tokenize('make give');
  if (tokens[0].type !== TOKEN.MAKE) throw new Error('make wrong');
  if (tokens[1].type !== TOKEN.GIVE) throw new Error('give wrong');
});

test('tokenizes parentheses and comma', () => {
  const tokens = tokenize('( , )');
  if (tokens[0].type !== TOKEN.LPAREN) throw new Error('( wrong');
  if (tokens[1].type !== TOKEN.COMMA)  throw new Error(', wrong');
  if (tokens[2].type !== TOKEN.RPAREN) throw new Error(') wrong');
});

test('tokenizes plus', () => {
  const tokens = tokenize('+');
  if (tokens[0].type !== TOKEN.PLUS) throw new Error('+ wrong');
});

test('no-param function compiles to JS function', () => {
  const src = 'make greet()\n    show "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('function greet()')) throw new Error('missing function declaration');
  if (!js.includes('console.log("Hello")')) throw new Error('missing body');
});

test('function with params compiles correctly', () => {
  const src = 'make add(a, b)\n    give a + b\ndone';
  const js = compile(src);
  if (!js.includes('function add(a, b)')) throw new Error('missing params');
  if (!js.includes('return a + b'))       throw new Error('missing return');
});

test('give compiles to return', () => {
  const src = 'make double(x)\n    give x + x\ndone';
  const js = compile(src);
  if (!js.includes('return x + x')) throw new Error('missing return');
});

test('bare function call compiles to call statement', () => {
  const src = 'make greet()\n    show "Hello"\ndone\ngreet()';
  const js = compile(src);
  if (!js.includes('greet();')) throw new Error('missing call statement');
});

test('function call as argument to show', () => {
  const src = 'make add(a, b)\n    give a + b\ndone\nshow add(5, 7)';
  const js = compile(src);
  if (!js.includes('console.log(add(5, 7))')) throw new Error('missing show call');
});

test('day3 example: greet and add end-to-end', () => {
  const src = [
    'make greet()',
    '    show "Hello"',
    'done',
    'greet()',
    'make add(a, b)',
    '    give a + b',
    'done',
    'show add(5, 7)',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('function greet()'))   throw new Error('missing greet');
  if (!js.includes('greet();'))           throw new Error('missing greet call');
  if (!js.includes('function add(a, b)')) throw new Error('missing add');
  if (!js.includes('return a + b'))       throw new Error('missing return');
  if (!js.includes('console.log(add(5, 7))')) throw new Error('missing show add');
});

test('throws on missing done in function', () => {
  try {
    compile('make greet()\n    show "Hello"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── Error messages (Phase 2) ──────────────────────────────────────────────────

console.log('\nPhase 2 — Error messages');

function throws(name, src, expectedFragment) {
  test(name, () => {
    try {
      compile(src);
      throw new Error('should have thrown');
    } catch (e) {
      if (!e.message.toLowerCase().includes(expectedFragment.toLowerCase())) {
        throw new Error(
          `Expected message to include "${expectedFragment}", got:\n        ${e.message}`
        );
      }
    }
  });
}

// Missing "done"
throws(
  'missing done in if block mentions "done"',
  'remember x as 1\nif x is 1\n  show "oops"',
  'done'
);

throws(
  'missing done in otherwise block mentions "done"',
  'remember x as 1\nif x is 1\n  show "a"\notherwise\n  show "b"',
  'done'
);

throws(
  'missing done in function mentions "done"',
  'make greet()\n  show "Hello"',
  'done'
);

// Unexpected "otherwise"
throws(
  'unexpected "otherwise" at top level gives helpful message',
  'otherwise',
  'otherwise'
);

// Unknown / misspelled keyword with "did you mean"
throws(
  'misspelled "remembr" suggests "remember"',
  'remembr name as "Ayokunle"',
  'did you mean'
);

throws(
  'misspelled "shwo" suggests "show"',
  'shwo "Hello"',
  'did you mean'
);

// Missing identifier after "remember"
throws(
  'missing variable name after "remember"',
  'remember as 16',
  'variable name'
);

// Missing value after "as"
throws(
  'missing value after "as"',
  'remember age as',
  'value'
);

// Unterminated string
throws(
  'unterminated string',
  'show "hello',
  'unterminated'
);

// Invalid comparison
throws(
  'invalid comparison keyword gives helpful message',
  'remember x as 1\nif x bigger 1\n  show "a"\ndone',
  'comparison'
);

// Unexpected end of file (bare expression)
throws(
  'unexpected end of file in expression',
  'remember x as',
  'value'
);

// Invalid function declaration — missing name
throws(
  'missing function name after "make"',
  'make ()\n  show "hi"\ndone',
  'function name'
);

// Invalid function call — missing closing paren
throws(
  'missing closing paren in function call',
  'make greet()\n  show "hi"\ndone\ngreet(',
  '")"'
);

// Invalid return (give) — missing value
throws(
  'give with no value',
  'make f()\n  give\ndone',
  'value'
);

// ── v0.2 — Arrays ────────────────────────────────────────────────────────────

console.log('\nv0.2 — Arrays');

test('tokenizes [ and ]', () => {
  const tokens = tokenize('[ ]');
  if (tokens[0].type !== TOKEN.LBRACKET) throw new Error('[ wrong');
  if (tokens[1].type !== TOKEN.RBRACKET) throw new Error('] wrong');
});

test('array literal compiles to JS array', () => {
  const src = 'remember players as ["Haaland", "Foden", "Rodri"]';
  const js = compile(src);
  if (!js.includes('["Haaland", "Foden", "Rodri"]')) throw new Error('missing array literal');
});

test('array index compiles to bracket access', () => {
  const src = 'remember players as ["Haaland", "Foden"]\nshow players[0]';
  const js = compile(src);
  if (!js.includes('players[0]')) throw new Error('missing index access');
});

test('array index assignment (becomes) compiles correctly', () => {
  const src = 'remember players as ["Haaland", "Foden"]\nplayers[1] becomes "Palmer"';
  const js = compile(src);
  if (!js.includes('players[1] = "Palmer"')) throw new Error('missing index assignment');
});

test('length() compiles to .length', () => {
  const src = 'remember a as [1, 2, 3]\nshow length(a)';
  const js = compile(src);
  if (!js.includes('(a).length')) throw new Error('missing .length');
});

test('throws on unclosed array bracket', () => {
  try {
    compile('remember a as [1, 2');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes(']')) throw e;
  }
});

// ── v0.2 — Objects ───────────────────────────────────────────────────────────

console.log('\nv0.2 — Objects');

test('tokenizes dot', () => {
  const tokens = tokenize('user.name');
  if (tokens[1].type !== TOKEN.DOT) throw new Error('. wrong');
});

test('object literal compiles to JS object', () => {
  const src = 'remember user as\n  name is "Ayokunle"\n  age is 17\ndone';
  const js = compile(src);
  if (!js.includes('"name": "Ayokunle"')) throw new Error('missing name property');
  if (!js.includes('"age": 17'))          throw new Error('missing age property');
});

test('property access compiles to dot notation', () => {
  const src = 'remember user as\n  name is "Ayokunle"\ndone\nshow user.name';
  const js = compile(src);
  if (!js.includes('user.name')) throw new Error('missing member access');
});

test('property assignment (becomes) compiles correctly', () => {
  const src = 'remember user as\n  age is 17\ndone\nuser.age becomes 18';
  const js = compile(src);
  if (!js.includes('user.age = 18')) throw new Error('missing member assignment');
});

test('throws on unclosed object literal', () => {
  try {
    compile('remember user as\n  name is "Ayokunle"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — becomes (reassignment) ────────────────────────────────────────────

console.log('\nv0.2 — becomes');

test('simple becomes compiles to assignment', () => {
  const src = 'remember age as 16\nage becomes 17';
  const js = compile(src);
  if (!js.includes('age = 17')) throw new Error('missing assignment');
});

test('remember compiles to let (supports reassignment)', () => {
  const src = 'remember x as 1';
  const js = compile(src);
  if (!js.includes('let x = 1')) throw new Error('expected let');
});

// ── v0.2 — Loops ─────────────────────────────────────────────────────────────

console.log('\nv0.2 — Loops');

test('tokenizes for / each / in keywords', () => {
  const tokens = tokenize('for each item in players');
  if (tokens[0].type !== TOKEN.FOR)        throw new Error('for wrong');
  if (tokens[1].type !== TOKEN.EACH)       throw new Error('each wrong');
  if (tokens[2].type !== TOKEN.IDENTIFIER) throw new Error('item wrong');
  if (tokens[3].type !== TOKEN.IN)         throw new Error('in wrong');
});

test('for each compiles to for-of loop', () => {
  const src = 'remember players as ["a", "b"]\nfor each player in players\n  show player\ndone';
  const js = compile(src);
  if (!js.includes('for (const player of players)')) throw new Error('missing for-of');
  if (!js.includes('console.log(player)'))           throw new Error('missing body');
});

test('throws on missing done in for each', () => {
  try {
    compile('remember a as [1]\nfor each x in a\n  show x');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — While ─────────────────────────────────────────────────────────────

console.log('\nv0.2 — While');

test('tokenizes while keyword', () => {
  const tokens = tokenize('while');
  if (tokens[0].type !== TOKEN.WHILE) throw new Error('while wrong');
});

test('while loop compiles to JS while', () => {
  const src = 'remember age as 0\nwhile age is less than 18\n  age becomes age + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (age < 18)'))   throw new Error('missing while condition');
  if (!js.includes('age = age + 1'))      throw new Error('missing body');
});

test('while with is compiles to === condition', () => {
  const src = 'remember x as 0\nwhile x is 0\n  x becomes 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x === 0)')) throw new Error('missing while ===');
});

test('throws on missing done in while', () => {
  try {
    compile('remember x as 0\nwhile x is less than 5\n  x becomes x + 1');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.2 — Standard library ───────────────────────────────────────────────────

console.log('\nv0.2 — Standard library');

test('uppercase() compiles to toUpperCase()', () => {
  const js = compile('show uppercase("hello")');
  if (!js.includes('.toUpperCase()')) throw new Error('missing toUpperCase');
});

test('lowercase() compiles to toLowerCase()', () => {
  const js = compile('show lowercase("HELLO")');
  if (!js.includes('.toLowerCase()')) throw new Error('missing toLowerCase');
});

test('random() compiles to Math.random()', () => {
  const js = compile('show random()');
  if (!js.includes('Math.random()')) throw new Error('missing Math.random');
});

test('round() compiles to Math.round()', () => {
  const js = compile('show round(3)');
  if (!js.includes('Math.round(3)')) throw new Error('missing Math.round');
});

// ── v0.2 — Imports ────────────────────────────────────────────────────────────

console.log('\nv0.2 — Imports');

test('tokenizes use keyword', () => {
  const tokens = tokenize('use express');
  if (tokens[0].type !== TOKEN.USE) throw new Error('use wrong');
});

test('use express compiles to require', () => {
  const js = compile('use express');
  if (!js.includes("require('express')")) throw new Error('missing require express');
});

test('use fs compiles to require', () => {
  const js = compile('use fs');
  if (!js.includes("require('fs')")) throw new Error('missing require fs');
});

test('multiple known imports compile', () => {
  const js = compile('use express\nuse fs');
  if (!js.includes("require('express')")) throw new Error('missing express');
  if (!js.includes("require('fs')"))      throw new Error('missing fs');
});

// ── v0.3 — Runtime package system ────────────────────────────────────────────

console.log('\nv0.3 — Runtime packages');

test('use sqlite compiles to require better-sqlite3', () => {
  const js = compile('use sqlite');
  if (!js.includes("require('better-sqlite3')")) throw new Error('missing sqlite require');
});

test('use path compiles to require path', () => {
  const js = compile('use path');
  if (!js.includes("require('path')")) throw new Error('missing path require');
});

test('generic npm package compiles to require (RFC-0011)', () => {
  const js = compile('use math');
  if (!js.includes("require('math')")) throw new Error('missing require math');
});

test('use node-fetch compiles to a bare require (not a valid identifier)', () => {
  const js = compile('use node-fetch');
  if (!js.includes("require('node-fetch')")) throw new Error('missing require node-fetch');
  if (js.includes('const node-fetch')) throw new Error('node-fetch must not become a const binding');
});

// ── v0.3 — Express runtime ───────────────────────────────────────────────────

console.log('\nv0.3 — Express runtime');

test('tokenizes when / someone / visits keywords', () => {
  const tokens = tokenize('when someone visits "/"');
  if (tokens[0].type !== TOKEN.WHEN)    throw new Error('when wrong');
  if (tokens[1].type !== TOKEN.SOMEONE) throw new Error('someone wrong');
  if (tokens[2].type !== TOKEN.VISITS)  throw new Error('visits wrong');
});

test('tokenizes listen / on keywords', () => {
  const tokens = tokenize('listen on 3000');
  if (tokens[0].type !== TOKEN.LISTEN) throw new Error('listen wrong');
  if (tokens[1].type !== TOKEN.ON)     throw new Error('on wrong');
});

test('tokenizes reply keyword', () => {
  const tokens = tokenize('reply');
  if (tokens[0].type !== TOKEN.REPLY) throw new Error('reply wrong');
});

test('tokenizes json keyword', () => {
  const tokens = tokenize('json');
  if (tokens[0].type !== TOKEN.JSON_KW) throw new Error('json wrong');
});

test('tokenizes serve / folder keywords', () => {
  const tokens = tokenize('serve folder "public"');
  if (tokens[0].type !== TOKEN.SERVE)  throw new Error('serve wrong');
  if (tokens[1].type !== TOKEN.FOLDER) throw new Error('folder wrong');
});

test('listen on port compiles to app.listen', () => {
  const src = 'listen on 3000\n  show "Running"\ndone';
  const js = compile(src);
  if (!js.includes('app.listen(3000')) throw new Error('missing app.listen');
  if (!js.includes('console.log("Running")')) throw new Error('missing body');
});

test('route compiles to app.get', () => {
  const src = 'when someone visits "/"\n  reply "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('app.get("/",'))   throw new Error('missing app.get');
  if (!js.includes('(req, res) =>'))  throw new Error('missing callback');
  if (!js.includes('res.send("Hello")')) throw new Error('missing reply');
});

test('reply compiles to res.send', () => {
  const src = 'when someone visits "/"\n  reply "Hi"\ndone';
  const js = compile(src);
  if (!js.includes('res.send("Hi")')) throw new Error('missing res.send');
});

test('reply json compiles to res.json', () => {
  const src = 'when someone visits "/api"\n  reply json\n    status is "ok"\n  done\ndone';
  const js = compile(src);
  if (!js.includes('res.json({'))                  throw new Error('missing res.json');
  if (!js.includes('"status": "ok"'))              throw new Error('missing property');
});

test('serve folder compiles to app.use(express.static)', () => {
  const src = 'serve folder "public"';
  const js = compile(src);
  if (!js.includes('app.use(express.static("public"))')) throw new Error('missing static');
});

test('request identifier remaps to req inside route', () => {
  const src = 'when someone visits "/"\n  show request.method\ndone';
  const js = compile(src);
  if (!js.includes('req.method')) throw new Error('missing req.method');
});

test('response identifier remaps to res inside route', () => {
  const src = 'when someone visits "/"\n  show response\ndone';
  const js = compile(src);
  if (!js.includes('console.log(res)')) throw new Error('missing res');
});

test('multiple routes compile independently', () => {
  const src = [
    'when someone visits "/"\n  reply "Home"\ndone',
    'when someone visits "/about"\n  reply "About"\ndone',
  ].join('\n');
  const js = compile(src);
  if (!js.includes('app.get("/",'))      throw new Error('missing / route');
  if (!js.includes('app.get("/about",')) throw new Error('missing /about route');
});

test('throws on missing done in route', () => {
  try {
    compile('when someone visits "/"\n  reply "Hello"');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('done')) throw e;
  }
});

// ── v0.3 — SQLite runtime ────────────────────────────────────────────────────

console.log('\nv0.3 — SQLite runtime');

test('sqlite() call compiles to new Database()', () => {
  const src = 'use sqlite\nremember db as sqlite("app.db")';
  const js = compile(src);
  if (!js.includes('new Database("app.db")')) throw new Error('missing new Database');
});

// ── Summary ──────────────────────────────────────────────────────────────────

// ── v0.4.1 — Multi-file Package System ───────────────────────────────────────

console.log('\nv0.4.1 — Multi-file imports');

test('tokenizes import keyword', () => {
  const tokens = tokenize('import "./math.pln"');
  if (tokens[0].type !== TOKEN.IMPORT) throw new Error('import token wrong');
  if (tokens[1].type !== TOKEN.STRING) throw new Error('path token wrong');
  if (tokens[1].value !== './math.pln') throw new Error('path value wrong');
});

test('import parses to ImportStatement', () => {
  const tokens = tokenize('import "./math.pln"');
  const ast    = parse(tokens);
  const node   = ast.body[0];
  if (node.type !== 'ImportStatement')   throw new Error('wrong node type');
  if (node.path !== './math.pln')        throw new Error('wrong path');
});

test('ImportStatement generates no output', () => {
  const js = generate(parse(tokenize('import "./math.pln"')));
  if (js.trim() !== '') throw new Error('import should generate empty string');
});

test('simple import — imported file compiles first', () => {
  const js = bundleFixture('uses_math.pln');
  // PI must be declared before it is used in show
  const piIdx   = js.indexOf('let PI');
  const showIdx = js.indexOf('console.log(PI)');
  if (piIdx === -1)     throw new Error('PI not declared');
  if (showIdx === -1)   throw new Error('show PI missing');
  if (piIdx > showIdx)  throw new Error('PI declared after show — wrong order');
});

test('simple import — output contains imported code', () => {
  const js = bundleFixture('uses_math.pln');
  if (!js.includes('let PI = 3.14'))  throw new Error('PI missing');
  if (!js.includes('let TAU = 6.28')) throw new Error('TAU missing');
});

test('two imports — both files included in output', () => {
  const js = bundleFixture('uses_both.pln');
  if (!js.includes('let PI'))        throw new Error('PI missing');
  if (!js.includes('function double')) throw new Error('double missing');
});

test('nested imports — deepest dependency compiled first', () => {
  const js = bundleFixture('nested_a.pln');
  // nested_c defines deepValue, must appear before nested_b and nested_a output
  const deepIdx = js.indexOf('let deepValue');
  const aIdx    = js.indexOf('"a loaded"');
  const bIdx    = js.indexOf('"b loaded"');
  if (deepIdx === -1) throw new Error('deepValue missing');
  if (bIdx === -1)    throw new Error('b loaded missing');
  if (aIdx === -1)    throw new Error('a loaded missing');
  if (deepIdx > bIdx) throw new Error('deepValue should come before b');
  if (bIdx > aIdx)    throw new Error('b should come before a');
});

test('duplicate imports — code included exactly once', () => {
  const js = bundleFixture('duplicate_a.pln');
  // PI should appear only once in the output
  const firstIdx  = js.indexOf('let PI');
  const secondIdx = js.indexOf('let PI', firstIdx + 1);
  if (firstIdx === -1)  throw new Error('PI not declared at all');
  if (secondIdx !== -1) throw new Error('PI declared more than once — duplicate import not de-duped');
});

test('diamond imports — shared file included exactly once', () => {
  const js = bundleFixture('diamond_top.pln');
  const firstIdx  = js.indexOf('let sharedValue');
  const secondIdx = js.indexOf('let sharedValue', firstIdx + 1);
  if (firstIdx === -1)  throw new Error('sharedValue missing');
  if (secondIdx !== -1) throw new Error('sharedValue declared twice — diamond not handled');
  if (!js.includes('"left"'))  throw new Error('left missing');
  if (!js.includes('"right"')) throw new Error('right missing');
  if (!js.includes('"top"'))   throw new Error('top missing');
});

bundleThrows(
  'circular imports give friendly error',
  'circular_a.pln',
  'circular'
);

bundleThrows(
  'circular import error mentions the file name',
  'circular_a.pln',
  'circular_a'
);

test('missing imported file gives friendly error', () => {
  const tokens = tokenize('import "./does_not_exist.pln"');
  const ast = parse(tokens);
  // Write a temp entry file referencing a non-existent file
  const tmpPath = path.join(__dirname, 'fixtures', 'missing_import_entry.pln');
  require('fs').writeFileSync(tmpPath, 'import "./no_such_file_xyz.pln"\n');
  try {
    bundle(tmpPath);
    require('fs').unlinkSync(tmpPath);
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    require('fs').unlinkSync(tmpPath);
    if (!e.message.toLowerCase().includes('cannot find')) {
      throw new Error(`Expected "cannot find" in error but got: ${e.message}`);
    }
  }
});

test('import path preserved correctly in AST', () => {
  const ast = parse(tokenize('import "./sub/module.pln"'));
  if (ast.body[0].path !== './sub/module.pln') throw new Error('wrong path');
});

// ── v0.4.2 — Package Manager & Project Management ────────────────────────────

console.log('\nv0.4.2 — plain init');

const os  = require('os');
const { execFileSync: _execFileSync } = require('child_process');
const CLI = path.join(__dirname, '..', 'compiler', 'cli.js');

// Run the CLI in a temporary directory.
// Returns combined stdout+stderr as a string; never throws.
function runCli(args, cwd) {
  try {
    return _execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env },
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

// Create a fresh temp directory for a test.
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plain-test-'));
}

test('plain init creates plain.json', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const jsonPath = path.join(dir, 'plain.json');
  if (!fs.existsSync(jsonPath)) throw new Error('plain.json was not created');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.name)    throw new Error('plain.json missing "name"');
  if (!data.version) throw new Error('plain.json missing "version"');
  if (!data.entry)   throw new Error('plain.json missing "entry"');
});

test('plain init shows "Project already initialized." when plain.json exists', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['init'], dir);
  if (!out.includes('Project already initialized.')) {
    throw new Error(`Expected "Project already initialized." but got: ${out}`);
  }
});

test('plain init plain.json has correct default entry', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'plain.json'), 'utf8'));
  if (data.entry !== 'app.pln') throw new Error(`expected entry "app.pln", got "${data.entry}"`);
});

test('plain init plain.json is valid JSON with name, version, entry', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(dir, 'plain.json'), 'utf8'));
  } catch (e) {
    throw new Error(`plain.json is not valid JSON: ${e.message}`);
  }
  if (typeof data.name    !== 'string') throw new Error('name must be a string');
  if (typeof data.version !== 'string') throw new Error('version must be a string');
  if (typeof data.entry   !== 'string') throw new Error('entry must be a string');
});

console.log('\nv0.4.2 — plain add / remove');

test('plain add errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['add', 'express'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain remove errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['remove', 'express'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain add without package name shows usage', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['add'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage hint but got: ${out}`);
  }
});

test('plain remove without package name shows usage', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['remove'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage hint but got: ${out}`);
  }
});

test('plain add rejects invalid package name (shell injection attempt)', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  // A name containing shell metacharacters must be rejected before npm is called.
  const out = runCli(['add', 'express; rm -rf /'], dir);
  if (!out.toLowerCase().includes('invalid package name')) {
    throw new Error(`Expected "Invalid package name" error but got: ${out}`);
  }
});

test('plain remove rejects invalid package name', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['remove', '$(evil)'], dir);
  if (!out.toLowerCase().includes('invalid package name')) {
    throw new Error(`Expected "Invalid package name" error but got: ${out}`);
  }
});

console.log('\nv0.4.2 — plain install (RFC-0009.2)');

test('plain install errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain install with no external dependencies shows correct message', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('This project has no external dependencies.')) {
    throw new Error(`Expected "This project has no external dependencies." but got: ${out}`);
  }
});

test('plain install with built-in modules only shows no external dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use fs\nuse path\nshow "ok"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('This project has no external dependencies.')) {
    throw new Error(`Expected "This project has no external dependencies." but got: ${out}`);
  }
});

test('plain install installs missing dependencies and reports success', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nshow "ok"\n');
  const out = runCli(['install'], dir);
  // Check that it found and installed the package
  if (!out.includes('Found 1 required package(s).')) {
    throw new Error(`Expected "Found 1 required package(s)." but got: ${out}`);
  }
  if (!out.includes('Installing semver...')) {
    throw new Error(`Expected "Installing semver..." but got: ${out}`);
  }
  if (!out.includes('Done.')) {
    throw new Error(`Expected "Done." but got: ${out}`);
  }
  // Verify package is actually installed
  const nodeModules = path.join(dir, 'node_modules');
  if (!fs.existsSync(nodeModules)) throw new Error('node_modules not created');
  const pkgDir = path.join(nodeModules, 'semver');
  if (!fs.existsSync(pkgDir)) throw new Error('semver package not installed');
});

test('plain install skips already installed dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nshow "ok"\n');
  // First install
  runCli(['install'], dir);
  // Second install should say all installed
  const out = runCli(['install'], dir);
  if (!out.includes('All dependencies are already installed.')) {
    throw new Error(`Expected "All dependencies are already installed." but got: ${out}`);
  }
});

test('plain install handles multiple dependencies', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'use semver\nuse express\nshow "ok"\n');
  const out = runCli(['install'], dir);
  if (!out.includes('Found 2 required package(s).')) {
    throw new Error(`Expected "Found 2 required package(s)." but got: ${out}`);
  }
  if (!out.includes('Installing semver...')) throw new Error('semver install missing');
  if (!out.includes('Installing express...')) throw new Error('express install missing');
});

test('plain install fails when entry file is missing', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  // Remove the entry file
  const entry = path.join(dir, 'app.pln');
  fs.unlinkSync(entry);
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('entry file "app.pln" not found')) {
    throw new Error(`Expected entry file not found error but got: ${out}`);
  }
});

test('plain install shows friendly error on resolver failure (circular import)', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const entry = path.join(dir, 'app.pln');
  fs.writeFileSync(entry, 'import "./a.pln"\n');
  const aFile = path.join(dir, 'a.pln');
  fs.writeFileSync(aFile, 'import "./app.pln"\n');
  const out = runCli(['install'], dir);
  if (!out.toLowerCase().includes('circular')) {
    throw new Error(`Expected circular import error but got: ${out}`);
  }
});

// ── End of install tests ────────────────────────────────────────────────────

console.log('\nv0.4.2 — CLI help');

test('plain help includes "plain init"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain init')) throw new Error(`"plain init" missing from help. Got:\n${out}`);
});

test('plain help includes "plain install"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain install')) throw new Error(`"plain install" missing from help. Got:\n${out}`);
});

test('plain help includes "plain add"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain add')) throw new Error(`"plain add" missing from help. Got:\n${out}`);
});

test('plain help includes "plain remove"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain remove')) throw new Error(`"plain remove" missing from help. Got:\n${out}`);
});

test('plain help includes "plain update"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain update')) throw new Error(`"plain update" missing from help. Got:\n${out}`);
});

test('plain version shows 2.0.0-latest', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('2.0.0-latest')) throw new Error(`Expected version 2.0.0-latest but got: ${out}`);
});

// ── v0.5 — Formatter ─────────────────────────────────────────────────────────

console.log('\nv0.5 — Formatter');

test('format: removes trailing whitespace', () => {
  const result = format('remember x as 1   \nshow x   ');
  if (result.includes('   ')) throw new Error('trailing whitespace not removed');
});

test('format: normalises indentation inside a function', () => {
  const src = 'make add(a, b)\ngive a + b\ndone';
  const result = format(src);
  if (!result.includes('    give a + b')) throw new Error('body not indented with 4 spaces');
});

test('format: normalises indentation inside an if block', () => {
  const src = 'remember x as 1\nif x is 1\nshow "yes"\ndone';
  const result = format(src);
  if (!result.includes('    show "yes"')) throw new Error('if body not indented');
});

test('format: collapses multiple blank lines into one', () => {
  const src = 'show "a"\n\n\n\nshow "b"';
  const result = format(src);
  const doubled = result.includes('\n\n\n');
  if (doubled) throw new Error('multiple blank lines not collapsed');
});

test('format: one blank line between top-level blocks', () => {
  const src = 'make greet()\nshow "hi"\ndone\nmake bye()\nshow "bye"\ndone';
  const result = format(src);
  if (!result.includes('done\n\nmake')) throw new Error('missing blank line between functions');
});

test('format: dedents "otherwise" keyword', () => {
  const src = 'if x is 1\nshow "yes"\notherwise\nshow "no"\ndone';
  const result = format(src);
  if (!result.match(/^otherwise/m)) throw new Error('"otherwise" not at depth 0');
});

test('format: dedents "done" keyword', () => {
  const src = 'make f()\nshow "hi"\ndone';
  const result = format(src);
  if (!result.match(/^done/m)) throw new Error('"done" not at depth 0');
});

test('format: output ends with a single newline', () => {
  const result = format('show "hello"');
  if (!result.endsWith('\n'))   throw new Error('output does not end with newline');
  if (result.endsWith('\n\n')) throw new Error('output ends with double newline');
});

test('format: strips leading blank lines', () => {
  const result = format('\n\nshow "hi"');
  if (result.startsWith('\n')) throw new Error('leading blank lines not stripped');
});

test('format: idempotent — formatting twice gives the same result', () => {
  const src = 'make add(a, b)\ngive a + b\ndone\nremember x as 1\nshow x';
  const once  = format(src);
  const twice = format(once);
  if (once !== twice) throw new Error('format is not idempotent');
});

test('format: no blank lines inserted between consecutive non-block statements', () => {
  const src = 'remember x as 1\nremember y as 2\nshow x\nshow y';
  const result = format(src);
  // None of the lines should be separated by blank lines
  if (result.includes('\n\n')) {
    throw new Error(`Unexpected blank line between simple statements:\n${result}`);
  }
});

test('format: array elements are indented', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n]';
  const result = format(src);
  if (!result.includes('    "Haaland"')) {
    throw new Error(`Array elements not indented:\n${result}`);
  }
  if (!result.includes('    "Foden"')) {
    throw new Error(`Array elements not indented:\n${result}`);
  }
});

test('format: closing bracket is not indented', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n]';
  const result = format(src);
  if (!result.match(/^\]/m)) {
    throw new Error(`Closing bracket should be at column 0:\n${result}`);
  }
});

test('format: no blank lines between array elements', () => {
  const src = 'remember players as [\n"Haaland",\n"Foden",\n"Rodri",\n]';
  const result = format(src);
  if (result.includes('"Haaland",\n\n') || result.includes('"Foden",\n\n')) {
    throw new Error(`Blank lines found between array elements:\n${result}`);
  }
});

// ── v0.5 — plain check ───────────────────────────────────────────────────────

console.log('\nv0.5 — plain check');

test('plain check exits 0 on valid file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'ok.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nshow x\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.includes('no errors found')) {
    throw new Error(`Expected "no errors found" but got: ${out}`);
  }
});

test('plain check reports error on invalid file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remembr x as 1\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.toLowerCase().includes('did you mean')) {
    throw new Error(`Expected "did you mean" suggestion but got: ${out}`);
  }
});

test('plain check includes line number in error', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nremembr y as 2\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.toLowerCase().includes('line')) {
    throw new Error(`Expected line info in error but got: ${out}`);
  }
});

test('plain check includes filename in error', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'bad.pln');
  fs.writeFileSync(plnFile, 'remember x as 1\nremembr y as 2\n');
  const out = runCli(['check', plnFile], dir);
  if (!out.includes('bad.pln')) {
    throw new Error(`Expected filename "bad.pln" in error but got: ${out}`);
  }
});

test('plain check errors without file argument', () => {
  const dir = tmpDir();
  const out = runCli(['check'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage message but got: ${out}`);
  }
});

test('plain check errors on missing file', () => {
  const dir = tmpDir();
  const out = runCli(['check', 'does_not_exist.pln'], dir);
  if (!out.toLowerCase().includes('not found')) {
    throw new Error(`Expected "not found" error but got: ${out}`);
  }
});

// ── v0.5 — plain fmt ─────────────────────────────────────────────────────────

console.log('\nv0.5 — plain fmt');

test('plain fmt formats file in-place', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'make add(a, b)\ngive a + b\ndone\n');
  runCli(['fmt', plnFile], dir);
  const result = fs.readFileSync(plnFile, 'utf8');
  if (!result.includes('    give a + b')) {
    throw new Error(`Expected indented body after fmt but got:\n${result}`);
  }
});

test('plain fmt reports success message', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'app.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  const out = runCli(['fmt', plnFile], dir);
  if (!out.toLowerCase().includes('formatted')) {
    throw new Error(`Expected "formatted" in output but got: ${out}`);
  }
});

test('plain fmt errors without file argument', () => {
  const dir = tmpDir();
  const out = runCli(['fmt'], dir);
  if (!out.toLowerCase().includes('usage')) {
    throw new Error(`Expected usage message but got: ${out}`);
  }
});

test('plain fmt errors on missing file', () => {
  const dir = tmpDir();
  const out = runCli(['fmt', 'does_not_exist.pln'], dir);
  if (!out.toLowerCase().includes('not found')) {
    throw new Error(`Expected "not found" error but got: ${out}`);
  }
});

// ── v0.5 — Diagnostics (line + column in errors) ─────────────────────────────

console.log('\nv0.5 — Diagnostics');

test('parse error includes Line N', () => {
  try {
    compile('remember x as 1\nif x is 1\nshow "oops"');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('parse error includes Column N', () => {
  try {
    compile('remember x as 1\nif x is 1\nshow "oops"');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Column \d+/)) {
      throw new Error(`Expected "Column N" in error but got: ${e.message}`);
    }
  }
});

test('misspelled keyword error includes line number', () => {
  try {
    compile('remember x as 1\nshwo x');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('unknown keyword suggestion includes "Did you mean"', () => {
  try {
    compile('remembr x as 1');
    throw new Error('expected error');
  } catch (e) {
    if (!e.message.includes('Did you mean')) {
      throw new Error(`Expected "Did you mean" but got: ${e.message}`);
    }
  }
});

// ── v0.5 — CLI help & version ─────────────────────────────────────────────────

console.log('\nv0.5 — CLI help & version');

test('plain help includes "plain check"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain check')) throw new Error(`"plain check" missing from help. Got:\n${out}`);
});

test('plain help includes "plain fmt"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain fmt')) throw new Error(`"plain fmt" missing from help. Got:\n${out}`);
});

test('plain version shows 2.0.0-latest', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('2.0.0-latest')) throw new Error(`Expected version 2.0.0-latest but got: ${out}`);
});

test('package.json exposes a global plain bin with a node shebang', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  if (!pkg.bin || pkg.bin.plain !== './compiler/cli.js') throw new Error('missing "plain" bin');
  if (!pkg.bin['plain-code']) throw new Error('missing "plain-code" bin');
  if (pkg.preferGlobal !== true) throw new Error('preferGlobal should be true');
  const firstLine = fs.readFileSync(path.join(__dirname, '..', 'compiler', 'cli.js'), 'utf8').split('\n')[0];
  if (firstLine.trim() !== '#!/usr/bin/env node') {
    throw new Error('compiler/cli.js must start with a node shebang for global installs');
  }
});

// ── v0.6 — Extended comparisons ──────────────────────────────────────────────

console.log('\nv0.6 — Extended comparisons (lexer)');

test('tokenizes "above" keyword', () => {
  const tokens = tokenize('is above');
  if (tokens[1].type !== TOKEN.ABOVE) throw new Error('above wrong');
});

test('tokenizes "below" keyword', () => {
  const tokens = tokenize('is below');
  if (tokens[1].type !== TOKEN.BELOW) throw new Error('below wrong');
});

test('tokenizes "between" keyword', () => {
  const tokens = tokenize('between');
  if (tokens[0].type !== TOKEN.BETWEEN) throw new Error('between wrong');
});

test('tokenizes "and" keyword', () => {
  const tokens = tokenize('and');
  if (tokens[0].type !== TOKEN.AND) throw new Error('and wrong');
});

test('tokenizes "contains" keyword', () => {
  const tokens = tokenize('contains');
  if (tokens[0].type !== TOKEN.CONTAINS) throw new Error('contains wrong');
});

test('tokenizes "every" as EACH token', () => {
  const tokens = tokenize('every');
  if (tokens[0].type !== TOKEN.EACH) throw new Error('every should be EACH token');
});

test('tokenizes "not" keyword', () => {
  const tokens = tokenize('not');
  if (tokens[0].type !== TOKEN.NOT) throw new Error('not wrong');
});

test('tokenizes "empty" keyword', () => {
  const tokens = tokenize('empty');
  if (tokens[0].type !== TOKEN.EMPTY) throw new Error('empty wrong');
});

console.log('\nv0.6 — Extended comparisons (compiler)');

test('"is above" compiles to >', () => {
  const src = 'remember age as 20\nif age is above 18\n  show "adult"\ndone';
  const js = compile(src);
  if (!js.includes('age > 18')) throw new Error('expected age > 18');
});

test('"is below" compiles to <', () => {
  const src = 'remember age as 5\nif age is below 13\n  show "child"\ndone';
  const js = compile(src);
  if (!js.includes('age < 13')) throw new Error('expected age < 13');
});

test('"is at least" compiles to >=', () => {
  const src = 'remember age as 18\nif age is at least 18\n  show "ok"\ndone';
  const js = compile(src);
  if (!js.includes('age >= 18')) throw new Error('expected age >= 18');
});

test('"is at most" compiles to <=', () => {
  const src = 'remember x as 5\nif x is at most 10\n  show "ok"\ndone';
  const js = compile(src);
  if (!js.includes('x <= 10')) throw new Error('expected x <= 10');
});

test('"is not" compiles to !==', () => {
  const src = 'remember x as 5\nif x is not 3\n  show "different"\ndone';
  const js = compile(src);
  if (!js.includes('x !== 3')) throw new Error('expected x !== 3');
});

test('"is empty" compiles to .length === 0', () => {
  const src = 'if x is empty\n  show "empty"\ndone';
  const js = compile(src);
  if (!js.includes('(x).length === 0')) throw new Error('expected .length === 0');
});

test('"is not empty" compiles to .length > 0', () => {
  const src = 'if x is not empty\n  show "has content"\ndone';
  const js = compile(src);
  if (!js.includes('(x).length > 0')) throw new Error('expected .length > 0');
});

test('"contains" compiles to .includes()', () => {
  const src = 'if name contains "Plain"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.includes(')) throw new Error('expected .includes()');
  if (!js.includes('"Plain"')) throw new Error('expected search value');
});

test('"starts with" compiles to .startsWith()', () => {
  const src = 'if name starts with "Hello"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.startsWith(')) throw new Error('expected .startsWith()');
});

test('"ends with" compiles to .endsWith()', () => {
  const src = 'if name ends with "!"\n  show "yes"\ndone';
  const js = compile(src);
  if (!js.includes('.endsWith(')) throw new Error('expected .endsWith()');
});

test('"between X and Y" compiles to >= X && <= Y', () => {
  const src = 'if age between 13 and 19\n  show "teenager"\ndone';
  const js = compile(src);
  if (!js.includes('age >= 13 && age <= 19')) throw new Error('expected between condition');
});

test('"between" wraps in if (...) correctly', () => {
  const src = 'if age between 1 and 100\n  show "alive"\ndone';
  const js = compile(src);
  if (!js.includes('if (age >= 1 && age <= 100)')) throw new Error('expected wrapped between');
});

test('"for every" compiles like "for each"', () => {
  const src = 'for every item in players\n  show item\ndone';
  const js = compile(src);
  if (!js.includes('for (const item of players)')) throw new Error('missing for-of from for every');
});

test('"for every" end-to-end with array', () => {
  const src = 'remember players as ["a", "b"]\nfor every player in players\n  show player\ndone';
  const js = compile(src);
  if (!js.includes('for (const player of players)')) throw new Error('missing for-of');
  if (!js.includes('console.log(player)')) throw new Error('missing body');
});

test('"is above" works in while loop', () => {
  const src = 'remember x as 10\nwhile x is above 0\n  x becomes x + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x > 0)')) throw new Error('expected while (x > 0)');
});

test('error: "is at" without least/most gives helpful message', () => {
  try {
    compile('if x is at 5\n  show "ok"\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('least') && !e.message.toLowerCase().includes('most')) {
      throw new Error(`Expected "least" or "most" in error but got: ${e.message}`);
    }
  }
});

// ── v0.6 — Runtime Standard Library ──────────────────────────────────────────

console.log('\nv0.6 — Runtime stdlib');

test('print() compiles to console.log', () => {
  const js = compile('print("hello")');
  if (!js.includes('console.log("hello")')) throw new Error('missing console.log');
});

test('print() with multiple args compiles correctly', () => {
  const js = compile('print("a")');
  if (!js.includes('console.log(')) throw new Error('missing console.log call');
});

test('readFile() compiles to readFileSync', () => {
  const js = compile('remember content as readFile("file.txt")');
  if (!js.includes('readFileSync')) throw new Error('missing readFileSync');
  if (!js.includes('"file.txt"')) throw new Error('missing filename');
});

test('writeFile() compiles to writeFileSync', () => {
  const js = compile('writeFile("out.txt", "hello")');
  if (!js.includes('writeFileSync')) throw new Error('missing writeFileSync');
});

test('fileExists() compiles to existsSync', () => {
  const js = compile('remember exists as fileExists("file.txt")');
  if (!js.includes('existsSync')) throw new Error('missing existsSync');
});

test('sleep() compiles to Atomics.wait', () => {
  const js = compile('sleep(1000)');
  if (!js.includes('Atomics.wait')) throw new Error('missing Atomics.wait');
  if (!js.includes('1000')) throw new Error('missing duration');
});

test('time() compiles to Date.now()', () => {
  const js = compile('remember t as time()');
  if (!js.includes('Date.now()')) throw new Error('missing Date.now()');
});

test('date() compiles to new Date().toISOString()', () => {
  const js = compile('remember d as date()');
  if (!js.includes('new Date().toISOString()')) throw new Error('missing toISOString');
});

test('jsonEncode() compiles to JSON.stringify', () => {
  const js = compile('remember s as jsonEncode(x)');
  if (!js.includes('JSON.stringify(x)')) throw new Error('missing JSON.stringify');
});

test('jsonDecode() compiles to JSON.parse', () => {
  const js = compile('remember obj as jsonDecode(s)');
  if (!js.includes('JSON.parse(s)')) throw new Error('missing JSON.parse');
});

test('env() compiles to process.env', () => {
  const js = compile('remember val as env("KEY")');
  if (!js.includes('process.env[')) throw new Error('missing process.env');
  if (!js.includes('"KEY"')) throw new Error('missing env key');
});

test('exit() compiles to process.exit', () => {
  const js = compile('exit(0)');
  if (!js.includes('process.exit(0)')) throw new Error('missing process.exit(0)');
});

test('uuid() compiles to randomUUID', () => {
  const js = compile('remember id as uuid()');
  if (!js.includes('randomUUID()')) throw new Error('missing randomUUID');
});

test('uuid() uses require("crypto")', () => {
  const js = compile('remember id as uuid()');
  if (!js.includes("require('crypto')")) throw new Error('missing require crypto');
});

// ── v0.6 — Express DX ────────────────────────────────────────────────────────

console.log('\nv0.6 — Express DX');

test('tokenizes "web" as WEB', () => {
  const tokens = tokenize('web');
  if (tokens[0].type !== TOKEN.WEB) throw new Error('web wrong');
});

test('tokenizes "route" as ROUTE_KW', () => {
  const tokens = tokenize('route');
  if (tokens[0].type !== TOKEN.ROUTE_KW) throw new Error('route wrong');
});

test('tokenizes "start" as START_KW', () => {
  const tokens = tokenize('start');
  if (tokens[0].type !== TOKEN.START_KW) throw new Error('start wrong');
});

test('"web app" compiles to Express require and app setup', () => {
  const js = compile('web app');
  if (!js.includes("require('express')")) throw new Error('missing require express');
  if (!js.includes('const app = express()')) throw new Error('missing const app');
});

test('"web app" generates const express', () => {
  const js = compile('web app');
  if (!js.includes('const express')) throw new Error('missing const express');
});

test('duplicate runtime requires are emitted once', () => {
  const js = compile('use express\nuse express\nweb app');
  if ((js.match(/require\('express'\)/g) || []).length !== 1) {
    throw new Error(`expected one express require, got:\n${js}`);
  }
});

test('"route" shorthand compiles to app.get', () => {
  const src = 'route "/"\n  reply "Hello"\ndone';
  const js = compile(src);
  if (!js.includes('app.get("/",')) throw new Error('missing app.get');
  if (!js.includes('(req, res) =>')) throw new Error('missing callback');
});

test('"route" reply compiles to res.send', () => {
  const src = 'route "/home"\n  reply "Home"\ndone';
  const js = compile(src);
  if (!js.includes('res.send("Home")')) throw new Error('missing res.send');
});

test('"start" compiles to app.listen without body', () => {
  const src = 'start 3000';
  const js = compile(src);
  if (!js.includes('app.listen(3000)')) throw new Error('missing app.listen(3000)');
  if (js.includes('() =>')) throw new Error('start should not have callback');
});

test('"start" works with a variable port', () => {
  const src = 'remember port as 8080\nstart port';
  const js = compile(src);
  if (!js.includes('app.listen(port)')) throw new Error('missing app.listen(port)');
});

// ── v0.6 — SQLite DX ─────────────────────────────────────────────────────────

console.log('\nv0.6 — SQLite DX');

test('tokenizes "database" as DATABASE_KW', () => {
  const tokens = tokenize('database');
  if (tokens[0].type !== TOKEN.DATABASE_KW) throw new Error('database wrong');
});

test('tokenizes "query" block as QUERY_KW + SQL_BODY + DONE', () => {
  const tokens = tokenize('query\n    SELECT * FROM users\ndone');
  if (tokens[0].type !== TOKEN.QUERY_KW)  throw new Error('QUERY_KW wrong');
  if (tokens[1].type !== TOKEN.SQL_BODY)  throw new Error('SQL_BODY wrong');
  if (tokens[2].type !== TOKEN.DONE)      throw new Error('DONE wrong');
});

test('"query" SQL_BODY contains the SQL text', () => {
  const tokens = tokenize('query\n    SELECT 1\ndone');
  if (!tokens[1].value.includes('SELECT 1')) throw new Error('SQL content missing');
});

test('"database" compiles to new Database()', () => {
  const js = compile('database "app.db"');
  if (!js.includes('new Database("app.db")')) throw new Error('missing new Database');
});

test('"database" generates require better-sqlite3', () => {
  const js = compile('database "app.db"');
  if (!js.includes("require('better-sqlite3')")) throw new Error('missing require better-sqlite3');
});

test('"database" generates const db', () => {
  const js = compile('database "app.db"');
  if (!js.includes('const db')) throw new Error('missing const db');
});

test('"query" block compiles to db.prepare().all()', () => {
  const src = 'query\n    SELECT * FROM users\ndone';
  const js = compile(src);
  if (!js.includes('db.prepare(')) throw new Error('missing db.prepare');
  if (!js.includes('.all()'))       throw new Error('missing .all()');
  if (!js.includes('SELECT * FROM users')) throw new Error('missing SQL');
});

test('"insert" block compiles to db.prepare().run()', () => {
  const src = 'insert\n    INSERT INTO users (name) VALUES ("Alice")\ndone';
  const js = compile(src);
  if (!js.includes('db.prepare(')) throw new Error('missing db.prepare');
  if (!js.includes('.run()'))       throw new Error('missing .run()');
});

test('"update" block compiles to db.prepare().run()', () => {
  const src = 'update\n    UPDATE users SET name = "Bob" WHERE id = 1\ndone';
  const js = compile(src);
  if (!js.includes('.run()')) throw new Error('missing .run()');
});

test('"delete" block compiles to db.prepare().run()', () => {
  const src = 'delete\n    DELETE FROM users WHERE id = 1\ndone';
  const js = compile(src);
  if (!js.includes('.run()')) throw new Error('missing .run()');
});

test('"execute" block compiles to db.exec()', () => {
  const src = 'execute\n    CREATE TABLE users (id INTEGER PRIMARY KEY)\ndone';
  const js = compile(src);
  if (!js.includes('db.exec(')) throw new Error('missing db.exec');
});

// ── v0.6 — CLI updates ────────────────────────────────────────────────────────

console.log('\nv0.6 — CLI updates');

test('plain version shows 2.0.0-latest (CLI)', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('2.0.0-latest')) throw new Error(`Expected 2.0.0-latest but got: ${out}`);
});

test('plain help mentions v1.0 features', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('1.0')) throw new Error('"1.0" missing from help');
});

test('plain help mentions v1.1 Plain Expressions', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('Plain Expressions')) throw new Error('"Plain Expressions" missing from help');
});

test('plain help includes "route"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('route')) throw new Error('"route" missing from help');
});

// ── v1.0.0 — Lexer edge cases ────────────────────────────────────────────────

console.log('\nv1.0 — Lexer edge cases');

test('token carries line number', () => {
  const tokens = tokenize('remember\nshow');
  if (tokens[0].line !== 1) throw new Error(`Expected line 1 but got ${tokens[0].line}`);
  if (tokens[1].line !== 2) throw new Error(`Expected line 2 but got ${tokens[1].line}`);
});

test('token carries column number', () => {
  const tokens = tokenize('  remember x as 1');
  if (tokens[0].col !== 3) throw new Error(`Expected col 3 but got ${tokens[0].col}`);
});

test('tokenizes decimal number', () => {
  const tokens = tokenize('3.14');
  if (tokens[0].type !== TOKEN.NUMBER) throw new Error('wrong type');
  if (tokens[0].value !== 3.14) throw new Error(`wrong value: ${tokens[0].value}`);
});

test('tokenizes identifier with underscore', () => {
  const tokens = tokenize('my_var');
  if (tokens[0].type !== TOKEN.IDENTIFIER) throw new Error('wrong type');
  if (tokens[0].value !== 'my_var') throw new Error('wrong value');
});

test('tokenizes identifier with digits', () => {
  const tokens = tokenize('item2');
  if (tokens[0].type !== TOKEN.IDENTIFIER) throw new Error('wrong type');
  if (tokens[0].value !== 'item2') throw new Error('wrong value');
});

test('throws on unexpected character', () => {
  try {
    tokenize('@invalid');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('unexpected')) throw e;
  }
});

// ── v1.0.0 — Compiler expression edge cases ───────────────────────────────────

console.log('\nv1.0 — Expression edge cases');

test('empty array literal compiles to []', () => {
  const js = compile('remember items as []');
  if (!js.includes('= []')) throw new Error('missing empty array');
});

test('decimal number literal compiles correctly', () => {
  const js = compile('remember pi as 3.14');
  if (!js.includes('3.14')) throw new Error('missing decimal');
});

test('nested member access compiles correctly', () => {
  const js = compile('show user.profile.name');
  if (!js.includes('user.profile.name')) throw new Error('missing nested member access');
});

test('chained index access compiles correctly', () => {
  const js = compile('show matrix[0][1]');
  if (!js.includes('matrix[0][1]')) throw new Error('missing chained index access');
});

test('member access becomes compiles to assignment', () => {
  const js = compile('user.profile.age becomes 18');
  if (!js.includes('user.profile.age = 18')) throw new Error('missing nested assignment');
});

test('addition expression with strings compiles correctly', () => {
  const js = compile('remember greeting as "Hello" + " " + "World"');
  if (!js.includes('"Hello" + " " + "World"')) throw new Error('missing string concat');
});

test('function call result used in expression', () => {
  const js = compile('show add(1, 2) + 3');
  if (!js.includes('add(1, 2) + 3')) throw new Error('missing expression with call');
});

// ── v1.0.0 — Error message quality ───────────────────────────────────────────

console.log('\nv1.0 — Error message quality');

test('misspelled "mke" suggests "make"', () => {
  try {
    compile('mke greet()\n  show "hi"\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('did you mean')) {
      throw new Error(`Expected "did you mean" suggestion but got: ${e.message}`);
    }
  }
});

test('misspelled "wihle" suggests "while"', () => {
  try {
    compile('wihle x is 0\n  x becomes 1\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('did you mean')) {
      throw new Error(`Expected "did you mean" suggestion but got: ${e.message}`);
    }
  }
});

test('package names that are reserved words compile to a bare require', () => {
  const js = compile('use class');
  if (!js.includes("require('class')")) throw new Error('missing require class');
  if (js.includes('const class')) throw new Error('reserved word must not become a const binding');
});

test('unterminated string has line and column info', () => {
  try {
    tokenize('"missing close');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.match(/Line \d+/)) {
      throw new Error(`Expected "Line N" in error but got: ${e.message}`);
    }
  }
});

test('missing "as" in remember gives helpful message', () => {
  try {
    compile('remember age 16');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('as')) {
      throw new Error(`Expected "as" in error but got: ${e.message}`);
    }
  }
});

// ── v1.0.0 — Formatter additional coverage ────────────────────────────────────

console.log('\nv1.0 — Formatter additional coverage');

test('format: for each block body is indented', () => {
  const src = 'for each item in list\nshow item\ndone';
  const result = format(src);
  if (!result.includes('    show item')) throw new Error('for each body not indented');
});

test('format: while block body is indented', () => {
  const src = 'while x is below 10\nx becomes x + 1\ndone';
  const result = format(src);
  if (!result.includes('    x becomes x + 1')) throw new Error('while body not indented');
});

test('format: route block body is indented', () => {
  const src = 'route "/"\nreply "Hello"\ndone';
  const result = format(src);
  if (!result.includes('    reply "Hello"')) throw new Error('route body not indented');
});

test('format: nested if inside function is double-indented', () => {
  const src = 'make check(x)\nif x is 1\nshow "one"\ndone\ndone';
  const result = format(src);
  if (!result.includes('        show "one"')) throw new Error('nested if not double-indented');
});

test('format: object literal body is indented', () => {
  const src = 'remember user as\nname is "Ayokunle"\ndone';
  const result = format(src);
  if (!result.includes('    name is "Ayokunle"')) throw new Error('object body not indented');
});

// ── v1.0.0 — CLI additional coverage ─────────────────────────────────────────

console.log('\nv1.0 — CLI additional coverage');

test('plain new creates the project directory', () => {
  const dir = tmpDir();
  const projectName = 'test-new-project';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(projectDir)) throw new Error('project directory not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain new creates app.pln', () => {
  const dir = tmpDir();
  const projectName = 'test-new-pln';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(path.join(projectDir, 'app.pln'))) throw new Error('app.pln not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain new creates plain.json', () => {
  const dir = tmpDir();
  const projectName = 'test-new-json';
  const projectDir = path.join(dir, projectName);
  runCli(['new', projectName], dir);
  if (!fs.existsSync(path.join(projectDir, 'plain.json'))) throw new Error('plain.json not created');
  fs.rmSync(projectDir, { recursive: true, force: true });
});

test('plain build writes .js output file', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'hello.pln');
  fs.writeFileSync(plnFile, 'show "hello"\n');
  runCli(['build', plnFile], dir);
  const jsFile = path.join(dir, 'hello.js');
  if (!fs.existsSync(jsFile)) throw new Error('.js output file not created');
});

test('plain build output file contains valid JS', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'prog.pln');
  fs.writeFileSync(plnFile, 'remember x as 42\nshow x\n');
  runCli(['build', plnFile], dir);
  const js = fs.readFileSync(path.join(dir, 'prog.js'), 'utf8');
  if (!js.includes('let x = 42')) throw new Error('expected let x = 42 in output');
  if (!js.includes('console.log(x)')) throw new Error('expected console.log in output');
});

test('plain help includes "plain new"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain new')) throw new Error('"plain new" missing from help');
});

test('unknown command shows an error message', () => {
  const dir = tmpDir();
  const out = runCli(['doesnotexist'], dir);
  if (!out.toLowerCase().includes('unknown command')) {
    throw new Error(`Expected "unknown command" error but got: ${out}`);
  }
});

test('plain run on a nonexistent file exits with a friendly error', () => {
  const dir = tmpDir();
  const out = runCli(['run', 'no_such_file.pln'], dir);
  if (!out.includes('File not found')) {
    throw new Error(`Expected "File not found" error but got: ${out}`);
  }
  if (out.includes('Complex Compilation') && !out.includes('trying Complex Compilation')) {
    throw new Error(`Complex Compilation must not be invoked for a missing file. Output:\n${out}`);
  }
});

// ── v1.0.0 — Compiler regression tests ───────────────────────────────────────

console.log('\nv1.0 — Regression tests');

test('remember with array index read compiles correctly', () => {
  const js = compile('remember players as ["a", "b"]\nremember first as players[0]');
  if (!js.includes('let first = players[0]')) throw new Error('missing index read');
});

test('becomes with object member compiles to assignment', () => {
  const js = compile('user.score becomes 100');
  if (!js.includes('user.score = 100')) throw new Error('missing member assignment');
});

test('"is equal to" is not a valid alias (is is the keyword)', () => {
  // "is" compiles to ===; "equal" and "to" are not keywords the parser handles
  // as a multi-word operator. Only "is" alone triggers equality.
  const js = compile('if x is 5\n  show "five"\ndone');
  if (!js.includes('x === 5')) throw new Error('expected x === 5');
});

test('for each with function call in body', () => {
  const src = 'for each item in list\n  greet(item)\ndone';
  const js = compile(src);
  if (!js.includes('greet(item)')) throw new Error('missing function call in loop body');
});

test('nested function declarations compile correctly', () => {
  const src = 'make outer()\n    make inner()\n        show "hi"\n    done\ndone';
  const js = compile(src);
  if (!js.includes('function outer()')) throw new Error('missing outer');
  if (!js.includes('function inner()')) throw new Error('missing inner');
});

test('multiple show statements compile to multiple console.log calls', () => {
  const src = 'show "a"\nshow "b"\nshow "c"';
  const js = compile(src);
  const count = (js.match(/console\.log/g) || []).length;
  if (count !== 3) throw new Error(`Expected 3 console.log calls but got ${count}`);
});

test('reply json with multiple properties compiles correctly', () => {
  const src = 'when someone visits "/"\n  reply json\n    name is "Plain"\n    version is "1.0"\n  done\ndone';
  const js = compile(src);
  if (!js.includes('"name": "Plain"')) throw new Error('missing name property');
  if (!js.includes('"version": "1.0"')) throw new Error('missing version property');
});

test('serve folder compiles with correct path', () => {
  const js = compile('serve folder "dist"');
  if (!js.includes('"dist"')) throw new Error('missing folder path');
  if (!js.includes('express.static')) throw new Error('missing static call');
});

test('while loop with is not condition', () => {
  const src = 'remember x as 0\nwhile x is not 10\n  x becomes x + 1\ndone';
  const js = compile(src);
  if (!js.includes('while (x !== 10)')) throw new Error('expected while x !== 10');
});

test('between condition in while loop', () => {
  const src = 'remember x as 5\nif x between 1 and 10\n  show "in range"\ndone';
  const js = compile(src);
  if (!js.includes('x >= 1 && x <= 10')) throw new Error('expected between range');
});

// ── RFC-0010 — Plain Expressions (v1.1) ─────────────────────────────────────

console.log('\nRFC-0010 — Plain Expressions (v1.1)');

test('first player from players compiles to index 0', () => {
  assert(compile('show first player from players'), 'console.log(players[0]);');
});

test('last player from players compiles to last index', () => {
  assert(compile('show last player from players'), 'console.log(players[players.length - 1]);');
});

test('player one from players compiles to index 0 (one-based words)', () => {
  assert(compile('show player one from players'), 'console.log(players[0]);');
});

test('player four from players compiles to index 3', () => {
  assert(compile('show player four from players'), 'console.log(players[3]);');
});

test('player twenty from players compiles to index 19', () => {
  assert(compile('show player twenty from players'), 'console.log(players[19]);');
});

test('all twenty number words compile to one-based indexes', () => {
  const words = ['one','two','three','four','five','six','seven','eight','nine',
    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen',
    'eighteen','nineteen','twenty'];
  words.forEach((word, i) => {
    const js = compile(`show player ${word} from players`);
    if (!js.includes(`players[${i}]`)) {
      throw new Error(`"player ${word}" should compile to players[${i}] but got: ${js}`);
    }
  });
});

test('item expression works with any noun', () => {
  assert(compile('show first item from items'), 'console.log(items[0]);');
});

test('item expression works with an array literal collection', () => {
  assert(compile('show first item from ["a", "b"]'), 'console.log(["a", "b"][0]);');
});

test('item expression works with a member access collection', () => {
  assert(compile('show first item from team.players'), 'console.log(team.players[0]);');
});

test('item expression in a condition', () => {
  const js = compile('if first player from players is "Ayo"\n  show "yes"\ndone');
  if (!js.includes('players[0] === "Ayo"')) throw new Error('expected index condition');
});

test('item expression in arithmetic', () => {
  assert(compile('show first score from scores + 10'), 'console.log(scores[0] + 10);');
});

test('item expression as an assignment target', () => {
  assert(compile('first player from players becomes "Ayo"'), 'players[0] = "Ayo";');
});

test('numbered item expression as an assignment target', () => {
  assert(compile('player two from players becomes "Bola"'), 'players[1] = "Bola";');
});

test('last item expression as an assignment target', () => {
  assert(compile('last player from players becomes "Zed"'), 'players[players.length - 1] = "Zed";');
});

test('of-expression combining with an item expression', () => {
  assert(compile('show name of first player from players'), 'console.log(players[0].name);');
});

test('players length compiles to .length', () => {
  assert(compile('show players length'), 'console.log(players.length);');
});

test('length of players compiles to .length (of form)', () => {
  assert(compile('show length of players'), 'console.log(players.length);');
});

test('length in a condition', () => {
  const js = compile('if players length is 3\n  show "three"\ndone');
  if (!js.includes('players.length === 3')) throw new Error('expected length condition');
});

test('length works on a member expression', () => {
  assert(compile('show team.players length'), 'console.log(team.players.length);');
});

test('name of user compiles to property access', () => {
  assert(compile('show name of user'), 'console.log(user.name);');
});

test('name of user becomes compiles to assignment', () => {
  assert(compile('name of user becomes "Ayo"'), 'user.name = "Ayo";');
});

test('of-expression is right-associative', () => {
  assert(compile('show city of address of customer'), 'console.log(customer.address.city);');
});

test('nested of-expression becomes compiles to nested assignment', () => {
  assert(compile('city of address of customer becomes "Lagos"'), 'customer.address.city = "Lagos";');
});

test('of-expression as a collection operation argument', () => {
  assert(compile('add(name of user to names)'), 'names.push(user.name);');
});

test('of-expression as a function argument', () => {
  assert(compile('greet(name of user)'), 'greet(user.name);');
});

test('of-expression object can be an indexed value', () => {
  assert(compile('show name of users[0]'), 'console.log(users[0].name);');
});

test('of-expression errors when the left side is not a property word', () => {
  try {
    compile('show 5 of user');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('Expected a property name before "of"')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('add(item to collection) compiles to push', () => {
  assert(compile('add(player to players)'), 'players.push(player);');
});

test('remove(item from collection) compiles to splice', () => {
  assert(compile('remove(player from players)'), 'players.splice(players.indexOf(player), 1);');
});

test('add with a literal value', () => {
  assert(compile('add("Ayo" to players)'), 'players.push("Ayo");');
});

test('add with an item expression value', () => {
  assert(compile('add(first player from players to team)'), 'team.push(players[0]);');
});

test('remove with a property expression value', () => {
  assert(compile('remove(name of user from names)'), 'names.splice(names.indexOf(user.name), 1);');
});

test('remove with an item expression value', () => {
  assert(compile('remove(last player from players)'),
    'players.splice(players.indexOf(players[players.length - 1]), 1);');
});

test('remove with a numbered item value', () => {
  assert(compile('remove(player one from players)'), 'players.splice(players.indexOf(players[0]), 1);');
});

test('add works inside a for each loop', () => {
  const js = compile('for each item in items\n  add(item to seen)\ndone');
  if (!js.includes('seen.push(item)')) throw new Error('missing push in loop body');
});

test('add is still usable as a user function name (backward compat)', () => {
  const js = compile('make add(a, b)\n  give a + b\ndone\nshow add(2, 3)');
  if (!js.includes('function add(a, b)')) throw new Error('missing function declaration');
  if (!js.includes('add(2, 3)')) throw new Error('missing normal call');
});

test('length is still usable as a function (backward compat)', () => {
  assert(compile('show length(players)'), 'console.log((players).length);');
});

test('unknown special call form throws a helpful error', () => {
  try {
    compile('frobnicate(a to b)');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('not a valid Plain collection expression')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('contains compiles to includes (pre-existing v0.6)', () => {
  const js = compile('if players contains "Ayo"\n  show "found"\ndone');
  if (!js.includes('(players).includes("Ayo")')) throw new Error('expected includes');
});

test('contains works with a property expression', () => {
  const js = compile('if names contains name of user\n  show "found"\ndone');
  if (!js.includes('includes(user.name)')) throw new Error('expected includes with property');
});

test('read compiles to readFileSync with an fs prelude', () => {
  const js = compile('show read("users.txt")');
  if (!js.includes(`const fs = require('fs');`)) throw new Error('missing fs prelude');
  if (!js.includes(`fs.readFileSync("users.txt", 'utf8')`)) throw new Error('missing readFileSync');
});

test('read works with a variable path', () => {
  const js = compile('show read(filePath)');
  if (!js.includes(`fs.readFileSync(filePath, 'utf8')`)) throw new Error('missing readFileSync');
});

test('write(data to file) compiles to writeFileSync with an fs prelude', () => {
  const js = compile('write("hello" to "out.txt")');
  if (!js.includes(`const fs = require('fs');`)) throw new Error('missing fs prelude');
  if (!js.includes(`fs.writeFileSync("hello", "out.txt", 'utf8')`)) throw new Error('missing writeFileSync');
});

test('write works with a variable payload', () => {
  const js = compile('write(data to "out.txt")');
  if (!js.includes(`fs.writeFileSync(data, "out.txt", 'utf8')`)) throw new Error('missing writeFileSync');
});

test('readFile remains available (backward compat)', () => {
  const js = compile('show readFile("x.txt")');
  if (!js.includes(`fs.readFileSync("x.txt", 'utf8')`)) throw new Error('missing readFileSync');
});

test('read result feeds other stdlib functions', () => {
  const js = compile('show uppercase(read("notes.txt"))');
  if (!js.includes(`(fs.readFileSync("notes.txt", 'utf8')).toUpperCase()`)) {
    throw new Error(`missing nested read: ${js}`);
  }
});

test('first from players errors with a missing-noun hint', () => {
  try {
    compile('first from players');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('Expected a noun after "first"')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('last from players errors with a missing-noun hint', () => {
  try {
    compile('show last from players');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('Expected a noun after "last"')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('non-number word before "from" errors with a number-word hint', () => {
  try {
    compile('show player banana from players');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('Expected a number word after "player" before "from"')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('number words beyond twenty are rejected', () => {
  try {
    compile('show player twentyone from players');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!e.message.includes('Expected a number word')) {
      throw new Error(`unexpected message: ${e.message}`);
    }
  }
});

test('expressions compose in consecutive statements', () => {
  const js = compile('remember p as first player from players\nshow p length');
  if (!js.includes('let p = players[0]')) throw new Error('missing item remember');
  if (!js.includes('console.log(p.length)')) throw new Error('missing length');
});

test('expressions work inside while loops', () => {
  const js = compile('while players length is above 0\n  remove(last player from players)\ndone');
  if (!js.includes('while (players.length > 0)')) throw new Error('expected while condition');
  if (!js.includes('players.splice(players.indexOf(players[players.length - 1]), 1)')) {
    throw new Error('expected remove in loop body');
  }
});

test('expressions work inside functions', () => {
  const js = compile('make pick()\n  give first player from players\ndone');
  if (!js.includes('return players[0];')) throw new Error('expected return item');
});

test('expressions work across if-otherwise branches', () => {
  const js = compile('if players contains "Ayo"\n  show "yes"\notherwise\n  add("Ayo" to players)\ndone');
  if (!js.includes('(players).includes("Ayo")')) throw new Error('expected condition');
  if (!js.includes('players.push("Ayo")')) throw new Error('expected add in otherwise');
});

test('legacy array index syntax still works', () => {
  assert(compile('show players[0]'), 'console.log(players[0]);');
});

test('format: preserves plain expressions', () => {
  const src = 'show first player from players\nadd(player to players)\nshow name of user';
  const result = format(src);
  if (!result.includes('first player from players')) throw new Error('item expression changed');
  if (!result.includes('add(player to players)')) throw new Error('collection expression changed');
  if (!result.includes('name of user')) throw new Error('of-expression changed');
});

// ── RFC-0011 — JavaScript Gateway (v1.1.1-beta) ─────────────────────────────

console.log('\nRFC-0011 — JavaScript Gateway (v1.1.1-beta)');

// ── Lexer ───────────────────────────────────────────────────────────────────

test('tokenizes "javascript" as a block keyword', () => {
  const tokens = tokenize('remember x as javascript');
  if (tokens[3].type !== TOKEN.JAVASCRIPT_KW) throw new Error('javascript wrong');
});

test('collects raw JavaScript up to "done"', () => {
  const tokens = tokenize('remember r as javascript\n  const v = await f()\n  return v\ndone');
  if (tokens[3].type !== TOKEN.JAVASCRIPT_KW) throw new Error('javascript wrong');
  if (tokens[4].type !== TOKEN.JS_BODY) throw new Error('JS_BODY wrong');
  if (!tokens[4].value.includes('const v = await f()')) throw new Error('JS content missing');
  if (tokens[5].type !== TOKEN.DONE) throw new Error('DONE wrong');
});

test('tokenizes "ask" keyword', () => {
  const tokens = tokenize('ask name');
  if (tokens[0].type !== TOKEN.ASK) throw new Error('ask wrong');
});

test('tokenizes a hyphenated package name as a PACKAGE token', () => {
  const tokens = tokenize('use node-fetch');
  if (tokens[0].type !== TOKEN.USE) throw new Error('use wrong');
  if (tokens[1].type !== TOKEN.PACKAGE) throw new Error('expected PACKAGE token');
  if (tokens[1].value !== 'node-fetch') throw new Error('wrong package value');
});

test('tokenizes a scoped package name as a PACKAGE token', () => {
  const tokens = tokenize('use @scope/package-name');
  if (tokens[1].type !== TOKEN.PACKAGE) throw new Error('expected PACKAGE token');
  if (tokens[1].value !== '@scope/package-name') throw new Error('wrong package value');
});

// ── Parser ──────────────────────────────────────────────────────────────────

test('parses a JavaScript block to a JavaScriptBlock node', () => {
  const ast = parse(tokenize('remember result as javascript\n  await axios.get(url)\ndone'));
  const node = ast.body[0];
  if (node.type !== 'JavaScriptBlock') throw new Error('wrong node type');
  if (node.name !== 'result') throw new Error('wrong name');
  if (!node.body.includes('await axios.get(url)')) throw new Error('wrong body');
});

test('parses ask variable to an AskStatement', () => {
  const node = parse(tokenize('ask name')).body[0];
  if (node.type !== 'AskStatement') throw new Error('wrong node type');
  if (node.variable !== 'name') throw new Error('wrong variable');
  if (node.prompt !== undefined) throw new Error('bare ask should have no prompt');
});

test('parses ask with prompt to an AskStatement', () => {
  const node = parse(tokenize('ask "What is your name?" as name')).body[0];
  if (node.type !== 'AskStatement') throw new Error('wrong node type');
  if (node.variable !== 'name') throw new Error('wrong variable');
  if (node.prompt !== 'What is your name?') throw new Error('wrong prompt');
});

test('ask with a prompt requires "as"', () => {
  try {
    compile('ask "hi" name');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.toLowerCase().includes('as')) throw e;
  }
});

// ── Dependency detection (RFC-0011 §21) ────────────────────────────────────

test('detects arbitrary npm packages', () => {
  assert(JSON.stringify(detectDependencies('use axios')), '["axios"]');
  assert(JSON.stringify(detectDependencies('use dotenv')), '["dotenv"]');
  assert(JSON.stringify(detectDependencies('use bcrypt')), '["bcrypt"]');
  assert(JSON.stringify(detectDependencies('use sharp')), '["sharp"]');
});

test('detects multiple generic npm packages in order', () => {
  assert(JSON.stringify(detectDependencies('use axios\nuse dotenv\nuse bcrypt')),
    '["axios","dotenv","bcrypt"]');
});

test('deduplicates generic npm packages', () => {
  assert(JSON.stringify(detectDependencies('use axios\nuse axios\nuse dotenv')),
    '["axios","dotenv"]');
});

test('unknown valid package names are not rejected', () => {
  assert(JSON.stringify(detectDependencies('use semver')), '["semver"]');
});

test('node-fetch is detected as a dependency', () => {
  assert(JSON.stringify(detectDependencies('use node-fetch')), '["node-fetch"]');
});

test('generic packages imported from other files are deduplicated at bundle time', () => {
  const js = bundleFixture('gateway_imports_axios.pln');
  const count = (js.match(/require\('axios'\)/g) || []).length;
  if (count !== 1) throw new Error(`expected one axios require but got ${count}`);
  if (!js.includes('"gateway loaded"')) throw new Error('entry output missing');
});

// ── JavaScript blocks ───────────────────────────────────────────────────────

test('basic JavaScript block compiles to an async IIFE assignment', () => {
  assert(compile('remember result as javascript\n  const value = await something()\n  return value\ndone'),
    'let result = await (async () => {\n  const value = await something()\n  return value\n})();');
});

test('JavaScript block preserves statements and expressions verbatim', () => {
  const js = compile('remember data as javascript\n  const obj = { a: [1, 2, 3] }\n  items.forEach((x) => console.log(x))\n  try { run() } catch (e) { console.error(e) }\n  return obj\ndone');
  if (!js.includes('const obj = { a: [1, 2, 3] }')) throw new Error('object literal lost');
  if (!js.includes('items.forEach((x) => console.log(x))')) throw new Error('callback lost');
  if (!js.includes('try { run() } catch (e) { console.error(e) }')) throw new Error('try/catch lost');
});

test('JavaScript block supports async/await', () => {
  const js = compile('remember response as javascript\n  const data = await axios.get(url)\n  return data.data\ndone');
  if (!js.includes('await (async () => {')) throw new Error('missing async IIFE');
  if (!js.includes('await axios.get(url)')) throw new Error('missing await');
  if (!js.includes('return data.data')) throw new Error('missing return');
});

test('JavaScript block can read Plain variables in scope', () => {
  const js = compile('remember url as "https://api.example.com"\nremember response as javascript\n  return await axios.get(url)\ndone');
  if (!js.includes('axios.get(url)')) throw new Error('plain variable not visible inside JS block');
});

test('Plain code can use the result of a JavaScript block', () => {
  const js = compile('remember response as javascript\n  return 42\ndone\nshow response');
  if (!js.includes('let response = await (async () => {')) throw new Error('missing assignment');
  if (!js.includes('console.log(response)')) throw new Error('result not usable in Plain');
});

test('JavaScript block body is emitted verbatim (template literals preserved)', () => {
  const js = compile('remember t as javascript\n  return `hello\n  world`\ndone');
  if (!js.includes('return `hello')) throw new Error('template literal changed');
});

test('JavaScript block with invalid JS reports a JavaScript error', () => {
  try {
    compile('remember x as javascript\n  const = 5\ndone');
    throw new Error('should have thrown');
  } catch (e) {
    if (!e.message.includes('JavaScript error')) throw e;
    if (!e.message.includes('x')) throw new Error('should mention the variable name');
  }
});

test('JavaScript block inside a function makes the function async', () => {
  const js = compile('make fetch()\n  remember result as javascript\n    const v = await job()\n    return v\n  done\n  give result\ndone');
  if (!js.includes('async function fetch()')) throw new Error('function not async');
  if (!js.includes('await (async () => {')) throw new Error('missing async IIFE');
});

test('JavaScript block inside a route makes the handler async', () => {
  const js = compile('route "/data"\n  remember x as javascript\n    return 1\n  done\n  reply x\ndone');
  if (!js.includes('async (req, res) =>')) throw new Error('route handler not async');
});

test('functions without async blocks stay synchronous', () => {
  const js = compile('make greet()\n  show "hi"\ndone');
  if (js.includes('async function')) throw new Error('plain function unexpectedly async');
});

test('JavaScript block inside a while loop compiles inside the loop', () => {
  const js = compile('while x is above 0\n  remember v as javascript\n    return run(x)\n  done\n  x becomes x + 1\ndone');
  if (!js.includes('while (x > 0)')) throw new Error('missing while');
  if (!js.includes('await (async () => {')) throw new Error('missing JS block in loop');
});

// ── ask ─────────────────────────────────────────────────────────────────────

test('ask variable compiles to a readline prompt', () => {
  const js = compile('ask name');
  if (!js.includes('let name = await __ask("> ");')) throw new Error('missing ask statement');
});

test('ask with a prompt compiles to a prompted readline call', () => {
  const js = compile('ask "What is your name?" as name');
  if (!js.includes('let name = await __ask("What is your name?");')) throw new Error('missing prompted ask');
});

test('ask emits the readline runtime prelude once', () => {
  const js = compile('ask name\nask "age" as age');
  const count = (js.match(/const readline = require\('readline'\);/g) || []).length;
  if (count !== 1) throw new Error(`expected one readline prelude but got ${count}`);
  if (!js.includes('async function __ask')) throw new Error('missing __ask runtime');
});

test('ask inside a function makes the function async', () => {
  const js = compile('make greet()\n  ask name\n  show "Hello, " + name\ndone');
  if (!js.includes('async function greet()')) throw new Error('function not async');
  if (!js.includes('await __ask("> ")')) throw new Error('missing ask call');
});

test('ask inside a loop compiles inside the loop', () => {
  const js = compile('while x is above 0\n  ask "Next?" as name\n  x becomes x + 1\ndone');
  if (!js.includes('while (x > 0)')) throw new Error('missing while');
  if (!js.includes('await __ask("Next?")')) throw new Error('missing ask in loop');
});

test('ask result used in expressions', () => {
  const js = compile('ask "Age?" as age\nshow age + 1');
  if (!js.includes('console.log(age + 1)')) throw new Error('ask result not usable in expression');
});

// ── Async runtime wrapper ───────────────────────────────────────────────────

test('bundle wraps programs containing JavaScript blocks in an async runtime', () => {
  const js = bundleFixture('gateway_js.pln');
  if (!js.includes('(async () => {')) throw new Error('missing async wrapper');
  if (!js.includes('let response = await (async () => {')) throw new Error('missing JS block');
  if (!js.includes('console.log(response)')) throw new Error('missing show');
});

test('bundle wraps programs containing ask in an async runtime', () => {
  const js = bundleFixture('gateway_ask.pln');
  if (!js.includes('(async () => {')) throw new Error('missing async wrapper');
  if (!js.includes('await __ask("Name?")')) throw new Error('missing ask');
});

test('bundle does not wrap programs without async features', () => {
  const js = bundleFixture('uses_math.pln');
  if (js.includes('(async () => {')) throw new Error('unexpected async wrapper');
});

// ── Formatter ───────────────────────────────────────────────────────────────

test('format: preserves JavaScript block lines verbatim', () => {
  const src = 'remember result as javascript\n        const x = 1\n    return x\ndone';
  const result = format(src);
  if (!result.includes('        const x = 1')) throw new Error('JS line whitespace changed');
  if (!result.includes('    return x')) throw new Error('JS return line whitespace changed');
  if (!result.match(/^done/m)) throw new Error('"done" not dedented');
});

test('format: JavaScript block inside a function keeps outer indentation', () => {
  const src = 'make run()\nremember x as javascript\n        const v = 1\ndone\ndone';
  const result = format(src);
  if (!result.includes('    remember x as javascript')) throw new Error('block line not indented');
  if (!result.includes('        const v = 1')) throw new Error('JS body not preserved');
  if (!result.includes('    done')) throw new Error('inner done not at depth 1');
});

test('format: idempotent with JavaScript blocks', () => {
  const src = 'remember x as javascript\n    const v = 1\n    return v\ndone\nshow x';
  const once  = format(src);
  const twice = format(once);
  if (once !== twice) throw new Error('format not idempotent with JS blocks');
});

// ── Generic npm packages ────────────────────────────────────────────────────

test('use axios compiles to a require binding', () => {
  assert(compile('use axios'), 'const axios = require(\'axios\');');
});

test('use dotenv and use sharp compile to require bindings', () => {
  const js = compile('use dotenv\nuse sharp');
  if (!js.includes("require('dotenv')")) throw new Error('missing dotenv');
  if (!js.includes("require('sharp')")) throw new Error('missing sharp');
});

test('duplicate generic requires are emitted once', () => {
  const js = compile('use axios\nuse axios');
  const count = (js.match(/require\('axios'\)/g) || []).length;
  if (count !== 1) throw new Error(`expected one axios require but got ${count}`);
});

test('use sqlite still maps to better-sqlite3', () => {
  const js = compile('use sqlite');
  if (!js.includes("require('better-sqlite3')")) throw new Error('missing better-sqlite3');
});

test('use node-fetch compiles to a bare require', () => {
  assert(compile('use node-fetch'), "require('node-fetch');");
});

test('use @scope/package compiles to a bare require', () => {
  assert(compile('use @scope/package'), "require('@scope/package');");
});

test('use @scope/package-name compiles to a bare require', () => {
  assert(compile('use @scope/package-name'), "require('@scope/package-name');");
});

test('hyphenated and scoped packages compile alongside regular packages', () => {
  const js = compile('use axios\nuse node-fetch\nuse @scope/package');
  if (!js.includes("const axios = require('axios');")) throw new Error('missing axios binding');
  if (!js.includes("require('node-fetch');")) throw new Error('missing node-fetch');
  if (!js.includes("require('@scope/package');")) throw new Error('missing scoped package');
});

test('bundle: generic npm packages are detected and required', () => {
  const js = bundleFixture('uses_npm.pln');
  if (!js.includes("require('node-fetch');")) throw new Error('missing node-fetch');
  if (!js.includes("require('@scope/package-name');")) throw new Error('missing scoped package');
  if (!js.includes("require('dotenv');")) throw new Error('missing dotenv');
});

test('bundle: hyphenated packages imported from other files are deduplicated', () => {
  const js = bundleFixture('gateway_imports_npm.pln');
  const count = (js.match(/require\('node-fetch'\)/g) || []).length;
  if (count !== 1) throw new Error(`expected one node-fetch require but got ${count}`);
  if (!js.includes('"gateway loaded"')) throw new Error('entry output missing');
});

test('use node-fetch inside a loop body works', () => {
  const js = compile('while x is above 0\n  use node-fetch\n  x becomes x + 1\ndone');
  if (!js.includes("require('node-fetch');")) throw new Error('missing node-fetch in loop');
});

test('use @scope/package inside a function body works', () => {
  const js = compile('make load()\n  use @scope/package\n  show "loaded"\ndone');
  if (!js.includes("require('@scope/package');")) throw new Error('missing scoped package in function');
});

test('use node-fetch inside an if body works', () => {
  const js = compile('if x is 1\n  use node-fetch\ndone');
  if (!js.includes("require('node-fetch');")) throw new Error('missing node-fetch in if');
});

// ── Generic npm packages: aliases and version specs (v2.0.1) ───────────────

test('splitPackageSpec splits name and version range', () => {
  assert(JSON.stringify(splitPackageSpec('express')), JSON.stringify({ name: 'express', spec: null }));
  assert(JSON.stringify(splitPackageSpec('left-pad@^1.3.0')), JSON.stringify({ name: 'left-pad', spec: '^1.3.0' }));
  assert(JSON.stringify(splitPackageSpec('@scope/pkg')), JSON.stringify({ name: '@scope/pkg', spec: null }));
  assert(JSON.stringify(splitPackageSpec('@scope/pkg@2')), JSON.stringify({ name: '@scope/pkg', spec: '2' }));
});

test('use pkg as name binds the package to the alias', () => {
  assert(compile('use node-fetch as fetch'), "const fetch = require('node-fetch');");
});

test('use @scope/pkg as name and hyphenated as name bind aliases', () => {
  const js = compile('use @scope/pkg as scoped\nuse left-pad as pad');
  if (!js.includes("const scoped = require('@scope/pkg');")) throw new Error(`missing scoped alias:\n${js}`);
  if (!js.includes("const pad = require('left-pad');")) throw new Error(`missing pad alias:\n${js}`);
});

test('aliased packages are deduplicated by package and alias', () => {
  const js = compile('use dotenv as env\nuse dotenv as env');
  const count = (js.match(/require\('dotenv'\)/g) || []).length;
  if (count !== 1) throw new Error(`expected one dotenv require but got ${count}`);
  assert(compile('use semver\nuse semver as sem'),
    "const semver = require('semver');\nconst sem = require('semver');");
});

test('aliasing a built-in runtime package fails with guidance', () => {
  try {
    compile('use express as app');
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!/already available as "express"/.test(e.message)) throw new Error(`wrong error: ${e.message}`);
  }
});

test('an invalid alias fails with a clear error', () => {
  try {
    generate(parse(tokenize('use node-fetch as "quoted"')));
    throw new Error('expected an error but none was thrown');
  } catch (e) {
    if (!/variable name after "as"/.test(e.message)) throw new Error(`wrong error: ${e.message}`);
  }
});

test('version specs are lexed as part of the package token', () => {
  const tokens = tokenize('use left-pad@^1.3.0');
  if (tokens[1].type !== TOKEN.PACKAGE) throw new Error(`type: ${tokens[1].type}`);
  if (tokens[1].value !== 'left-pad@^1.3.0') throw new Error(`value: ${tokens[1].value}`);
});

test('version specs are stripped for require()', () => {
  assert(compile('use left-pad@^1.3.0'), "require('left-pad');");
  const js = compile('use dotenv@16 as env');
  if (!js.includes("const env = require('dotenv');")) throw new Error(`spec leaked into require:\n${js}`);
});

test('known packages keep their canonical binding when versioned', () => {
  assert(compile('use sqlite@7'), `const Database = require('better-sqlite3');`);
});

test('detect keeps version specs and maps friendly names through them', () => {
  assert(JSON.stringify(detectDependencies('use left-pad@^1.3.0')), '["left-pad@^1.3.0"]');
  assert(JSON.stringify(detectDependencies('use sqlite@7')), '["better-sqlite3@7"]');
  assert(JSON.stringify(detectDependencies('use @scope/pkg@1')), '["@scope/pkg@1"]');
});

test('hyphenated package require inside a JavaScript block is preserved verbatim', () => {
  const js = compile('remember f as javascript\n  const mod = require("node-fetch")\n  return mod\ndone');
  if (!js.includes('require("node-fetch")')) throw new Error('JS block content changed');
});

// ── CLI ─────────────────────────────────────────────────────────────────────

test('plain help includes the JavaScript Gateway', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('JavaScript')) throw new Error('"JavaScript" missing from help');
  if (!out.includes('ask')) throw new Error('"ask" missing from help');
});

test('plain version shows 2.0.0-latest', () => {
  const out = runCli(['version'], process.cwd());
  if (!out.includes('2.0.0-latest')) throw new Error(`Expected 2.0.0-latest but got: ${out}`);
});

test('plain build produces executable async output for a JavaScript block', () => {
  const dir = tmpDir();
  const plnFile = path.join(dir, 'gw.pln');
  fs.writeFileSync(plnFile, 'remember x as javascript\n  return 1\ndone\nshow x\n');
  runCli(['build', plnFile], dir);
  const js = fs.readFileSync(path.join(dir, 'gw.js'), 'utf8');
  if (!js.includes('(async () => {')) throw new Error('build output not wrapped');
  if (!js.includes('let x = await (async () => {')) throw new Error('JS block missing in build');
});

test('plain run on a nonexistent file reports a friendly error and does not invoke AI', () => {
  const dir = tmpDir();
  const out = runCli(['run', 'missing.pln'], dir);
  if (!out.includes('File not found')) {
    throw new Error(`Expected a "File not found" error but got: ${out}`);
  }
  if (out.includes('Complex Compilation') && !out.includes('trying Complex Compilation')) {
    throw new Error(`Complex Compilation must not be invoked for a missing file. Output:\n${out}`);
  }
});

// ── Regression: project-local dependency resolution ────────────────────────

// Fabricate an "installed" package inside a project's node_modules without
// hitting the network, so isInstalled() (require.resolve) treats it as present.
function writeLocalPackage(projectDir, pkgName, mainSrc) {
  const pkgDir = path.join(projectDir, 'node_modules', pkgName);
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: pkgName, version: '1.0.0', main: 'index.js' })
  );
  fs.writeFileSync(path.join(pkgDir, 'index.js'), mainSrc);
}

test('plain run resolves dependencies from the project node_modules, not the global install', () => {
  const dir = tmpDir();
  writeLocalPackage(dir, 'plainlocaltest', 'module.exports = "resolved-from-project-node_modules";\n');
  fs.writeFileSync(path.join(dir, 'app.pln'), 'use plainlocaltest\nshow plainlocaltest\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('resolved-from-project-node_modules')) {
    throw new Error(`local dependency did not resolve from the project. Output:\n${out}`);
  }
  const stale = path.join(__dirname, '..', 'compiler', '_plain_out.js');
  if (fs.existsSync(stale)) {
    throw new Error('_plain_out.js was written into the compiler directory');
  }
});

test('plain start resolves project-local dependencies via the plain.json entry', () => {
  const dir = tmpDir();
  writeLocalPackage(dir, 'plainlocaltest', 'module.exports = "start-resolved-locally";\n');
  fs.writeFileSync(path.join(dir, 'app.pln'), 'use plainlocaltest\nshow plainlocaltest\n');
  fs.writeFileSync(path.join(dir, 'plain.json'), JSON.stringify({ entry: 'app.pln' }));
  const out = runCli(['start'], dir);
  if (!out.includes('start-resolved-locally')) {
    throw new Error(`plain start did not resolve the local dependency. Output:\n${out}`);
  }
});

test('hyphenated packages resolve at runtime from the project node_modules', () => {
  const dir = tmpDir();
  const marker = path.join(dir, 'hyphenated-loaded.txt');
  writeLocalPackage(dir, 'plain-fake-fetch',
    `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ok');\nmodule.exports = {};\n`);
  fs.writeFileSync(path.join(dir, 'app.pln'), 'use plain-fake-fetch\nshow "hyphenated-ok"\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('hyphenated-ok')) throw new Error(`run failed. Output:\n${out}`);
  if (!fs.existsSync(marker)) {
    throw new Error('hyphenated package was not loaded from the project node_modules');
  }
});

test('scoped packages resolve at runtime from the project node_modules', () => {
  const dir = tmpDir();
  const marker = path.join(dir, 'scoped-loaded.txt');
  writeLocalPackage(dir, '@fakescope/pkg',
    `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ok');\nmodule.exports = {};\n`);
  fs.writeFileSync(path.join(dir, 'app.pln'), 'use @fakescope/pkg\nshow "scoped-ok"\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('scoped-ok')) throw new Error(`run failed. Output:\n${out}`);
  if (!fs.existsSync(marker)) {
    throw new Error('scoped package was not loaded from the project node_modules');
  }
});

test('multiple project-local dependencies resolve at runtime', () => {
  const dir = tmpDir();
  writeLocalPackage(dir, 'plainfirst', 'module.exports = "first";\n');
  writeLocalPackage(dir, 'plainsecond', 'module.exports = "second";\n');
  fs.writeFileSync(path.join(dir, 'app.pln'),
    'use plainfirst\nuse plainsecond\nshow plainfirst + " " + plainsecond\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('first second')) throw new Error(`multiple deps did not resolve. Output:\n${out}`);
});

test('multi-file projects resolve project-local dependencies at runtime', () => {
  const dir = tmpDir();
  writeLocalPackage(dir, 'plainlocaltest', 'module.exports = "from-multifile";\n');
  fs.writeFileSync(path.join(dir, 'lib.pln'), 'make version()\n  give "v2"\ndone\n');
  fs.writeFileSync(path.join(dir, 'app.pln'),
    'import "./lib.pln"\nuse plainlocaltest\nshow plainlocaltest + " " + version()\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('from-multifile v2')) throw new Error(`multi-file run failed. Output:\n${out}`);
});

test('built-in modules still execute after the dependency-resolution fix', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'note.txt'), 'hello-builtin');
  fs.writeFileSync(path.join(dir, 'app.pln'),
    'use fs\nremember content as readFile("note.txt")\nshow content\n');
  const out = runCli(['run', 'app.pln'], dir);
  if (!out.includes('hello-builtin')) throw new Error(`built-in fs failed. Output:\n${out}`);
});

// ── CLI: doctor, update, start, cc commands ──────────────────────────────────

console.log('\nCLI — plain doctor');

test('plain doctor exits 0 and prints environment checks', () => {
  const dir = tmpDir();
  const out = runCli(['doctor'], dir);
  if (!out.includes('Plain doctor')) throw new Error(`Expected "Plain doctor" header but got: ${out}`);
  if (!out.includes('Node.js')) throw new Error('Expected Node.js check');
  if (!out.includes('npm')) throw new Error('Expected npm check');
  if (!out.includes('Plain CLI')) throw new Error('Expected Plain CLI check');
  if (!out.includes('Compiler')) throw new Error('Expected Compiler check');
  if (!out.includes('Formatter')) throw new Error('Expected Formatter check');
  if (!out.includes('Runtime')) throw new Error('Expected Runtime check');
  if (!out.includes('Rules')) throw new Error('Expected Rules check');
  if (!out.includes('Complex Compilation provider')) throw new Error('Expected CC provider check');
  if (!out.includes('Translation cache')) throw new Error('Expected cache check');
});

test('plain doctor reports project configuration when plain.json exists', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['doctor'], dir);
  if (!out.includes('plain.json found')) throw new Error(`Expected "plain.json found" but got: ${out}`);
});

test('plain doctor reports missing plain.json when no project initialized', () => {
  const dir = tmpDir();
  const out = runCli(['doctor'], dir);
  if (!out.includes('run plain init')) throw new Error(`Expected "run plain init" hint but got: ${out}`);
});

test('plain doctor reports missing entry file', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const entry = path.join(dir, 'app.pln');
  fs.unlinkSync(entry);
  const out = runCli(['doctor'], dir);
  if (!out.includes('not found')) throw new Error(`Expected "not found" for entry file but got: ${out}`);
});

test('plain doctor reports ready dependencies when all installed', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  fs.writeFileSync(path.join(dir, 'app.pln'), 'show "hello"\n');
  const out = runCli(['doctor'], dir);
  if (!out.includes('ready')) throw new Error(`Expected "ready" for dependencies but got: ${out}`);
});

test('plain help includes "plain doctor"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain doctor')) throw new Error('"plain doctor" missing from help');
});

console.log('\nCLI — plain start');

test('plain start errors without plain.json', () => {
  const dir = tmpDir();
  const out = runCli(['start'], dir);
  if (!out.toLowerCase().includes('plain init')) {
    throw new Error(`Expected hint to run "plain init" but got: ${out}`);
  }
});

test('plain start errors when entry file is missing', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const entry = path.join(dir, 'app.pln');
  fs.unlinkSync(entry);
  const out = runCli(['start'], dir);
  if (!out.includes('not found')) {
    throw new Error(`Expected "not found" error but got: ${out}`);
  }
});

test('plain start runs the entry file from plain.json', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'app.pln'), 'show "start-ok"\n');
  fs.writeFileSync(path.join(dir, 'plain.json'), JSON.stringify({ entry: 'app.pln' }));
  const out = runCli(['start'], dir);
  if (!out.includes('start-ok')) {
    throw new Error(`Expected "start-ok" output but got: ${out}`);
  }
});

test('plain start defaults to app.pln when entry is not set', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'app.pln'), 'show "default-entry"\n');
  fs.writeFileSync(path.join(dir, 'plain.json'), JSON.stringify({ name: 'test' }));
  const out = runCli(['start'], dir);
  if (!out.includes('default-entry')) {
    throw new Error(`Expected "default-entry" output but got: ${out}`);
  }
});

console.log('\nCLI — plain update');

test('plain update runs npm update', () => {
  const dir = tmpDir();
  runCli(['init'], dir);
  const out = runCli(['update'], dir);
  if (!out.includes('Updating packages')) throw new Error(`Expected "Updating packages" but got: ${out}`);
  if (!out.includes('updated')) throw new Error(`Expected "updated" confirmation but got: ${out}`);
});

test('plain help includes "plain update"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain update')) throw new Error('"plain update" missing from help');
});

console.log('\nCLI — plain cc / ai commands');

test('plain cc status shows Complex Compilation status', () => {
  const out = runCli(['cc', 'status'], process.cwd());
  if (!out.includes('Complex Compilation')) throw new Error(`Expected "Complex Compilation" but got: ${out}`);
  if (!out.includes('Compilation path')) throw new Error('Expected "Compilation path" check');
  if (!out.includes('Rules')) throw new Error('Expected Rules check');
  if (!out.includes('Cache')) throw new Error('Expected Cache check');
});

test('plain ai status is an alias for plain cc status', () => {
  const out = runCli(['ai', 'status'], process.cwd());
  if (!out.includes('Complex Compilation')) throw new Error(`Expected "Complex Compilation" from ai alias but got: ${out}`);
});

test('plain cc rules lists installed rules', () => {
  const out = runCli(['cc', 'rules'], process.cwd());
  if (!out.includes('Plain rules')) throw new Error(`Expected "Plain rules" header but got: ${out}`);
  // Should list at least one rule
  if (out.includes('No rules found') && !out.includes('rules')) {
    throw new Error('Expected at least one rule listed');
  }
});

test('plain ai rules is an alias for plain cc rules', () => {
  const out = runCli(['ai', 'rules'], process.cwd());
  if (!out.includes('Plain rules')) throw new Error(`Expected "Plain rules" from ai alias but got: ${out}`);
});

test('plain cc cache lists or reports empty cache', () => {
  const out = runCli(['cc', 'cache'], process.cwd());
  if (!out.includes('AI translation cache')) throw new Error(`Expected "AI translation cache" but got: ${out}`);
});

test('plain cc cache clear clears the cache', () => {
  const out = runCli(['cc', 'cache', 'clear'], process.cwd());
  if (!out.includes('Cleared')) throw new Error(`Expected "Cleared" confirmation but got: ${out}`);
});

test('plain ai cache is an alias for plain cc cache', () => {
  const out = runCli(['ai', 'cache'], process.cwd());
  if (!out.includes('AI translation cache')) throw new Error(`Expected "AI translation cache" from ai alias but got: ${out}`);
});

test('plain cc with invalid subcommand shows usage', () => {
  const out = runCli(['cc', 'invalid'], process.cwd());
  if (!out.toLowerCase().includes('usage')) throw new Error(`Expected usage message but got: ${out}`);
});

test('plain help includes "plain cc status"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain cc status')) throw new Error('"plain cc status" missing from help');
});

test('plain help includes "plain cc cache clear"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain cc cache clear')) throw new Error('"plain cc cache clear" missing from help');
});

test('plain help includes "plain start"', () => {
  const out = runCli(['help'], process.cwd());
  if (!out.includes('plain start')) throw new Error('"plain start" missing from help');
});

// ── Acode syntax highlighting (stream spec) ─────────────────────────────────

// The Acode plugin wraps plain-acode/stream-spec.js in CodeMirror's
// StreamLanguage. That spec is pure CommonJS, so we can exercise the exact
// tokenizer here in Node. The shim below mirrors @codemirror/language's
// StringStream (line-based) and its drive loop, so these tests reflect what
// Acode's editor will actually highlight.

const streamSpec = require('../plain-acode/stream-spec.js');

class StringStream {
  constructor(string) {
    this.string = string;
    this.pos = 0;
    this.start = 0;
  }
  eol() { return this.pos >= this.string.length; }
  sol() { return this.pos === 0; }
  peek() { return this.string.charAt(this.pos) || undefined; }
  next() {
    if (this.pos < this.string.length) return this.string.charAt(this.pos++);
  }
  eat(match) {
    const ch = this.string.charAt(this.pos);
    let ok;
    if (typeof match === 'string') ok = ch === match;
    else ok = ch && (match instanceof RegExp ? match.test(ch) : match(ch));
    if (ok) { this.pos++; return ch; }
  }
  eatWhile(match) {
    const start = this.pos;
    while (this.eat(match)) { /* keep going */ }
    return this.pos > start;
  }
  eatSpace() {
    return this.eatWhile(/[\s\u00a0]/);
  }
  skipToEnd() { this.pos = this.string.length; }
  skipTo(ch) {
    const found = this.string.indexOf(ch, this.pos);
    if (found > -1) { this.pos = found; return true; }
  }
  backUp(n) { this.pos = Math.max(0, this.pos - n); }
  match(pattern, consume, caseInsensitive) {
    if (typeof pattern === 'string') {
      const cased = (s) => (caseInsensitive ? s.toLowerCase() : s);
      const sub = this.string.substr(this.pos, pattern.length);
      if (cased(sub) === cased(pattern)) {
        if (consume !== false) this.pos += pattern.length;
        return true;
      }
      return null;
    }
    const m = this.string.slice(this.pos).match(pattern);
    if (m && m.index > 0) return null;
    if (m && consume !== false) this.pos += m[0].length;
    return m;
  }
  current() { return this.string.slice(this.start, this.pos); }
}

// Drive the stream spec exactly like @codemirror/language does: one
// StringStream per line, token() called until end-of-line.
function highlight(source) {
  const state = streamSpec.startState(4);
  const tokens = [];
  for (const line of source.split('\n')) {
    const stream = new StringStream(line);
    while (!stream.eol()) {
      stream.start = stream.pos;
      const type = streamSpec.token(stream, state);
      if (type) tokens.push({ type, text: stream.current() });
    }
  }
  return tokens;
}

function highlightType(source, text) {
  const tokens = highlight(source);
  for (const token of tokens) {
    if (token.text === text) return token.type;
  }
  return null;
}

function highlightLastType(source, text) {
  const tokens = highlight(source);
  let type = null;
  for (const token of tokens) {
    if (token.text === text) type = token.type;
  }
  return type;
}

// The exact set of legacy token names the spec may emit. StreamLanguage
// resolves these against the tokenTable in plain-acode/main.js.
const ALLOWED_TOKENS = new Set([
  'keyword', 'operator', 'string', 'string-2', 'number', 'comment',
  'variable', 'property', 'function', 'builtin', 'atom', 'meta',
  'punctuation', 'invalid',
]);

console.log('\nAcode syntax highlighting (stream spec)');

test('highlight: keywords, variables, strings, numbers, comments', () => {
  const src = [
    'remember name as "World"',
    'show "Hello, " + name + "!"',
    '// a comment',
    'note: a documentation comment',
    'remember pi as 3.14',
  ].join('\n');
  if (highlightType(src, 'remember') !== 'keyword') throw new Error('remember not keyword');
  if (highlightType(src, 'name') !== 'variable') throw new Error('name not variable');
  if (highlightType(src, 'as') !== 'operator') throw new Error('as not operator');
  if (highlightType(src, '"World"') !== 'string') throw new Error('string not string');
  if (highlightType(src, 'show') !== 'keyword') throw new Error('show not keyword');
  if (highlightType(src, '// a comment') !== 'comment') throw new Error('comment not comment');
  if (highlightType(src, 'note: a documentation comment') !== 'comment') {
    throw new Error('note: documentation comment not comment');
  }
  if (highlightType(src, '3.14') !== 'number') throw new Error('number not number');
  if (highlightType(src, 'pi') !== 'variable') throw new Error('pi not variable');
});

test('highlight: control flow and block delimiters', () => {
  const src = [
    'if score is at least 90',
    '  show "A grade"',
    'otherwise',
    '  show "B grade"',
    'done',
  ].join('\n');
  for (const word of ['if', 'otherwise', 'done', 'show']) {
    if (highlightType(src, word) !== 'keyword') {
      throw new Error(`control word "${word}" not keyword`);
    }
  }
});

test('highlight: multi-word comparison phrases are operators', () => {
  const src = [
    'is above', 'is below', 'is at least', 'is at most', 'is not',
    'is empty', 'is not empty', 'contains', 'starts with', 'ends with',
    'between 80 and 89', 'is greater than', 'is less than',
  ].join('\n');
  for (const word of ['is', 'above', 'below', 'at', 'least', 'most', 'not',
    'empty', 'contains', 'starts', 'ends', 'with', 'between', 'and',
    'greater', 'less', 'than']) {
    if (highlightType(src, word) !== 'operator') {
      throw new Error(`comparison word "${word}" not operator`);
    }
  }
});

test('highlight: route paths are special strings', () => {
  const src = [
    'route "/"',
    '  reply "Hello from Plain!"',
    'done',
    'when someone visits "/api/status"',
    '  reply json',
    '    status is "ok"',
    '    version is "1.0"',
    '  done',
    'done',
  ].join('\n');
  if (highlightType(src, '"/"') !== 'string-2') throw new Error('route root path not string-2');
  if (highlightType(src, '"/api/status"') !== 'string-2') throw new Error('route path not string-2');
  if (highlightType(src, '"Hello from Plain!"') !== 'string') throw new Error('reply string not plain string');
  for (const word of ['route', 'visits', 'json']) {
    if (highlightType(src, word) !== 'keyword') throw new Error(`${word} not keyword`);
  }
});

test('highlight: web app shorthand and listen', () => {
  const src = [
    'web app',
    'listen on 3000',
    '  show "Server running"',
    'done',
  ].join('\n');
  for (const word of ['web', 'app', 'listen', 'on']) {
    if (highlightType(src, word) !== 'keyword') throw new Error(`${word} not keyword`);
  }
  if (highlightType(src, '3000') !== 'number') throw new Error('port not number');
});

test('highlight: use statements highlight module names as builtins', () => {
  const src = [
    'use express',
    'use node-fetch',
    'use @scope/package-name',
    'use fs',
  ].join('\n');
  if (highlightType(src, 'use') !== 'keyword') throw new Error('use not keyword');
  for (const pkg of ['express', 'node-fetch', '@scope/package-name', 'fs']) {
    if (highlightType(src, pkg) !== 'builtin') throw new Error(`package ${pkg} not builtin`);
  }
});

test('highlight: stdlib calls are builtins, user calls are functions', () => {
  const src = [
    'make greet(name)',
    '  give "Hello, " + name',
    'done',
    'greet("World")',
    'remember encoded as jsonEncode(user)',
    'show readFile("a.txt")',
  ].join('\n');
  if (highlightType(src, 'make') !== 'keyword') throw new Error('make not keyword');
  if (highlightType(src, 'give') !== 'keyword') throw new Error('give not keyword');
  if (highlightType(src, 'greet') !== 'function') throw new Error('function name not function');
  for (const call of ['jsonEncode', 'readFile']) {
    if (highlightType(src, call) !== 'builtin') throw new Error(`stdlib call ${call} not builtin`);
  }
});

test('highlight: v1.1 expression words and number words', () => {
  const src = [
    'show first player from players',
    'show player three from players',
    'show players length',
    'show name of user',
    'add("Palmer" to players)',
    'remove("Foden" from players)',
    'write("Saved" to "notes.txt")',
  ].join('\n');
  for (const word of ['first', 'from', 'of', 'to']) {
    if (highlightType(src, word) !== 'operator') {
      throw new Error(`expression word "${word}" not operator`);
    }
  }
  if (highlightType(src, 'length') !== 'operator') throw new Error('postfix length not operator');
  if (highlightType(src, 'three') !== 'number') throw new Error('number word "three" not number');
  if (highlightType(src, 'add') !== 'function') throw new Error('add not function');
  if (highlightType(src, 'remove') !== 'function') throw new Error('remove not function');
  if (highlightType(src, 'write') !== 'builtin') throw new Error('write not builtin');
  if (highlightType(src, 'players') !== 'variable') throw new Error('players not variable');
});

test('highlight: database and SQL blocks', () => {
  const src = [
    'database "app.db"',
    'execute',
    '  CREATE TABLE IF NOT EXISTS users (id INTEGER)',
    'done',
    'query',
    '  SELECT * FROM users',
    'done',
  ].join('\n');
  if (highlightType(src, 'database') !== 'keyword') throw new Error('database not keyword');
  if (highlightType(src, 'execute') !== 'keyword') throw new Error('execute not keyword');
  if (highlightType(src, 'query') !== 'keyword') throw new Error('query not keyword');
  const tokens = highlight(src);
  if (!tokens.some((t) => t.type === 'meta' && t.text.includes('CREATE TABLE'))) {
    throw new Error('execute body not highlighted as meta');
  }
  if (!tokens.some((t) => t.type === 'meta' && t.text.includes('SELECT * FROM'))) {
    throw new Error('query body not highlighted as meta');
  }
});

test('highlight: javascript gateway block highlights JS inside and Plain after', () => {
  const src = [
    'remember response as javascript',
    '  const value = 42',
    '  return value',
    'done',
    'show response',
  ].join('\n');
  if (highlightType(src, 'javascript') !== 'keyword') throw new Error('javascript not keyword');
  for (const word of ['const', 'return']) {
    if (highlightType(src, word) !== 'keyword') throw new Error(`JS word "${word}" not keyword in block`);
  }
  if (highlightType(src, '42') !== 'number') throw new Error('JS number not number');
  if (highlightLastType(src, 'done') !== 'keyword') throw new Error('gateway done not keyword');
  if (highlightType(src, 'show') !== 'keyword') throw new Error('Plain after gateway not highlighted');
});

test('highlight: only a line exactly equal to done terminates the JS block', () => {
  const src = [
    'remember x as javascript',
    '  const done = 1',
    '  return done',
    'done',
  ].join('\n');
  if (highlightType(src, 'const') !== 'keyword') throw new Error('const not keyword in block');
  if (highlightType(src, 'return') !== 'keyword') throw new Error('return not keyword in block');
  if (highlightType(src, 'done') !== 'variable') throw new Error('JS variable named done mis-typed');
  if (highlightLastType(src, 'done') !== 'keyword') throw new Error('terminator done not keyword');
});

test('highlight: JS operators inside javascript blocks (incl. slash operators)', () => {
  const src = [
    'remember ratio as javascript',
    '  let total = 10',
    '  total /= 2',
    '  total %= 3',
    '  const half = total / 2',
    '  const ok = (total === 5) && (total != 0)',
    '  return total <= 5 ? "yes" : "no"',
    'done',
  ].join('\n');
  for (const op of ['=', '/=', '%=', '/', '===', '!=', '&', '<=', '?', ':']) {
    if (highlightType(src, op) !== 'operator') {
      throw new Error(`JS operator "${op}" not operator`);
    }
  }
  for (const word of ['let', 'const', 'return']) {
    if (highlightType(src, word) !== 'keyword') throw new Error(`JS keyword "${word}" not keyword`);
  }
});

test('highlight: atoms, invalid characters, and operator set', () => {
  const src = [
    'remember isStudent as true',
    'show age + 1',
    'remember x as y;',
  ].join('\n');
  if (highlightType(src, 'true') !== 'atom') throw new Error('true not atom');
  if (highlightType(src, '+') !== 'operator') throw new Error('+ not operator');
  if (highlightType(src, ';') !== 'invalid') throw new Error('; should be invalid in Plain');
});

test('highlight: atoms null and undefined', () => {
  const src = [
    'remember x as null',
    'remember y as undefined',
  ].join('\n');
  if (highlightType(src, 'null') !== 'atom') throw new Error('null not atom');
  if (highlightType(src, 'undefined') !== 'atom') throw new Error('undefined not atom');
});

test('highlight: template strings (backtick) are string-2', () => {
  const src = 'show `Hello World`';
  if (highlightType(src, '`Hello World`') !== 'string-2') {
    throw new Error('template string not string-2');
  }
});

test('highlight: template strings with interpolation', () => {
  const src = 'remember msg as `Hello ${name}!`';
  const tokens = highlight(src);
  // The `${` triggers an interpolation — it should appear in an operator token
  const opToken = tokens.find(t => t.type === 'operator' && t.text.includes('${'));
  if (!opToken) throw new Error('${} interpolation not in operator token');
  // The closing `}` is punctuation
  if (highlightType(src, '}') !== 'punctuation') {
    throw new Error('} closing interpolation not punctuation');
  }
  // The variable inside `${...}` is highlighted as a variable
  if (highlightType(src, 'name') !== 'variable') {
    throw new Error('interpolated variable not variable');
  }
});

test('highlight: multiline template strings', () => {
  const src = [
    'remember msg as `line1',
    'line2',
    'line3`',
  ].join('\n');
  const tokens = highlight(src);
  const strings = tokens.filter(t => t.type === 'string-2');
  if (strings.length < 1) {
    throw new Error('multiline template string not highlighted');
  }
});

test('highlight: template string closing backtick resets to Plain', () => {
  const src = [
    'show `hello`',
    'show "world"',
  ].join('\n');
  if (highlightType(src, '`hello`') !== 'string-2') {
    throw new Error('template string not string-2');
  }
  if (highlightType(src, '"world"') !== 'string') {
    throw new Error('string after template not string');
  }
});

test('highlight: every emitted token type is a known legacy token', () => {
  const files = [
    'hello.pln', 'variables.pln', 'conditions.pln', 'expressions.pln',
    'loops.pln', 'functions.pln', 'stdlib.pln', 'web-server.pln',
    'database.pln',
  ].map((name) => path.join(__dirname, '..', 'samples', name)).concat([
    path.join(__dirname, 'fixtures', 'gateway_js.pln'),
    path.join(__dirname, 'fixtures', 'gateway_ask.pln'),
  ]);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of highlight(source)) {
      if (!ALLOWED_TOKENS.has(token.type)) {
        throw new Error(`${file}: unknown token type ${token.type}`);
      }
    }
  }
});

// ── Acode plugin loading (editorLanguages / aceModes) ────────────────────────

const {
  PlainLanguagePlugin,
  LANGUAGE_NAME,
  EXTENSIONS,
} = require('../plain-acode/main.js');

// The suite's test() helper is synchronous, so plugin tests that await the
// async init() run through this helper and are joined with the summary below.
const pendingPluginTests = [];
let lastPluginTest = Promise.resolve();

function testAsync(name, fn) {
  const run = () => fn().then(
    () => { console.log(`  PASS  ${name}`); passed++; },
    (e) => { console.log(`  FAIL  ${name}`); console.log(`        ${e.message}`); failed++; },
  );
  lastPluginTest = lastPluginTest.then(run, run);
  pendingPluginTests.push(lastPluginTest);
}

function makeMockAcode(modules) {
  return {
    require(name) {
      return Object.prototype.hasOwnProperty.call(modules, name) ? modules[name] : undefined;
    },
  };
}

const cmLanguageMock = { StreamLanguage: { define: (spec) => ({ spec }) } };
const lezerHighlightMock = {
  tags: {
    function: (t) => t,
    standard: (t) => t,
    special: (t) => t,
    variableName: 'variableName',
    string: 'string',
    propertyName: 'propertyName',
    meta: 'meta',
    atom: 'atom',
    invalid: 'invalid',
  },
};

console.log('\nAcode plugin loading (editorLanguages / aceModes)');

testAsync('plugin: registers via modern editorLanguages when available', async () => {
  let call = null;
  const acode = makeMockAcode({
    editorLanguages: {
      register(name, extensions, caption, loader) {
        call = { name, extensions, caption, loader };
        return Promise.resolve();
      },
      unregister() {},
    },
    '@codemirror/language': cmLanguageMock,
    '@lezer/highlight': lezerHighlightMock,
  });
  const plugin = new PlainLanguagePlugin(acode);
  const usedPath = await plugin.init();
  if (usedPath !== 'editorLanguages') throw new Error('init did not use editorLanguages');
  if (!call) throw new Error('editorLanguages.register was not called');
  if (call.name !== LANGUAGE_NAME) throw new Error(`unexpected mode name: ${call.name}`);
  if (JSON.stringify(call.extensions) !== JSON.stringify(EXTENSIONS)) {
    throw new Error(`unexpected extensions: ${JSON.stringify(call.extensions)}`);
  }
  const language = await call.loader();
  if (!Array.isArray(language) || !language[0] || !language[0].spec) {
    throw new Error('loader did not return a StreamLanguage extension');
  }
  if (language[0].spec.name !== 'plain') throw new Error('loader returned the wrong spec');
});

testAsync('plugin: falls back to legacy aceModes when editorLanguages is missing', async () => {
  let call = null;
  const acode = makeMockAcode({
    aceModes: {
      addMode(name, extensions, caption) {
        call = { name, extensions, caption };
        return Promise.resolve();
      },
      removeMode() {},
    },
  });
  const plugin = new PlainLanguagePlugin(acode);
  const usedPath = await plugin.init();
  if (usedPath !== 'aceModes') throw new Error('init did not fall back to aceModes');
  if (!call) throw new Error('aceModes.addMode was not called');
  if (call.name !== LANGUAGE_NAME) throw new Error(`unexpected mode name: ${call.name}`);
  if (JSON.stringify(call.extensions) !== JSON.stringify(EXTENSIONS)) {
    throw new Error(`unexpected extensions: ${JSON.stringify(call.extensions)}`);
  }
});

testAsync('plugin: fails gracefully when neither API is available', async () => {
  const acode = makeMockAcode({});
  const plugin = new PlainLanguagePlugin(acode);
  let error = null;
  try {
    await plugin.init();
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error('init resolved even though neither API is available');
  if (!error.message.includes('editorLanguages') || !error.message.includes('aceModes')) {
    throw new Error(`error message is not descriptive: ${error.message}`);
  }
  if (plugin.registration !== null) throw new Error('failed init left a registration behind');
});

testAsync('plugin: cleanup after modern editorLanguages registration', async () => {
  let unregistered = null;
  const acode = makeMockAcode({
    editorLanguages: {
      register() { return Promise.resolve(); },
      unregister(name) { unregistered = name; },
    },
    '@codemirror/language': cmLanguageMock,
    '@lezer/highlight': lezerHighlightMock,
  });
  const plugin = new PlainLanguagePlugin(acode);
  await plugin.init();
  plugin.destroy();
  if (unregistered !== LANGUAGE_NAME) {
    throw new Error('editorLanguages.unregister was not called with the mode name');
  }
});

testAsync('plugin: cleanup after legacy aceModes registration', async () => {
  let removed = null;
  const acode = makeMockAcode({
    aceModes: {
      addMode() { return Promise.resolve(); },
      removeMode(name) { removed = name; },
    },
  });
  const plugin = new PlainLanguagePlugin(acode);
  await plugin.init();
  plugin.destroy();
  if (removed !== LANGUAGE_NAME) {
    throw new Error('aceModes.removeMode was not called with the mode name');
  }
});

testAsync('plugin: main.js wires init/unmount on the acode global', async () => {
  let initFn = null;
  let unmountFn = null;
  const globalAcode = {
    require() { return undefined; },
    setPluginInit(id, fn) { initFn = fn; },
    setPluginUnmount(id, fn) { unmountFn = fn; },
  };
  const mainPath = require.resolve('../plain-acode/main.js');
  delete require.cache[mainPath];
  global.acode = globalAcode;
  try {
    require('../plain-acode/main.js');
  } finally {
    delete global.acode;
  }
  if (typeof initFn !== 'function') throw new Error('main.js did not call acode.setPluginInit');
  if (typeof unmountFn !== 'function') throw new Error('main.js did not call acode.setPluginUnmount');
});

// ── String Templates (backtick strings) ─────────────────────────────────────

test('string template: lexer produces TEMPLATE_STRING token', () => {
  const tokens = tokenize('remember msg as `Hello World`');
  const t = tokens.find(tok => tok.type === TOKEN.TEMPLATE_STRING);
  if (!t) throw new Error('Expected TEMPLATE_STRING token');
  if (t.value !== 'Hello World') throw new Error('Wrong value: ' + t.value);
});

test('string template: lexer preserves multiline content', () => {
  const tokens = tokenize('remember msg as `line1\nline2\nline3`');
  const t = tokens.find(tok => tok.type === TOKEN.TEMPLATE_STRING);
  if (!t) throw new Error('Expected TEMPLATE_STRING token');
  if (t.value !== 'line1\nline2\nline3') throw new Error('Wrong value: ' + JSON.stringify(t.value));
});

test('string template: lexer preserves interpolation syntax', () => {
  const tokens = tokenize('remember msg as `Hello ${name}!`');
  const t = tokens.find(tok => tok.type === TOKEN.TEMPLATE_STRING);
  if (!t) throw new Error('Expected TEMPLATE_STRING token');
  if (t.value !== 'Hello ${name}!') throw new Error('Wrong value: ' + t.value);
});

test('string template: unterminated backtick throws', () => {
  let threw = false;
  try { tokenize('remember msg as `Hello World'); } catch (e) { threw = true; }
  if (!threw) throw new Error('Expected error for unterminated backtick');
});

test('string template: two separate backtick strings', () => {
  const tokens = tokenize('remember msg as `hello` `world`');
  const ts = tokens.filter(tok => tok.type === TOKEN.TEMPLATE_STRING);
  if (ts.length !== 2) throw new Error('Expected 2 templates, got ' + ts.length);
  if (ts[0].value !== 'hello') throw new Error('First value wrong');
  if (ts[1].value !== 'world') throw new Error('Second value wrong');
});

test('string template: parser produces TemplateLiteral node', () => {
  const tokens = tokenize('remember msg as `Hello World`');
  const ast = parse(tokens);
  const stmt = ast.body[0];
  if (stmt.type !== 'RememberStatement') throw new Error('Wrong stmt type: ' + stmt.type);
  if (stmt.value.type !== 'TemplateLiteral') throw new Error('Wrong value type: ' + stmt.value.type);
  if (stmt.value.value !== 'Hello World') throw new Error('Wrong value');
});

test('string template: generator emits JS template literal', () => {
  const tokens = tokenize('remember msg as `Hello World`');
  const code = generate(parse(tokens));
  if (!code.includes('`Hello World`')) throw new Error('Missing template literal in output: ' + code);
  if (code.includes('JSON.stringify')) throw new Error('Should not use JSON.stringify for templates');
});

test('string template: full compile roundtrip', () => {
  const src = 'remember msg as `Hello World`\nshow msg';
  const code = generate(parse(tokenize(src)));
  if (!code.includes('`Hello World`')) throw new Error('Template literal missing');
});

test('string template: interpolation roundtrip', () => {
  const src = 'remember name as "World"\nremember msg as `Hello ${name}!`\nshow msg';
  const code = generate(parse(tokenize(src)));
  if (!code.includes('`Hello ${name}!`')) throw new Error('Interpolation missing: ' + code);
});

test('string template: multiline in show roundtrip', () => {
  const src = 'show `line1\nline2`';
  const code = generate(parse(tokenize(src)));
  if (!code.includes('line1\nline2')) throw new Error('Multiline missing: ' + code);
});

test('string template: backtick contains double and single quotes', () => {
  const src = 'show `Hello "World" and \'single\'`';
  const code = generate(parse(tokenize(src)));
  if (!code.includes('"World"')) throw new Error('Double quotes missing');
  if (!code.includes("'single'")) throw new Error('Single quotes missing');
});

test('string template: plain dollar sign without interpolation', () => {
  const src = 'show `price is $5`';
  const code = generate(parse(tokenize(src)));
  if (!code.includes('$5')) throw new Error('Dollar sign missing');
  if (code.includes('${')) throw new Error('Should not contain interpolation syntax');
});

// ── Summary ──────────────────────────────────────────────────────────────────

Promise.all(pendingPluginTests).then(() => {
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});