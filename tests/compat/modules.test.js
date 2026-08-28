const path = require('path');
const { test, assert, tmpDir, write, runFile } = require('./_util');

test('modules: plain import bundles a helper into caller scope', () => {
  const dir = tmpDir();
  write(dir, 'helper.ps', 'make double(n)\n    give n * 2\ndone\n');
  write(dir, 'main.ps', 'import "./helper.ps"\nshow double(4)\n');
  const out = runFile(path.join(dir, 'main.ps'), { cwd: dir });
  assert(out.includes('8'), `expected bundled call:\n${out}`);
});

test('modules: named import form is accepted', () => {
  const dir = tmpDir();
  write(dir, 'math.ps', 'remember pi as 3.14\nmake area(r)\n    give pi * r * r\ndone\n');
  write(dir, 'main.ps', 'import { area } from "./math.ps"\nshow area(1)\n');
  const out = runFile(path.join(dir, 'main.ps'), { cwd: dir });
  assert(out.includes('3.14'), `expected named import result:\n${out}`);
});

test('modules: transitive imports resolve transitively', () => {
  const dir = tmpDir();
  write(dir, 'base.ps', 'make baseVal()\n    give "from-base"\ndone\n');
  write(dir, 'mid.ps', 'import "./base.ps"\nmake midVal()\n    give baseVal()\ndone\n');
  write(dir, 'main.ps', 'import "./mid.ps"\nshow midVal()\n');
  const out = runFile(path.join(dir, 'main.ps'), { cwd: dir });
  assert(out.includes('from-base'), `expected transitive import:\n${out}`);
});

const { summary } = require('./_util');
summary();
