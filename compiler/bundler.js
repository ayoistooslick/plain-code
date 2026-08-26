// Bundler: resolves PlainScript import statements, builds a dependency graph,
// and returns a single concatenated JavaScript output.

const fs   = require('fs');
const path = require('path');
const { tokenize } = require('./lexer');
const { parse }    = require('./parser');
const { generate, createGenerationContext, wrapAsync } = require('./generator');

// Returns the import paths declared at the top level of an AST.
function getImports(ast) {
  return ast.body
    .filter(node => node.type === 'ImportStatement')
    .map(node => node.path);
}

// Resolves all dependencies of entryPath using DFS topological order.
// Returns an array of { absPath, ast } in compile order (deepest dependencies first).
// Throws on circular imports or missing files.
function resolveDependencies(entryPath) {
  const absoluteEntry = path.resolve(entryPath);
  const visited = new Set();  // fully processed files (don't revisit)
  const order   = [];         // final compile order

  function visit(absPath, stack) {
    // Already fully processed — skip (handles duplicate imports)
    if (visited.has(absPath)) return;

    // File is in the current DFS stack → circular dependency
    const cycleIdx = stack.indexOf(absPath);
    if (cycleIdx !== -1) {
      const cycle = [...stack.slice(cycleIdx), absPath]
        .map(p => `  "${path.relative(process.cwd(), p) || path.basename(p)}"`)
        .join(' →\n');
      throw new Error(
        `Circular import detected:\n${cycle}\n\nPlain cannot compile files with circular dependencies.`
      );
    }

    // File does not exist
    if (!fs.existsSync(absPath)) {
      throw new Error(
        `Cannot find file "${path.relative(process.cwd(), absPath) || absPath}".\n\nMake sure the file exists and the path is correct.`
      );
    }

    // Parse the file to discover its own imports.
    // Annotate any tokenise/parse error with the filename so callers see
    // "file.ps — Line N, Column N: …" rather than a bare positional message.
    const source = fs.readFileSync(absPath, 'utf8');
    let tokens, ast;
    try {
      tokens = tokenize(source);
      ast    = parse(tokens);
    } catch (err) {
      const relPath = path.relative(process.cwd(), absPath) || path.basename(absPath);
      throw new Error(`${relPath} — ${err.message}`);
    }

    // Recurse into each import before processing this file (DFS)
    const newStack = [...stack, absPath];
    for (const importPath of getImports(ast)) {
      const dir         = path.dirname(absPath);
      const resolvedAbs = path.resolve(dir, importPath);
      visit(resolvedAbs, newStack);
    }

    // All dependencies are done — add this file to the order
    visited.add(absPath);
    order.push({ absPath, ast });
  }

  visit(absoluteEntry, []);
  return order;
}

// Compile all files in dependency order into one JavaScript string.
function bundle(entryPath) {
  const files = resolveDependencies(entryPath);
  const context = createGenerationContext();
  const parts = files.map(({ ast }) => generate(ast, context)).filter(js => js.trim() !== '');
  const js = parts.join('\n');
  return context.needsAsync ? wrapAsync(js) : js;
}

module.exports = { bundle, resolveDependencies };
