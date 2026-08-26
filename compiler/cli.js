#!/usr/bin/env node
// CLI: compile and run PLINJS (.pln) files.
//
// Usage:
//   plinjs run    <file.pln>   install missing dependencies, compile and execute
//   plinjs build  [file.pln]   compile to dist/ (or a single file) preserving names
//   plinjs check  <file.pln>   check syntax only (no JS generated, no execution)
//   plinjs fmt    <file.pln>   format a PLINJS file in-place
//   plinjs new    [name]       scaffold a new PLINJS project
//   plinjs init               create plinjs.config.json in the current directory
//   plinjs install            install dependencies required by the project's source files
//   plinjs start              build the entry file and run its dist/ output
//   plinjs doctor             check the PLINJS project environment
//   plinjs add    <package>   install a package and add it to plinjs.config.json
//   plinjs remove <package>   uninstall a package and remove it from plinjs.config.json
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
  plinjs init              Create plinjs.config.json in the current folder
  plinjs run <file.pln>    Install missing deps, compile, execute
  plinjs start             Build the entry file and run it from dist/

${section('BUILD & CHECK')}
  plinjs build             Compile every .pln in the project into dist/
  plinjs build <file.pln>  Compile one file into dist/ (name preserved)
  plinjs check <file.pln>  Syntax-check only — fastest feedback loop
  plinjs fmt <file.pln>    Format a file in place

${section('PACKAGES')}
  plinjs install           Install everything your source needs
  plinjs add <package>     Install a package and record it
  plinjs remove <package>  Uninstall a package and remove it
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

// ── plinjs.config.json helpers ─────────────────────────────────────────────────

const PLINJS_CONFIG = 'plinjs.config.json';
const DEFAULT_OUT_DIR = 'dist';

function readPlinConfig() {
  const jsonPath = path.resolve(PLINJS_CONFIG);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`${PLINJS_CONFIG} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

function writePlinConfig(data) {
  fs.writeFileSync(path.resolve(PLINJS_CONFIG), JSON.stringify(data, null, 4) + '\n', 'utf8');
}

// ── Build configuration ──────────────────────────────────────────────────────
//
// `plinjs build` follows a TypeScript-style model: sources compile into an
// output directory (default "dist") and keep their filenames relative to the
// source root. Configuration lives in plinjs.config.json in one of two shapes:
//
//   Single project (object):
//     { "name": "my-app", "outDir": "dist", "srcDir": "src", "entry": "index.pln" }
//
//   Multiple projects (array) — each element is its own build target and is
//   compiled into its own outDir by `plinjs build`; the first element answers
//   for commands that work on one program (start/install/doctor):
//     [ { "name": "test-proj", "outDir": "dist/test" },
//       { "name": "docs-site", "srcDir": "site-src", "outDir": "public/js" } ]
//
// Everything has a deterministic fallback:
//   - outDir: "dist"
//   - srcDir: "src" when that folder exists, otherwise the project root
//   - entry:  config value, else "app.pln", else "index.pln" in the source root
function normalizeProject(raw, index) {
  const cfg = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const outDir = typeof cfg.outDir === 'string' && cfg.outDir.trim() !== ''
    ? cfg.outDir
    : DEFAULT_OUT_DIR;
  const srcDir = typeof cfg.srcDir === 'string' && cfg.srcDir.trim() !== ''
    ? cfg.srcDir
    : (fs.existsSync(path.resolve('src')) ? 'src' : '.');
  const entry = typeof cfg.entry === 'string' && cfg.entry.trim() !== ''
    ? cfg.entry
    : null;
  const name = typeof cfg.name === 'string' && cfg.name.trim() !== ''
    ? cfg.name
    : `project-${index + 1}`;
  return { ...cfg, outDir, srcDir, entry, name };
}

function readRawConfig() {
  return readPlinConfig() || {};
}

// All build targets declared by plinjs.config.json, in declaration order.
// An object form yields exactly one target.
function loadProjectConfigs() {
  const raw = readRawConfig();
  if (Array.isArray(raw)) {
    return raw.map((item, i) => normalizeProject(item, i));
  }
  return [normalizeProject(raw, 0)];
}

// The primary build target: the only one for object configs, the first for
// array configs. Commands that act on a single program use this one.
function loadBuildConfig() {
  return loadProjectConfigs()[0];
}

// Every .pln file under srcDir, recursively, as paths relative to srcDir.
// Deterministic order (sorted); node_modules, the output directory, hidden
// directories and non-.pln files are never scanned.
function discoverSources(srcDir, outDir) {
  const root = path.resolve(srcDir);
  const outAbs = path.resolve(outDir);
  const found = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (full === outAbs) continue;
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
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

function requiredDependencies(files, config) {
  const packages = new Set();
  for (const { ast } of files) {
    for (const npm of detectDependencies(ast)) packages.add(npm);
  }
  // plinjs.config.json dependencies are also valid runtime declarations. They are
  // merged through a Set so source and configuration can never duplicate work.
  for (const npm of Object.keys((config && config.dependencies) || {})) {
    if (!isBuiltinModule(npm)) packages.add(npm);
  }
  return [...packages];
}

// A dependency may carry a version range ("left-pad@^1.3.0"). Installed-ness
// is judged by the bare package name; installation uses the full specifier.
function missingDependencies(files, config, cwd = process.cwd()) {
  return requiredDependencies(files, config)
    .filter(pkg => !isInstalled(splitPackageSpec(pkg).name, cwd));
}

// Ensure a package.json exists in the project directory before invoking npm.
// Without one, npm walks up the directory tree and may install into an
// unrelated ancestor project's node_modules instead of this project's. The
// scaffold is minimal and marked private so it is never published.
function ensurePackageJson(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) return;
  const config = readPlinConfig();
  fs.writeFileSync(pkgPath, JSON.stringify({
    name: (config && config.name) || path.basename(cwd),
    version: (config && config.version) || '0.1.0',
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

function ensureDependencies(files, config, install = true) {
  const required = requiredDependencies(files, config);
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
  stage('Checking runtime dependencies', () => ensureDependencies(files, readPlinConfig(), true));
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
// relative to srcDir when the file lives inside it.
function buildOne(filePath, buildConfig) {
  const absFile = path.resolve(filePath);
  if (!fs.existsSync(absFile)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const js = compile(absFile);
  const srcRoot = path.resolve(buildConfig.srcDir);
  let rel = path.relative(srcRoot, absFile).replace(/\.pln$/, '.js');
  if (rel.startsWith('..') || path.isAbsolute(rel)) rel = path.basename(absFile).replace(/\.pln$/, '.js');
  const outPath = path.join(path.resolve(buildConfig.outDir), rel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, js, 'utf8');
  return path.relative(process.cwd(), outPath) || outPath;
}

// `plinjs build` — TypeScript-style production build:
//
//   messi.pln        → dist/messi.js       (project-root sources)
//   src/index.pln    → dist/index.js       (src/ is the source root)
//   src/a/b.pln      → dist/a/b.js         (structure preserved)
//
// With an explicit file argument only that entry is compiled (into the
// primary project's outDir); without one, every .pln under each declared
// project's source root builds to its own dist/ module. An array-shaped
// plinjs.config.json compiles every listed project in order.
async function cmdBuild(filePath) {
  const projects = loadProjectConfigs();
  if (projects.length === 0) {
    console.error(`"${PLINJS_CONFIG}" declares no projects (the array is empty).`);
    process.exit(1);
  }
  if (filePath) {
    const outPath = buildOne(filePath, projects[0]);
    console.log(`\nOutput written to ${outPath}`);
    return;
  }
  const multi = projects.length > 1;
  let total = 0;
  for (const buildConfig of projects) {
    const sources = discoverSources(buildConfig.srcDir, buildConfig.outDir);
    if (multi) console.log(`\n${buildConfig.name} -> ${buildConfig.outDir}/`);
    if (sources.length === 0) {
      if (multi) {
        console.log(`${clrYellow('•')} no .pln files under "${buildConfig.srcDir}", skipped`);
        continue;
      }
      console.error(`No .pln files found under "${buildConfig.srcDir}".`);
      process.exit(1);
    }
    QUIET_STAGES = true;
    let built;
    try {
      built = sources.map((rel) => ({
        source: path.join(buildConfig.srcDir === '.' ? '' : buildConfig.srcDir, rel),
        outPath: buildOne(path.join(path.resolve(buildConfig.srcDir), rel), buildConfig),
      }));
    } finally {
      QUIET_STAGES = false;
    }
    for (const { source, outPath } of built) {
      console.log(`${clrGreen('✓')} ${source} -> ${outPath}`);
    }
    total += built.length;
  }
  console.log(`\n${total} file(s) compiled to ${total === 1 && !multi ? projects[0].outDir + '/' : 'their output directories'}.`);
}

async function cmdStart(extraArgs = []) {
  const config = readPlinConfig();
  if (!config) {
    console.error(`No ${PLINJS_CONFIG} found. Run "plinjs init" first.`);
    process.exit(1);
  }
  const buildConfig = loadBuildConfig();
  const entryPath = findEntry(config, buildConfig);
  if (!entryPath) {
    console.error(`Entry file "${buildConfig.entry || config.entry || 'app.pln'}" not found.`);
    process.exit(1);
  }
  const outFile = buildOne(entryPath, buildConfig);
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

  // plinjs.config.json
  fs.writeFileSync(path.join(dir, PLINJS_CONFIG), JSON.stringify({
    name,
    version: '0.1.0',
    entry: 'app.pln',
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 4) + '\n');

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

function cmdInit() {
  const jsonPath = path.resolve(PLINJS_CONFIG);
  if (fs.existsSync(jsonPath)) {
    console.log('Project already initialized.');
    return;
  }
  const name = path.basename(process.cwd());
  writePlinConfig({
    name,
    version: '0.1.0',
    entry: 'index.pln',
  });
  // Keep the default entry discoverable and make `plinjs install` immediately
  // actionable after initialization.
  const entryPath = path.resolve('index.pln');
  if (!fs.existsSync(entryPath)) {
    fs.writeFileSync(entryPath, '// PLINJS application entry point\nshow "Hello from PLINJS"\n', 'utf8');
  }
  console.log(`✓ Created ${PLINJS_CONFIG}`);
}

// ── NEW plinjs install implementation (RFC-0009.2) ────────────────────────────

// Locate the project entry for commands that work on a single program
// (start, install): the declared entry wins, then conventional defaults.
function findEntry(config, buildConfig) {
  const declared = buildConfig.entry || config.entry;
  const candidates = declared
    ? [declared, path.join(buildConfig.srcDir, declared)]
    : ['app.pln', 'index.pln', path.join(buildConfig.srcDir, 'app.pln'), path.join(buildConfig.srcDir, 'index.pln')];
  return candidates.find((c) => fs.existsSync(path.resolve(c))) || null;
}

function cmdInstall() {
  const config = readPlinConfig();
  if (!config) {
    console.error(`No ${PLINJS_CONFIG} found. Run "plinjs init" first.`);
    process.exit(1);
  }

  const buildConfig = loadBuildConfig();
  const entry = findEntry(config, buildConfig);
  if (!entry) {
    console.error(`Entry file "${config.entry || 'app.pln'}" not found.`);
    process.exit(1);
  }
  const entryPath = path.resolve(entry);

  console.log('Checking project...');
  let files;
  try {
    files = resolveDependencies(entryPath);
  } catch (err) {
    console.error(`Failed to resolve dependencies: ${err.message}`);
    process.exit(1);
  }

  console.log('Scanning source files...');
  const requiredPackages = requiredDependencies(files, config);
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

  const config = readPlinConfig();
  check('Project configuration', Boolean(config), config ? 'plinjs.config.json found' : 'run plinjs init');
  if (!config) return;
  const entry = config.entry || 'app.pln';
  if (!fs.existsSync(path.resolve(entry))) {
    check('Entry file', false, `"${entry}" not found`);
    return;
  }
  try {
    const files = resolveDependencies(path.resolve(entry));
    const required = requiredDependencies(files, config);
    const missing = required.filter(pkg => !isInstalled(splitPackageSpec(pkg).name));
    check('Dependencies', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')}` : 'ready');
  } catch (err) {
    check('Dependencies', false, err.message);
  }
}

// ── end of new cmdInstall ──────────────────────────────────────────────────

function cmdAdd(packageName) {
  if (!packageName) {
    console.error('Usage: plinjs add <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }
  const config = readPlinConfig();
  if (!config) {
    console.error(`No ${PLINJS_CONFIG} found. Run "plinjs init" first.`);
    process.exit(1);
  }

  if (!config.dependencies) config.dependencies = {};

  if (config.dependencies[packageName]) {
    console.log(`"${packageName}" is already listed in ${PLINJS_CONFIG}.`);
  }

  console.log(`Installing ${packageName}...`);
  try {
    ensurePackageJson();
    // Argument array through runNpm — no shell, no injection risk.
    runNpm(['install', packageName], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to install "${packageName}".`);
    process.exit(1);
  }

  // Read the installed version from node_modules/<pkg>/package.json.
  let version = '*';
  try {
    const pkgMeta = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'node_modules', packageName, 'package.json'), 'utf8')
    );
    if (pkgMeta.version) version = `^${pkgMeta.version}`;
  } catch (_) { /* leave '*' if metadata is unreadable */ }

  config.dependencies[packageName] = version;
  writePlinConfig(config);
  console.log(`✓ Added "${packageName}" to ${PLINJS_CONFIG}.`);
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
  const config = readPlinConfig();
  if (!config) {
    console.error(`No ${PLINJS_CONFIG} found. Run "plinjs init" first.`);
    process.exit(1);
  }

  if (!config.dependencies || !config.dependencies[packageName]) {
    console.log(`"${packageName}" is not listed in ${PLINJS_CONFIG}.`);
  } else {
    delete config.dependencies[packageName];
    writePlinConfig(config);
  }

  console.log(`Uninstalling ${packageName}...`);
  try {
    ensurePackageJson();
    // Argument array through runNpm — no shell, no injection risk.
    runNpm(['uninstall', packageName], { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`Failed to uninstall "${packageName}".`);
    process.exit(1);
  }
  console.log(`✓ Removed "${packageName}" from ${PLINJS_CONFIG}.`);
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
  const [, , command, fileArg] = process.argv;

  switch (command) {
    case 'run':     await cmdRun(fileArg, process.argv.slice(4)); break;
    case 'build':   await cmdBuild(fileArg);      break;
    case 'check':   cmdCheck(fileArg);            break;
    case 'fmt':     cmdFmt(fileArg);              break;
    case 'new':     cmdNew(fileArg);              break;
    case 'init':    cmdInit();                    break;
    case 'install': cmdInstall();                 break;
    case 'start':   await cmdStart(process.argv.slice(3)); break;
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