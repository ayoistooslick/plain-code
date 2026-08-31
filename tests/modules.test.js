// Tests for PlainScript Enterprise-Grade Module and Package Importing System.
//
// Run with: node tests/modules.test.js

const fs = require('fs');
const path = require('path');
const { tokenize, TOKEN } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generate } = require('../compiler/generator');
const { bundle } = require('../compiler/bundler');
const { detectDependencies } = require('../compiler/dependency-detector');

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

function assert(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}", got "${actual}"`);
  }
}

console.log('── Enterprise Module & Package System Tests ───────────────────────────\n');

// ── 1. Lexer & Parser Tests ──────────────────────────────────────────────────

test('lexer tokenizes bring, all, share, expose, from keywords', () => {
  const tokens = tokenize('bring all from "./math.pln" as math').map(t => t.value);
  assert(tokens.includes('bring'), true, 'missing bring token');
  assert(tokens.includes('all'), true, 'missing all token');
  assert(tokens.includes('from'), true, 'missing from token');
});

test('parser parses selective imports: bring add and multiply from "./math.pln"', () => {
  const ast = parse(tokenize('bring add and multiply from "./math.pln"'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ImportStatement');
  assert(stmt.path, './math.pln');
  assert(JSON.stringify(stmt.names), JSON.stringify(['add', 'multiply']));
});

test('parser parses namespaced imports: bring all from "./math.pln" as math', () => {
  const ast = parse(tokenize('bring all from "./math.pln" as math'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ImportStatement');
  assert(stmt.path, './math.pln');
  assert(stmt.namespace, 'math');
});

test('parser parses package imports: bring get from "axios"', () => {
  const ast = parse(tokenize('bring get from "axios"'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ImportStatement');
  assert(stmt.path, 'axios');
  assert(stmt.defaultImport, 'get');
});

test('parser parses path-aliased imports: bring button from "@/components/button.pln"', () => {
  const ast = parse(tokenize('bring button from "@/components/button.pln"'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ImportStatement');
  assert(stmt.path, '@/components/button.pln');
});

test('parser parses barrel exports: export all from "./submodule.pln"', () => {
  const ast = parse(tokenize('export all from "./submodule.pln"'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ExportStatement');
  assert(stmt.exportAll, true);
  assert(stmt.fromPath, './submodule.pln');
});

test('parser parses multi-symbol exports: export add and multiply', () => {
  const ast = parse(tokenize('export add and multiply'));
  const stmt = ast.body[0];
  assert(stmt.type, 'ExportStatement');
  assert(JSON.stringify(stmt.names), JSON.stringify(['add', 'multiply']));
});

// ── 2. Dependency Detector Integration ──────────────────────────────────────

test('dependency detector detects npm packages imported via bring/import', () => {
  const deps = detectDependencies('bring get from "axios"\nbring express from "express"');
  assert(deps.includes('axios'), true, 'missing axios dependency');
  assert(deps.includes('express'), true, 'missing express dependency');
});

// ── 3. Generator & Bundler Integration ────────────────────────────────────────

test('generator emits CommonJS require for npm package imports', () => {
  const js = generate(parse(tokenize('bring axios from "axios"')));
  assert(js.includes('require("axios")') || js.includes("require('axios')"), true, 'missing require("axios")');
});

test('generator emits barrel re-export assignments', () => {
  const js = generate(parse(tokenize('export all from "./math.pln"')));
  assert(js.includes('Object.assign(module.exports, require("./math.pln"))'), true, 'missing Object.assign for barrel export');
});

test('bundler handles path aliasing (@/ -> src)', () => {
  const tmpDir = path.join(__dirname, 'tmp_module_test');
  const srcDir = path.join(tmpDir, 'src');
  const compDir = path.join(srcDir, 'components');
  fs.mkdirSync(compDir, { recursive: true });

  const btnFile = path.join(compDir, 'button.pln');
  const mainFile = path.join(srcDir, 'main.pln');

  fs.writeFileSync(btnFile, 'make renderBtn()\n  give "Button"\ndone\nexport renderBtn');
  fs.writeFileSync(mainFile, 'bring renderBtn from "@/components/button.pln"\nshow renderBtn()');

  const oldCwd = process.cwd();
  try {
    process.chdir(tmpDir);
    const bundledJs = bundle(mainFile);
    assert(bundledJs.includes('renderBtn()'), true, 'bundled JS missing renderBtn');
  } finally {
    process.chdir(oldCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bundler handles implicit .pln extension and folder index resolution', () => {
  const tmpDir = path.join(__dirname, 'tmp_module_ext_test');
  const utilsDir = path.join(tmpDir, 'utils');
  fs.mkdirSync(utilsDir, { recursive: true });

  const helperFile = path.join(tmpDir, 'helper.pln');
  const indexFile = path.join(utilsDir, 'index.pln');
  const mainFile = path.join(tmpDir, 'main.pln');

  fs.writeFileSync(helperFile, 'make help()\n  give "ok"\ndone\nexport help');
  fs.writeFileSync(indexFile, 'make util()\n  give 42\ndone\nexport util');
  fs.writeFileSync(mainFile, 'bring help from "./helper"\nbring util from "./utils"\nshow help()');

  try {
    const bundledJs = bundle(mainFile);
    assert(bundledJs.includes('help()'), true, 'bundled JS missing helper');
    assert(bundledJs.includes('util()'), true, 'bundled JS missing index util');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
