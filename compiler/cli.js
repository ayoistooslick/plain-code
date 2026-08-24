#!/usr/bin/env node
// CLI: compile and run Plain (.pln) files.
//
// Usage:
//   plain run    <file.pln>   install missing dependencies, compile and execute
//   plain build  <file.pln>   install missing dependencies and compile
//   plain check  <file.pln>   check syntax only (no JS generated, no execution)
//   plain fmt    <file.pln>   format a Plain file in-place
//   plain new    [name]       scaffold a new Plain project
//   plain init               create plain.json in the current directory
//   plain install            install dependencies required by the project's source files
//   plain start              start the entry file from plain.json
//   plain doctor             check the Plain project environment
//   plain add    <package>   install a package and add it to plain.json
//   plain remove <package>   uninstall a package and remove it from plain.json
//   plain update             update all installed packages
//   plain version            print the compiler version
//   plain help               print this help text

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

const HELP = `
Plain v${VERSION} — Intent-Oriented Programming Language

Commands

  plain run    <file.pln>   Install dependencies, compile and execute
  plain build  <file.pln>   Install dependencies and compile to JavaScript
  plain check  <file.pln>   Check syntax only (no output, no execution)
  plain fmt    <file.pln>   Format a Plain file in-place
  plain new    [name]       Create a new Plain project
  plain init               Create a plain.json in the current directory
  plain install            Install dependencies required by the project's source files
  plain start              Start the entry file from plain.json
  plain doctor             Check the Plain project environment
  plain add    <package>   Install a package and add it to plain.json
  plain remove <package>   Remove a package from plain.json and uninstall it
  plain update             Update all installed npm packages
  plain version            Print the compiler version
  plain help               Print this help text

One compiler

  Plain has exactly one authoritative deterministic compiler. Unsupported
  syntax is a precise, deterministic compile error — there is no fallback
  translator and no second compilation path (removed in v2.1.1).

v1.0 Language Features

  Comparisons:  is above, is below, is at least, is at most,
                is not, is empty, is not empty, contains,
                starts with, ends with, between … and
  Alias:        for every … in …  (same as for each)
  Web:          web app / route "…" … done / start <port>
  Database:     database "…" / query … done / insert … done
  Stdlib:       print, readFile, writeFile, fileExists, sleep,
                time, date, jsonEncode, jsonDecode, env, exit, uuid

v1.1 Plain Expressions

  Items:        first player from players / last player from players
                player one from players (up to twenty)
  Collections:  players length / add(item to players) /
                remove(item from players) / players contains item
  Properties:   name of user / city of address of customer /
                name of user becomes "Ayo"
  Files:        read("users.txt") / write(data to "users.txt")

v1.1.1 JavaScript Gateway (beta)

  JavaScript:   remember result as javascript
                    await axios.get(url)
                done
  Input:        ask name / ask "What is your name?" as name
  Packages:     use axios / use dotenv / use node-fetch — any npm package
  Async:        JavaScript blocks and ask run in an async runtime

Examples:
  plain run hello.pln
  plain build app.pln
  plain check app.pln
  plain fmt app.pln
  plain new myapp
  plain init
  plain add express
  plain remove express
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

// ── plain.json helpers ────────────────────────────────────────────────────────

const PLAIN_JSON = 'plain.json';

function readPlainJson() {
  const jsonPath = path.resolve(PLAIN_JSON);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`plain.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
}

function writePlainJson(data) {
  fs.writeFileSync(path.resolve(PLAIN_JSON), JSON.stringify(data, null, 4) + '\n', 'utf8');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stage(label, fn) {
  const t0 = Date.now();
  try {
    const result = fn();
    const ms = Date.now() - t0;
    console.log(`${clrGreen('✓')} ${label}${ms > 50 ? clrDim(` (${ms}ms)`) : ''}`);
    return result;
  } catch (err) {
    console.error(`${clrRed('✗')} ${label} failed\n`);
    console.error(err.message);
    process.exit(1);
  }
}

// Map Plain package names to their npm package names (same as the compiler's
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
  // plain.json dependencies are also valid runtime declarations. They are
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
  const config = readPlainJson();
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
          `Plain will use its WebAssembly SQLite engine instead.`
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

// Compile a Plain program to JavaScript.
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
  stage('Checking runtime dependencies', () => ensureDependencies(files, readPlainJson(), true));
  const js = stage('Generating JavaScript', () =>
    files.map(({ ast }) => generate(ast, generationContext)).filter(s => s.trim()).join('\n'));
  return generationContext.needsAsync ? wrapAsync(js) : js;
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdRun(filePath, extraArgs = []) {
  if (!filePath) {
    console.error('Usage: plain run <file.pln>');
    process.exit(1);
  }
  const js = compile(filePath);
  console.log('');
  // Execute the generated file from the entry file's directory so Node
  // resolves require(...) against the project's local node_modules instead
  // of Plain's own (globally installed) package directory.
  const outputDir = path.dirname(path.resolve(filePath));
  const tmpFile = path.join(outputDir, '_plain_out.js');
  fs.writeFileSync(tmpFile, js, 'utf8');
  try {
    execFileSync(process.execPath, [tmpFile, ...extraArgs], { stdio: 'inherit' });
  } catch (e) {
    fs.unlinkSync(tmpFile);
    console.error('\nThe program exited with an error. See the message above.');
    process.exit(1);
  }
  fs.unlinkSync(tmpFile);
  console.log('\nDone.');
}

async function cmdBuild(filePath) {
  if (!filePath) {
    console.error('Usage: plain build <file.pln>');
    process.exit(1);
  }
  const js = compile(filePath);
  const outPath = filePath.replace(/\.pln$/, '.js');
  fs.writeFileSync(path.resolve(outPath), js, 'utf8');
  console.log(`\nOutput written to ${outPath}`);
}

async function cmdStart(extraArgs = []) {
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }
  const entry = config.entry || 'app.pln';
  if (!fs.existsSync(path.resolve(entry))) {
    console.error(`Entry file "${entry}" not found.`);
    process.exit(1);
  }
  await cmdRun(entry, extraArgs);
}

function cmdNew(projectName) {
  const name = projectName || 'my-plain-app';
  const dir  = path.resolve(name);

  if (fs.existsSync(dir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, 'public'));

  // app.pln — starter Express app
  fs.writeFileSync(path.join(dir, 'app.pln'), `use express

remember app as express()

serve folder "public"

when someone visits "/"
    reply "Hello from Plain!"
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

  // plain.json
  fs.writeFileSync(path.join(dir, PLAIN_JSON), JSON.stringify({
    name,
    version: '0.1.0',
    entry: 'app.pln',
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 4) + '\n');

  // package.json
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    description: `A Plain v${VERSION} application`,
    main: 'app.js',
    scripts: {
      start: 'plain run app.pln',
      build: 'plain build app.pln && node app.js',
    },
    dependencies: {
      express: '^4.18.2',
    },
  }, null, 2) + '\n');

  // README.md
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}

A Plain v${VERSION} application.

## Getting started

\`\`\`bash
plain install
plain run app.pln
\`\`\`

Then open http://localhost:3000 in your browser.
`);

  console.log(`✓ Created project "${name}"`);
  console.log(`\nNext steps:\n  cd ${name}\n  plain install\n  plain run app.pln`);
}

function cmdInit() {
  const jsonPath = path.resolve(PLAIN_JSON);
  if (fs.existsSync(jsonPath)) {
    console.log('Project already initialized.');
    return;
  }
  const name = path.basename(process.cwd());
  writePlainJson({
    name,
    version: '0.1.0',
    entry: 'app.pln',
  });
  // Keep the default entry discoverable and make `plain install` immediately
  // actionable after initialization.
  const entryPath = path.resolve('app.pln');
  if (!fs.existsSync(entryPath)) {
    fs.writeFileSync(entryPath, '// Plain application entry point\nshow "Hello from Plain"\n', 'utf8');
  }
  console.log(`✓ Created ${PLAIN_JSON}`);
}

// ── NEW plain install implementation (RFC-0009.2) ──────────────────────────

function cmdInstall() {
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }

  const entry = config.entry || 'app.pln';
  const entryPath = path.resolve(entry);
  if (!fs.existsSync(entryPath)) {
    console.error(`Entry file "${entry}" not found.`);
    process.exit(1);
  }

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
  console.log('Plain doctor\n');
  const check = (label, ok, detail = '') => {
    const suffix = detail ? ` — ${detail}` : '';
    console.log(`${ok ? clrGreen('✓') : clrRed('✗')} ${label}${suffix}`);
  };
  check('Node.js', Boolean(process.version));
  let npmVersion = '';
  try { npmVersion = runNpm(['--version'], { encoding: 'utf8' }).trim(); } catch (_) {}
  check('npm', Boolean(npmVersion), npmVersion);
  check('Plain CLI', true);
  check('Compiler', fs.existsSync(path.join(__dirname, 'parser.js')));
  check('Formatter', fs.existsSync(path.join(__dirname, 'formatter.js')));
  check('Runtime', fs.existsSync(path.join(__dirname, 'generator.js')));
  console.log('');

  const config = readPlainJson();
  check('Project configuration', Boolean(config), config ? 'plain.json found' : 'run plain init');
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
    console.error('Usage: plain add <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }

  if (!config.dependencies) config.dependencies = {};

  if (config.dependencies[packageName]) {
    console.log(`"${packageName}" is already listed in ${PLAIN_JSON}.`);
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
  writePlainJson(config);
  console.log(`✓ Added "${packageName}" to ${PLAIN_JSON}.`);
}

function cmdRemove(packageName) {
  if (!packageName) {
    console.error('Usage: plain remove <package>');
    process.exit(1);
  }
  if (!isValidPackageName(packageName)) {
    console.error(`Invalid package name: "${packageName}".`);
    process.exit(1);
  }
  const config = readPlainJson();
  if (!config) {
    console.error(`No ${PLAIN_JSON} found. Run "plain init" first.`);
    process.exit(1);
  }

  if (!config.dependencies || !config.dependencies[packageName]) {
    console.log(`"${packageName}" is not listed in ${PLAIN_JSON}.`);
  } else {
    delete config.dependencies[packageName];
    writePlainJson(config);
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
  console.log(`✓ Removed "${packageName}" from ${PLAIN_JSON}.`);
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

// Check syntax of a Plain file without generating JavaScript or executing.
function cmdCheck(filePath) {
  if (!filePath) {
    console.error('Usage: plain check <file.pln>');
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

// Format a Plain file in-place.
function cmdFmt(filePath) {
  if (!filePath) {
    console.error('Usage: plain fmt <file.pln>');
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
  console.log(`Plain v${VERSION}`);
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
        console.error(`Unknown command: "${command}". Run "plain help" for usage.`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});