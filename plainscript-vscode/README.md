# PlainScript Language — VS Code Extension

Syntax highlighting and language support for the [PlainScript programming language](https://github.com/ayoistooslick/plainscript) (`.pln` files).

---

## Features

- **Syntax highlighting** — keywords, strings, numbers, comments, operators, and function names
- **File icon** — `.pln` files get a distinctive icon in the file tree
- **Language registration** — VS Code recognises `.pln` as PlainScript source
- **Auto-closing pairs** — `()`, `[]`, `{}`, `""`, ` `` `
- **Comment toggling** — `Ctrl+/` / `Cmd+/` toggles `//` line comments
- **Bracket matching** — highlights matching brackets
- **Code folding** — fold `to`/`for each`/`while`/`when`/`web app`/`route` blocks
- **Snippets** — common PlainScript patterns (variables, functions, loops, web apps, databases, tests)

---

## Installation

### Option A — Install from VSIX (recommended for now)

1. Clone or download this repository.
2. Install `vsce` if you haven't already:
   ```bash
   npm install -g @vscode/vsce
   ```
3. Package the extension:
   ```bash
   cd plainscript-vscode
   vsce package
   ```
   This produces `plainscript-language-1.0.2.vsix`.
4. Install the VSIX in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Run **Extensions: Install from VSIX…**
   - Select the `.vsix` file

### Option B — Development mode (no packaging needed)

1. Open the `plainscript-vscode` folder in VS Code.
2. Press `F5` to launch the **Extension Development Host** — a new VS Code window opens with the extension active.
3. Open any `.pln` file to see syntax highlighting immediately.

---

## Highlighted keywords

| Category    | Keywords                                                                 |
|-------------|--------------------------------------------------------------------------|
| Control     | `otherwise` `else` `done` `for` `each` `every` `in` `while` `when` `try` `recover` |
| Declaration | `let` `remember` `set` `to` `use` `import` `export`                       |
| Action      | `be` `give back` `show` `serve` `raise` `fill`                          |
| Comparison  | `is` `equal` `greater` `less` `than` `above` `below` `at` `least` `most` `not` `empty` `contains` `starts` `ends` `with` `between` `and` `or` |
| Backend     | `web` `app` `group` `route` `start` `database` `query` `insert` `update` `delete` |
| Constant    | `true` `false` `null`                                                    |

---

## Requirements

- VS Code 1.70 or later
- No other extensions required

---

## License

MIT
