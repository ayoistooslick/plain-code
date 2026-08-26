// Tests for PLINJS v0.1.7 — production build model and project configuration.
//
//   build:    plinjs build writes dist/<name>.js preserving source names and
//             structure relative to the source root (TypeScript-style)
//   config:   plinjs.config.json with outDir/srcDir/entry; deterministic
//             defaults when the file is absent (outDir "dist", srcDir "."
//             or "src" when that folder exists)
//   run:      execution happens from a scratch directory outside the
//             project — execution never writes output files into it
//   packages: multi-file projects and npm-package-style projects build to a
//             normal Node-consumable dist/
//
// Run with: node tests/build.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const CLI = path.join(__dirname, '..', 'compiler', 'cli.js');

function runCli(args, cwd) {
  try {
    return execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env },
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function runNode(file, cwd) {
  try {
    return execFileSync(process.execPath, [file], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env },
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function tmpDir(prefix = 'plinjs-build-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

// ── Configuration defaults ───────────────────────────────────────────────────

test('config: without plinjs.config.json the default outDir is dist and srcDir is the project root', () => {
  const dir = tmpDir();
  write(dir, 'messi.pln', 'show "goal"\n');
  const out = runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'messi.js')),
    `expected dist/messi.js, got output:\n${out}`);
});

test('config: an existing src/ folder becomes the source root automatically', () => {
  const dir = tmpDir();
  write(dir, 'src/index.pln', 'show "src entry"\n');
  write(dir, 'stray.pln', 'show "outside src"\n');
  runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'index.js')), 'src/index.pln must build to dist/index.js');
  assert(!fs.existsSync(path.join(dir, 'dist', 'stray.js')), 'files outside src/ must not be compiled');
});

test('config: outDir is configurable ("build")', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify({ outDir: 'build' }));
  write(dir, 'app.pln', 'show "ok"\n');
  runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'build', 'app.js')), 'expected build/app.js');
  assert(!fs.existsSync(path.join(dir, 'dist')), 'default dist/ must not appear when outDir is set');
});

test('config: srcDir is configurable', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify({ srcDir: 'lib' }));
  write(dir, 'lib/core.pln', 'show "core"\n');
  runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'core.js')), 'expected dist/core.js from lib/ sources');
});

test('config: entry is configurable and used by start', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify({ entry: 'main.pln' }));
  write(dir, 'main.pln', 'show "custom-entry"\n');
  const out = runCli(['start'], dir);
  assert(out.includes('custom-entry'), `start must execute the declared entry, got:\n${out}`);
});

// ── Build model behaviour ────────────────────────────────────────────────────

test('build: source filenames are preserved (messi.pln -> dist/messi.js)', () => {
  const dir = tmpDir();
  write(dir, 'messi.pln', 'remember club as "inter miami"\nshow club\n');
  runCli(['build'], dir);
  const js = fs.readFileSync(path.join(dir, 'dist', 'messi.js'), 'utf8');
  assert(js.includes('let club = "inter miami"'), 'generated JS must match the source program');
  const printed = runNode(path.join(dir, 'dist', 'messi.js'), dir);
  assert(printed.includes('inter miami'), `dist/messi.js must be executable, got:\n${printed}`);
});

test('build: directory structure under the source root is preserved', () => {
  const dir = tmpDir();
  write(dir, 'src/a/b/deep.pln', 'show "deep"\n');
  runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'a', 'b', 'deep.js')), 'expected dist/a/b/deep.js');
});

test('build: never writes dist/index.js for a differently named source', () => {
  const dir = tmpDir();
  write(dir, 'messi.pln', 'show "goal"\n');
  runCli(['build'], dir);
  assert(!fs.existsSync(path.join(dir, 'dist', 'index.js')), 'output name must follow the source name');
});

test('build: an explicit file argument builds just that file into dist/', () => {
  const dir = tmpDir();
  write(dir, 'one.pln', 'show "one"\n');
  write(dir, 'two.pln', 'show "two"\n');
  runCli(['build', 'two.pln'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'two.js')), 'expected dist/two.js');
  assert(!fs.existsSync(path.join(dir, 'dist', 'one.js')), 'other sources must stay unbuilt');
});

test('build: compilation is deterministic (identical bytes across rebuilds)', () => {
  const dir = tmpDir();
  write(dir, 'det.pln', 'remember n as 7\nshow n\n');
  runCli(['build'], dir);
  const first = fs.readFileSync(path.join(dir, 'dist', 'det.js'), 'utf8');
  fs.rmSync(path.join(dir, 'dist'), { recursive: true, force: true });
  runCli(['build'], dir);
  const second = fs.readFileSync(path.join(dir, 'dist', 'det.js'), 'utf8');
  assert(first === second, 'rebuilds must produce byte-identical output');
});

test('build: node_modules and hidden directories are never scanned', () => {
  const dir = tmpDir();
  write(dir, 'keep.pln', 'show "kept"\n');
  write(dir, 'node_modules', 'junk', 'junk.js', 'not-plinjs');
  write(dir, 'node_modules', 'junk', 'fake.pln', 'show "should not compile"');
  write(dir, '.hidden', 'secret.pln', 'show "should not compile"');
  const out = runCli(['build'], dir);
  assert(!out.includes('fake.pln') && !out.includes('secret.pln'), `excluded dirs leaked into the build:\n${out}`);
  assert(!fs.existsSync(path.join(dir, 'dist', 'fake.js')), 'node_modules must not be compiled');
  assert(!fs.existsSync(path.join(dir, 'dist', 'secret.js')), 'hidden dirs must not be compiled');
});

test('build: a stale dist is not re-scanned as source', () => {
  const dir = tmpDir();
  write(dir, 'loop.pln', 'show "v1"\n');
  runCli(['build'], dir);
  const out = runCli(['build'], dir);
  assert(out.includes('1 file(s) compiled'), `dist/ contents leaked into discovery:\n${out}`);
});

test('build: with no sources at all the CLI teaches instead of crashing', () => {
  const dir = tmpDir();
  const out = runCli(['build'], dir);
  assert(out.toLowerCase().includes('no .pln files found'), `expected a teaching error, got:\n${out}`);
});

// ── Run model: scratch execution, nothing left in the project ────────────────

test('run: executes correctly and leaves zero files behind in the project', () => {
  const dir = tmpDir();
  write(dir, 'go.pln', 'show "ran fine"\n');
  const before = fs.readdirSync(dir).sort().join(',');
  const out = runCli(['run', 'go.pln'], dir);
  assert(out.includes('ran fine'), `program did not run:\n${out}`);
  assert(out.includes('Done.'), `expected completion marker:\n${out}`);
  const after = fs.readdirSync(dir).sort().join(',');
  assert(before === after, `project directory changed: before [${before}] after [${after}]`);
  const strays = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert(strays.length === 0, `run wrote files beside the source: ${strays.join(', ')}`);
});

// Fabricate an installed package so require() resolution can be proven
// without touching the network.
function writeLocalPackage(projectDir, pkgName, mainSrc) {
  const pkgDir = path.join(projectDir, 'node_modules', pkgName);
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: pkgName, main: 'index.js' }));
  fs.writeFileSync(path.join(pkgDir, 'index.js'), mainSrc, 'utf8');
}

test('run: requires resolve against project node_modules even from the scratch dir', () => {
  const dir = tmpDir();
  writeLocalPackage(dir, 'fakerunpkg', 'module.exports = "resolved-ok"');
  write(dir, 'app.pln', 'use fakerunpkg\nshow fakerunpkg\n');
  const out = runCli(['run', 'app.pln'], dir);
  assert(out.includes('resolved-ok'), `NODE_PATH resolution failed:\n${out}`);
});

test('start: builds the entry into dist and executes that output', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify({ entry: 'boot.pln' }));
  write(dir, 'boot.pln', 'show "started-from-dist"\n');
  const out = runCli(['start'], dir);
  assert(out.includes('started-from-dist'), `start did not execute:\n${out}`);
  assert(fs.existsSync(path.join(dir, 'dist', 'boot.js')), 'start must persist the built output in dist/');
});

// ── Array configuration: multiple named projects ─────────────────────────────

test('config: an array of projects builds each into its own outDir, in order', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify([
    { name: 'test-proj', srcDir: 'web', outDir: 'dist/test' },
    { name: 'tools', srcDir: 'tools', outDir: 'dist/tools' },
  ]));
  write(dir, path.join('web', 'app.pln'), 'show "app"');
  write(dir, path.join('tools', 'cli.pln'), 'show "cli"');
  const out = runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'test', 'app.js')), `test-proj output missing:\n${out}`);
  assert(fs.existsSync(path.join(dir, 'dist', 'tools', 'cli.js')), `tools output missing:\n${out}`);
  assert(out.includes('test-proj -> dist/test/'), `project header missing:\n${out}`);
  assert(out.includes('tools -> dist/tools/'), `second project header missing:\n${out}`);
  assert(out.includes('2 file(s) compiled'), `total count wrong:\n${out}`);
});

test('config: array elements may declare their own srcDir', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify([
    { name: 'site', srcDir: 'site-src', outDir: 'public/js' },
  ]));
  write(dir, path.join('site-src', 'main.pln'), 'show "site"');
  write(dir, path.join('other', 'skip.pln'), 'show "skip"');
  const out = runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'public', 'js', 'main.js')), `custom srcDir ignored:\n${out}`);
  assert(!fs.existsSync(path.join(dir, 'public', 'js', 'skip.js')), 'files outside the declared srcDir must not compile');
});

test('config: commands that run one program use the first project in the array', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', JSON.stringify([
    { name: 'first', entry: 'first.pln', outDir: 'dist/a' },
    { name: 'second', entry: 'second.pln', outDir: 'dist/b' },
  ]));
  write(dir, 'first.pln', 'show "from-first"');
  write(dir, 'second.pln', 'show "from-second"');
  const out = runCli(['start'], dir);
  assert(out.includes('from-first'), `start did not use the first project:\n${out}`);
  assert(!out.includes('from-second'), 'start must not run later projects');
});

test('config: an empty project array teaches instead of crashing', () => {
  const dir = tmpDir();
  write(dir, 'plinjs.config.json', '[]');
  const out = runCli(['build'], dir);
  assert(out.toLowerCase().includes('declares no projects'), `expected a teaching error, got:\n${out}`);
});

// ── Integration: multi-file project ──────────────────────────────────────────

test('integration: a multi-file project imports are bundled and the dist output runs standalone', () => {
  const dir = tmpDir();
  // Use only core statements so no packages are needed.
  write(dir, path.join('src', 'index.pln'), [
    'import "./helpers/greet.pln"',
    '',
    'greet("PLINJS")',
  ].join('\n'));
  write(dir, path.join('src', 'helpers', 'greet.pln'), [
    'make greet(who)',
    '    show `Hello ${who}`',
    'done',
  ].join('\n'));

  const out = runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'index.js')), `multi-file build failed:\n${out}`);
  assert(fs.existsSync(path.join(dir, 'dist', 'helpers', 'greet.js')), 'each source file gets its own dist output');

  const printed = runNode(path.join(dir, 'dist', 'index.js'), dir);
  assert(printed.includes('Hello PLINJS'), `standalone dist output broken:\n${printed}`);
});

// ── Integration: npm-package-style project ───────────────────────────────────

test('integration: an npm-package-style project builds src/index.pln -> dist/index.js consumable by Node', () => {
  const dir = tmpDir();
  write(dir, 'package.json', JSON.stringify({
    name: 'my-plinjs-package',
    version: '1.0.0',
    main: 'dist/index.js',
    scripts: { build: 'plinjs build' },
    devDependencies: { plinjs: '^0.1.7' },
  }, null, 2));
  write(dir, path.join('src', 'index.pln'), [
    'remember greeting as "published"',
    'show `package says ${greeting}`',
  ].join('\n'));

  const out = runCli(['build'], dir);
  assert(fs.existsSync(path.join(dir, 'dist', 'index.js')), `package build failed:\n${out}`);
  assert(!fs.existsSync(path.join(dir, 'src', 'index.js')), 'sources must stay pristine');

  // A consumer requires the built package exactly like any Node module.
  const consumer = write(dir, 'consume.js', [
    `require('./dist/index.js');`,
  ].join('\n'));
  const printed = runNode(consumer, dir);
  assert(printed.includes('package says published'), `consumer could not use the built package:\n${printed}`);

  // The project's own package.json semantics were respected, not rewritten.
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  assert(pkg.main === 'dist/index.js' && pkg.name === 'my-plinjs-package', 'package.json was modified by the build');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
