#!/usr/bin/env node
// CLI: compile and run PLINJS (.pln) files.
//
// Usage:
//   plinjs run    <file.pln>   install missing dependencies, compile and execute
//   plinjs build  [file.pln]   compile src/ (or one file) to dist/, names preserved
//   plinjs check  <file.pln>   check syntax only (no JS generated, no execution)
//   plinjs fmt    <file.pln>   format a PLINJS file in-place
//   plinjs new    [name]       scaffold a new PLINJS project
//   plinjs install            install dependencies detected in the project's sources
//   plinjs start              build src/app.pln (or index.pln) and run its dist output
//   plinjs doctor             check the PLINJS project environment
//   plinjs add    <package>   install a package into the project
//   plinjs remove <package>   uninstall a package from the project
//   plinjs update             update all installed packages
//   plinjs version            print the compiler version
//   plinjs help               print this help text

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate, createGenerationContext, wrapAsync } = require('./generator');
const { bundle, resolveDependencies } = require('./bundler');
const { format }   = require('./formatter');
const { detectDependencies, PACKAGE_MAP, isBuiltinModule, splitPackageSpec } = require('./dependency-detector');

const { VERSION } = require('./version');

// ── Terminal colours (disabled when stdout is not a TTY) ──────────────────────

const HAS_COLOR = Boolean(process.stdout.isTTY);
function _c(code, text) { return HAS_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text; }
const clrGreen  = (t) => _c('32', t);
const clrRed    = (t) => _c('31', t);
const clrYellow = (t) => _c('33', t);
const clrCyan   = (t) => _c('36', t);
const clrBold   = (t) => _c('1',  t);
const clrDim    = (t) => _c('2',  t);

function warn(message) {
  console.warn(clrYellow(`⚠  Warning: ${message}`));
}

// Help text is built once at startup. Colours resolve to empty wrappers when
// stdout is not a TTY, so piped output (and the test suite) always sees plain
// text.
const section = (title) => `\n${clrCyan(clrBold(title))}`;

const HELP = `
${clrBold(`PLINJS v${VERSION}`)} ${clrDim('· .pln compiles to readable Node.js')}

${section('START')}
  plinjs new [name]        Scaffold a new project with a working app.pln
  plinjs run <file.pln>    Install missing deps, compile, execute
  plinjs start             Build src/app.pln and run it from dist/

${section('BUILD & CHECK')}
  plinjs build             Compile every .pln under src/ into dist/
  plinjs build <file.pln>  Compile one file into dist/ (name preserved)
  plinjs check <file.pln>  Syntax-check only — fastest feedback loop
  plinjs fmt <file.pln>    Format a file in place

${section('PACKAGES')}
  plinjs install           Install everything your source needs
  plinjs add <package>     Install a package into the project
  plinjs remove <package>  Uninstall a package from the project
  plinjs update            Update all installed packages

${section('TOOLS')}
  plinjs doctor            Check the project environment
  plinjs version           Print the compiler version
  plinjs help              Print this text

${section('THE LANGUAGE IN EIGHT LINES')}
  remember name as "Ada"          show \`Hi \${name}\`         variables, printing
  if age is at least 13 ... done  and · or · not               conditions
  for each p in players ... done  while lives is above 0       loops
  make add(a, b) / give a + b / done                           functions
  web app / route get "/users" ... done / start 3000           web servers
  database "app.db" / query ... done   postgres env("URL")     databases
  get "<url>" / post "<url>" with body                         HTTP client
  try ... recover as err ... done      retry 3 times every 5s  errors

${section('ALSO SHIPPED')}
  Comparisons and stdlib (v1.0) · PLINJS Expressions (v1.1) ·
  JavaScript gateway with ask (v1.1.1) · OCR · Telegram bots ·
  WhatsApp bots (v2.1.1) ·
  email · schedules · WebSocket · cache (v2.1) ·
  sessions · uploads · cookies · rate limits · api keys · OAuth (v2.1.1)

${section('FIRST RUN')}
  plinjs new hello               scaffolds hello/ with a live web app
  plinjs run hello/app.pln       serves it at http://localhost:3000
`.trim();

// ── npm invocation ────────────────────────────────────────────────────────────

// Locate npm's CLI entry script so npm can be spawned through Node.
// Spawning "npm" directly fails on Windows since Node 18.20/20.12: npm ships
// as an .cmd shim there, and child_process refuses to spawn .bat/.cmd files
// for security reasons (CVE-2024-27980). Running npm-cli.js with
// process.execPath works on every platform and keeps argument arrays
// injection-safe because no shell is involved.
function findNpmCli() {
  const candidates = [];
  // Official Node distributions install npm next to the node executable.
  candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  try { candidates.push(require.resolve('npm/bin/npm-cli.js')); } catch (_) { /* npm not resolvable */ }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Run npm with an argument array. Never uses a shell unless absolutely
// necessary (Windows fallback without npm-cli.js), so package names can never
// be interpreted as shell commands.
function runNpm(args, options = {}) {
  const npmCli = findNpmCli();
  if (npmCli) return execFileSync(process.execPath, [npmCli, ...args], options);
  return execFileSync('npm', args, { ...options, shell: process.platform === 'win32' });
}

// ── Package-name validation ───────────────────────────────────────────────────

// Accept standard npm package names including scoped packages (@org/pkg).
// Rejects anything that could be used for shell injection or path traversal.
function isValidPackageName(name) {
  return typeof name === 'string' && /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/i.test(name);
}

// ── Build conventions ────────────────────────────────────────────────────────
//
// `plinjs build` follows a TypeScript-style model:
//
//   Zero configuration (default):
//     - sources are discovered automatically under "src/" (the project root is
//       scanned when no src/ directory exists)
//     - output always goes to "dist/"
//
//   Optional plinjs.config.json (tsconfig-like):
//     { "compilerOptions": { "outDir": "./build", "rootDir": "./lib",
//       "exclude": ["vendor"] } }
//
//   Filenames and folder structure are always preserved:
//       src/messi.pln     → dist/messi.js
//       src/helpers/math.pln → dist/helpers/math.js
const SOURCE_DIR = 'src';
const DEFAULT_OUT_DIR = 'dist';

// Read optional plinjs.config.json. Returns { compilerOptions } or null.
// The file is tsconfig-like: only compilerOptions.outDir, compilerOptions.rootDir,
// and compilerOptions.exclude are used.
function readCompilerOptions() {
  const configPath = path.resolve('plinjs.config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return raw.compilerOptions || null;
  } catch (e) {
    console.error(`plinjs.config.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

// Resolve the source root directory.
// Priority: config rootDir > automatic src/ detection > project root.
function resolveSrcDir(opts) {
  if (opts && opts.rootDir) return opts.rootDir;
  return fs.existsSync(path.resolve(SOURCE_DIR)) ? SOURCE_DIR : '.';
}

// Resolve the output directory.
// Priority: config outDir > default "dist".
function resolveOutDir(opts) {
  if (opts && opts.outDir) return opts.outDir;
  return DEFAULT_OUT_DIR;
}

// Every .pln file under srcDir, recursively, as paths relative to srcDir.
// Deterministic order (sorted); node_modules, hidden directories, the output
// directory, and any user-specified exclude patterns are skipped.
function discoverSources(srcDir, outDir, exclude) {
  const root = path.resolve(srcDir);
  const outAbs = path.resolve(outDir);
  const excludeSet = new Set(['node_modules']);
  // Always exclude the output directory and hidden directories
  excludeSet.add(path.basename(outAbs));
  // Add user-specified excludes
  if (Array.isArray(exclude)) {
    for (const pattern of exclude) excludeSet.add(pattern);
  }
  const found = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name.startsWith('.')) continue;
      if (excludeSet.has(name)) continue;
      const full = path.join(dir, name);
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      if (stat.isDirectory()) {
        walk(full);
      } else if (name.endsWith('.pln')) {
        found.push(path.relative(root, full));
      }
    }
  })(root);
  return found;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Project builds compile many files in one pass; per-file stage logs would
// drown the useful output. Set before batch compilation, reset after.
let QUIET_STAGES = false;

function stage(label, fn) {
  const t0 = Date.now();
  try {
    const result = fn();
    const ms = Date.now() - t0;
    if (!QUIET_STAGES) console.log(`${clrGreen('✓')} ${label}${ms > 50 ? clrDim(` (${ms}ms)`) : ''}`);
    return result;
  } catch (err) {
    console.error(`${clrRed('✗')} ${label} failed\n`);
    console.error(err.message);
    process.exit(1);
  }
}

// Map PLINJS package names to their npm package names (same as the compiler's
// KNOWN_PACKAGES in generator.js).
// Keep dependency checks in one CLI execution cheap and deterministic.
const dependencyCache = new Map();

// Check whether an npm package is installed in this project's node_modules.
// Deliberately NOT require.resolve: that would also walk up ancestor
// directories and global folders, reporting a package as available when this
// project does not actually have it.
function isInstalled(npmPkg, cwd = process.cwd()) {
  if (isBuiltinModule(npmPkg)) return true;
  const cacheKey = `${cwd}\0${npmPkg}`;
  if (dependencyCache.has(cacheKey)) return dependencyCache.get(cacheKey);
  const segments  = npmPkg.split('/');
  const pkgDir    = path.join(cwd, 'node_modules', ...segments);
  const installed =
    fs.existsSync(path.join(pkgDir, 'package.json')) ||
    (segments.length > 1 && fs.existsSync(pkgDir)); // scope placeholder
  dependencyCache.set(cacheKey, installed);
  return installed;
}

function npmNameFor(plainPkg) {
  return PACKAGE_MAP[plainPkg] || plainPkg;
}

function requiredDependencies(files) {
  const packages = new Set();
  for (const { ast } of files) {
    for (const npm of detectDependencies(ast)) packages.add(npm);
  }
  return [...packages];
}

// Ensure a package.json exists in the project directory before invoking npm.
// Without one, npm walks up the directory tree and may install into an
// unrelated ancestor project's node_modules instead of this project's. The
// scaffold is minimal and marked private so it is never published.
function ensurePackageJson(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) return;
  fs.writeFileSync(pkgPath, JSON.stringify({
    name: path.basename(cwd),
    version: '0.1.0',
    private: true,
  }, null, 2) + '\n', 'utf8');
}

// v2.1.1 — verify that a freshly installed package actually LOADS on this
// machine. "better-sqlite3 present in node_modules" does not imply usable:
// its native binding may be missing for this platform or Node ABI (the
// Termux failure mode). The check runs in a child process so a hard crash
// inside the package cannot take the CLI down.
function verifyPackageUsable(npmPkg, cwd = process.cwd()) {
  const probe =
    `try {` +
    `  const mod = require(${JSON.stringify(npmPkg)});` +
    `  if (${JSON.stringify(npmPkg)} === 'better-sqlite3') {` +
    `    const db = new mod(':memory:');` +
    `    db.close();` +
    `  }` +
    `  process.exit(0);` +
    `} catch (_) { process.exit(1); }`;
  try {
    execFileSync(process.execPath, ['-e', probe], { cwd, stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function installPackages(packages, cwd = process.cwd()) {
  ensurePackageJson(cwd);
  for (const pkg of packages) {
    const bareName = splitPackageSpec(pkg).name;
    console.log(`${clrCyan('Installing')} ${pkg}...`);
    try {
      runNpm(['install', pkg, '--no-audit', '--no-fund'], {
        cwd,
        stdio: 'ignore',
      });
      dependencyCache.set(`${cwd}\0${bareName}`, true);
      // v2.1.1 — "downloaded" and "usable" are different facts. Report both.
      if (verifyPackageUsable(bareName, cwd)) {
        console.log(`${clrGreen('✓')} ${pkg} installed`);
      } else {
        console.log(
          `${clrYellow('⚠')} ${pkg} downloaded but NOT usable on this platform ` +
          `(its native code could not be loaded). Programs that can fall back ` +
          `(like SQLite) will still work; otherwise fix this package before running.`
        );
      }
    } catch (_) {
      // v2.1.1 — better-sqlite3 is optional at install time: programs opened
      // through the portable engine chain fall back to sql.js, so a native
      // build failure must not abort setup.
      if (bareName === 'better-sqlite3') {
        console.log(
          `${clrYellow('⚠')} ${pkg} could not be installed on this platform. ` +
          `PLINJS will use its WebAssembly SQLite engine instead.`
        );
        continue;
      }
      throw new Error(
        `Could not install "${pkg}". The package may be unavailable or the machine may be offline.\n` +
        `Run manually: npm install ${pkg}`
      );
    }
  }
}

function ensureDependencies(files, install = true) {
  const required = requiredDependencies(files);
  const missing = required.filter(pkg => !isInstalled(splitPackageSpec(pkg).name));
  if (missing.length === 0) return { required, missing };
  if (install) {
    installPackages(missing);
    return { required, missing: [] };
  }
  const lines = missing.map(pkg => `  Package "${pkg}" is not installed.\n  Run: npm install ${pkg}`);
  throw new Error(`Missing dependencies:\n\n${lines.join('\n\n')}`);
}

// Compile a PLINJS program to JavaScript.
//
// Deterministic only: the lexer/parser/generator pipeline is the single
// authoritative compiler. Unsupported syntax produces a precise compiler
// error — there is no second compilation path (v2.1.1).
function compile(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const generationContext = createGenerationContext();

  let files;
  stage('Resolving imports', () => {
    files = resolveDependencies(absPath);
  });
  stage('Building dependency graph', () => files);
  stage('Checking runtime dependencies', () => ensureDependencies(files, true));
  const js = stage('Generating JavaScript', () =>
    files.map(({ ast }) => generate(ast, generationContext)).filter(s => s.trim()).join('\n'));
  return generationContext.needsAsync ? wrapAsync(js) : js;
}

// ── Commands ─────────────────────────────────────────────────────────────────

// Node resolves require(...) against the temp file's location, so a scratch
// file in the OS temp dir could never see the project's node_modules. Passing
// every node_modules directory between the entry file and the filesystem root
// through NODE_PATH gives the child the exact same resolution the old
// project-local temp file had — without ever writing into the project.
function nodeModulesSearchPaths(entryDir) {
  const paths = [];
  let dir = path.resolve(entryDir);
  while (true) {
    const candidate = path.join(dir, 'node_modules');
    if (fs.existsSync(candidate)) paths.push(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return paths;
}

async function cmdRun(filePath, extraArgs = []) {
  if (!filePath) {
    console.error('Usage: plinjs run <file.pln>');
    process.exit(1);
  }
  const js = compile(filePath);
  console.log('');
  // Execute from the entry file's directory so relative assets and CWD-based
  // behaviour match a direct `node` invocation.
  const entryDir = path.dirname(path.resolve(filePath));
  const searchPaths = nodeModulesSearchPaths(entryDir);
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'plinjs-run-'));
  const tmpFile = path.join(tmpDir, 'out.js');
  fs.writeFileSync(tmpFile, js, 'utf8');
  try {
    execFileSync(process.execPath, [tmpFile, ...extraArgs], {
      stdio: 'inherit',
      cwd: entryDir,
      env: { ...process.env, NODE_PATH: searchPaths.join(path.delimiter) },
    });
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.error('\nThe program exited with an error. See the message above.');
    process.exit(1);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\nDone.');
}

// Compile one entry and write it to outDir with its source name preserved,
// relative to the source root when the file lives inside it.
function buildOne(filePath, srcDir, outDir) {
  const absFile = path.resolve(filePath);
  if (!fs.existsSync(absFile)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const js = compile(absFile);
  const srcRoot = path.resolve(srcDir);
  let rel = path.relative(srcRoot, absFile).replace(/\.pln$/, '.js');
  if (rel.startsWith('..') || path.isAbsolute(rel)) rel = path.basename(absFile).replace(/\.pln$/, '.js');
  const outPath = path.join(path.resolve(outDir), rel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, js, 'utf8');
  return path.relative(process.cwd(), outPath) || outPath;
}

// `plinjs build` — TypeScript-style production build:
//
//   Zero config (default):
//     messi.pln        → dist/messi.js       (project-root sources)
//     src/index.pln    → dist/index.js       (src/ is the source root)
//     src/a/b.pln      → dist/a/b.js         (structure preserved)
//
//   With plinjs.config.json:
//     { "compilerOptions": { "outDir": "./build", "rootDir": "./lib" } }
//     lib/app.pln → build/app.js
//
// With an explicit file argument only that entry is compiled; without one,
// every .pln under the discovered source root builds to the output directory.
async function cmdBuild(filePath) {
  const opts = readCompilerOptions();
  const srcDir = resolveSrcDir(opts);
  const outDir = resolveOutDir(opts);
  const exclude = opts && opts.exclude;
  if (filePath) {
    const outPath = buildOne(filePath, srcDir, outDir);
    console.log(`\nOutput written to ${outPath}`);
    return;
  }
  const sources = discoverSources(srcDir, outDir, exclude);
  if (sources.length === 0) {
    console.error(`No .pln files found under "${srcDir}".`);
    process.exit(1);
  }
  QUIET_STAGES = true;
  let built;
  try {
    built = sources.map((rel) => ({
      source: path.join(srcDir === '.' ? '' : srcDir, rel),
      outPath: buildOne(path.join(path.resolve(srcDir), rel), srcDir, outDir),
    }));
  } finally {
    QUIET_STAGES = false;
  }
  for (const { source, outPath } of built) {
    console.log(`${clrGreen('✓')} ${source} -> ${outPath}`);
  }
  console.log(`\n${built.length} file(s) compiled to ${outDir}/.`);
}

async function cmdStart(extraArgs = []) {
  const opts = readCompilerOptions();
  const srcDir = resolveSrcDir(opts);
  const outDir = resolveOutDir(opts);
  const entryPath = findEntry(opts);
  if (!entryPath) {
    console.error('No entry file found. Expected "src/app.pln" or "src/index.pln".');
    process.exit(1);
  }
  const outFile = buildOne(entryPath, srcDir, outDir);
  const entryDir = path.dirname(path.resolve(entryPath));
  execFileSync(process.execPath, [path.resolve(outFile), ...extraArgs], {
    stdio: 'inherit',
    cwd: entryDir,
    env: { ...process.env, NODE_PATH: nodeModulesSearchPaths(entryDir).join(path.delimiter) },
  });
}

function cmdNew(projectName) {
  const name = projectName || 'my-plinjs-app';
  const dir  = path.resolve(name);

  if (fs.existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, 'public'));
  fs.mkdirSync(path.join(dir, 'src'));

  // src/app.pln — starter Express app
  fs.writeFileSync(path.join(dir, 'src', 'app.pln'), `use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from PLINJS!"
done

when someone visits "/api/status"
    reply json
        status is "ok"
        version is "1.0"
    done
done

listen on 3000
    show "Server running at http://localhost:3000"
done
`);

  // package.json — plain Node semantics; PLINJS itself is a devDependency and
  // deployment only needs the generated dist/ output.
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    description: `A PLINJS v${VERSION} application`,
    main: 'dist/app.js',
    scripts: {
      build: 'plinjs build',
      start: 'node dist/app.js',
    },
    devDependencies: {
      plinjs: `^${VERSION}`,
    },
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 2) + '\n');

  // README.md
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}

A PLINJS v${VERSION} application.

## Getting started

\`\`\`bash
npm install
npm run build
npm start
\`\`\`

Then open http://localhost:3000 in your browser.
`);

  console.log(`✓ Created project "${name}"`);
  console.log(`\nNext steps:\n  cd ${name}\n  npm install\n  npx plinjs run src/app.pln`);
}

// ── plinjs install ────────────────────────────────────────────────────────────

// Locate the project entry for commands that work on a single program (start):
// conventional defaults inside src/ first, then the project root.
function findEntry(opts) {
  const srcDir = resolveSrcDir(opts);
  const candidates = [
    path.join(srcDir, 'app.pln'),
    path.join(srcDir, 'index.pln'),
  ];
  if (srcDir !== '.') {
    candidates.push('app.pln', 'index.pln');
  }
  return candidates.find((c) => fs.existsSync(path.resolve(c))) || null;
}

// Parse every discovered source file and return ASTs ready for dependency
// detection. Parsing each file directly means dependencies are found even
// when nothing imports a given module yet.
function collectSourceAsts() {
  const opts = readCompilerOptions();
  const srcDir = resolveSrcDir(opts);
  const outDir = resolveOutDir(opts);
  const exclude = opts && opts.exclude;
  const sources = discoverSources(srcDir, outDir, exclude);
  if (sources.length === 0) {
    console.error(`No .pln source files found under "${srcDir}".`);
    process.exit(1);
  }
  const root = path.resolve(srcDir);
  return sources.map((rel) => ({
    ast: parse(tokenize(fs.readFileSync(path.join(root, rel), 'utf8'))),
  }));
}

function cmdInstall() {
  console.log('Scanning source files...');
  const asts = collectSourceAsts();

  const requiredPackages = requiredDependencies(asts);
  if (requiredPackages.length === 0) {
    console.log('This project has no external dependencies.');
    return;
  }

  // Determine which are missing
  const missing = requiredPackages.filter(pkg => !isInstalled(splitPackageSpec(pkg).name));

  if (missing.length === 0) {
    for (const pkg of requiredPackages) console.log(`${clrGreen('✓')} ${pkg} already installed`);
    console.log('All dependencies are already installed.');
    return;
  }

  console.log(`Found ${requiredPackages.length} required package(s).`);
  console.log(`Installing ${missing.length} missing package(s)...`);

  try {
    installPackages(missing);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  console.log('Done.');
}

function cmdDoctor() {
  console.log('PLINJS doctor\n');
  const check = (label, ok, detail = '') => {
    const suffix = detail ? ` — ${detail}` : '';
    console.log(`${ok ? clrGreen('✓') : clrRed('✗')} ${label}${suffix}`);
  };
  check('Node.js', Boolean(process.version));
  let npmVersion = '';
  try { npmVersion = runNpm(['--version'], { encoding: 'utf8' }).trim(); } catch (_) {}
  check('npm', Boolean(npmVersion), npmVersion);
  check('PLINJS CLI', true);
  check('Compiler', fs.existsSync(path.join(__dirname, 'parser.js')));
  check('Formatter', fs.existsSync(path.join(__dirname, 'formatter.js')));
  check('Runtime', fs.existsSync(path.join(__dirname, 'generator.js')));
  console.log('');

  // Source discovery check: does the project have any .pln files?
  const opts = readCompilerOptions();
  const srcDir = resolveSrcDir(opts);
  const outDir = resolveOutDir(opts);
  const exclude = opts && opts.exclude;
  const sources = discoverSources(srcDir, outDir, exclude);
  check('Source files', sources.length > 0,
    sources.length > 0 ? `"${srcDir}/" discovered (${sources.length} file(s))` : `no .pln files under "${srcDir}"`);
  if (sources.length === 0) return;

  // Dependency check: scan every source file for npm imports
  try {
    const root = path.resolve(srcDir);
    const asts = sources.map(rel => ({
      ast: parse(tokenize(fs.readFileSync(path.join(root, rel), 'utf8'))),
    }));
    const required = requiredDependencies(asts);
    const missing = required.filter(pkg => !isInstalled(splitPackageSpec(pkg).name));
    check('Dependencies', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')}` : 'ready');
  } catch (err) {
    check('Dependencies', false, err.message);
  }
}

function cmdAdd(packageName) {
  if (!packageName) {
    console.error('Usage: plinjs add <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }

  console.log(`Installing ${packageName}...`);
  try {
    ensurePackageJson();
    runNpm(['install', packageName, '--save'], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to install "${packageName}".`);
    process.exit(1);
  }
  console.log(`✓ Installed "${packageName}".`);
}

function cmdRemove(packageName) {
  if (!packageName) {
    console.error('Usage: plinjs remove <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }

  console.log(`Uninstalling ${packageName}...`);
  try {
    ensurePackageJson();
    runNpm(['uninstall', packageName], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to uninstall "${packageName}".`);
    process.exit(1);
  }
  console.log(`✓ Removed "${packageName}".`);
}

function cmdUpdate() {
  console.log('Updating packages...');
  try {
    // Anchor npm to this project: without a local package.json it would walk
    // up the directory tree and update an unrelated ancestor project.
    ensurePackageJson();
    runNpm(['update'], { stdio: 'inherit', cwd: process.cwd() });
    console.log('\n✓ Packages updated.');
  } catch (e) {
    console.error('npm update failed.');
    process.exit(1);
  }
}

// Check syntax of a PLINJS file without generating JavaScript or executing.
function cmdCheck(filePath) {
  if (!filePath) {
    console.error('Usage: plinjs check <file.pln>');
    process.exit(1);
  }
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const t0 = Date.now();
  try {
    resolveDependencies(absPath);
    const ms = Date.now() - t0;
    console.log(`${clrGreen('✓')} ${filePath} — no errors found.${clrDim(` (${ms}ms)`)}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// Format a PLINJS file in-place.
function cmdFmt(filePath) {
  if (!filePath) {
    console.error('Usage: plinjs fmt <file.pln>');
    process.exit(1);
  }
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const source    = fs.readFileSync(absPath, 'utf8');
  const formatted = format(source);
  if (source === formatted) {
    console.log(`${clrDim('–')} ${filePath} — already formatted.`);
  } else {
    fs.writeFileSync(absPath, formatted, 'utf8');
    console.log(`${clrGreen('✓')} Formatted ${filePath}`);
  }
}

function cmdVersion() {
  console.log(`PLINJS v${VERSION}`);
}

function cmdHelp() {
  console.log(HELP);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Global flags — recognized anywhere in the argument list.
  const quiet   = args.includes('--quiet');
  const verbose = args.includes('--verbose');
  if (quiet)   { stage = stageQuiet;   QUIET_STAGES = true; }
  if (verbose) { stage = stageVerbose;  VERBOSE = true; }

  // Filter flags out to get the positional arguments.
  const positional = args.filter(a => !a.startsWith('--'));
  const [, , command, fileArg] = positional.length >= 2
    ? ['', '', positional[0], positional[1]]
    : ['', '', positional[0] || '', ''];

  switch (command) {
    case 'run':     await cmdRun(fileArg, positional.slice(2)); break;
    case 'build':   await cmdBuild(fileArg);      break;
    case 'check':   cmdCheck(fileArg);            break;
    case 'fmt':     cmdFmt(fileArg);              break;
    case 'new':     cmdNew(fileArg);              break;
    case 'install': cmdInstall();                 break;
    case 'start':   await cmdStart(positional.slice(2)); break;
    case 'doctor':  cmdDoctor();                  break;
    case 'add':     cmdAdd(fileArg);              break;
    case 'remove':  cmdRemove(fileArg);           break;
    case 'update':  cmdUpdate();                  break;
    case 'version': cmdVersion();                 break;
    case 'help':    cmdHelp();                    break;
    default:
      // Backwards-compatible: treat the first arg as a file to run directly
      if (command && command.endsWith('.pln')) {
        await cmdRun(command);
      } else {
        console.error(`Unknown command: "${command}". Run "plinjs help" for usage.`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});