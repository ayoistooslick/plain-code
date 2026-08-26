# PLINJS Language — VS Code Extension

Syntax highlighting and language support for the [PLINJS programming language](https://github.com/ayoistooslick/plain-code) (`.pln` files).

---

## Features

- **Syntax highlighting** — keywords, strings, numbers, comments, operators, and function names
- **File icon** — `.pln` files get a distinctive icon in the file tree
- **Language registration** — VS Code recognises `.pln` as PLINJS source
- **Auto-closing pairs** — `()`, `[]`, `{}`, `""`
- **Comment toggling** — `Ctrl+/` / `Cmd+/` toggles `//` line comments
- **Bracket matching** — highlights matching brackets
- **Code folding** — fold `make`/`if`/`for each`/`while`/`when`/`listen` blocks

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
   cd plinjs-vscode
   vsce package
   ```
   This produces `plinjs-language-0.1.7.vsix`.
4. Install the VSIX in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Run **Extensions: Install from VSIX…**
   - Select the `.vsix` file

### Option B — Development mode (no packaging needed)

1. Open the `plinjs-vscode` folder in VS Code.
2. Press `F5` to launch the **Extension Development Host** — a new VS Code window opens with the extension active.
3. Open any `.pln` file to see syntax highlighting immediately.

---

## Highlighted keywords

| Category    | Keywords                                                                 |
|-------------|--------------------------------------------------------------------------|
| Control     | `if` `otherwise` `done` `for` `each` `in` `while` `when` `listen`       |
| Declaration | `remember` `make` `use` `import`                                         |
| Action      | `becomes` `as` `give` `show` `reply` `serve` `note`                     |
| Comparison  | `is` `greater` `less` `than` `above` `below` `at` `least` `most` `not` `empty` `contains` `starts` `ends` `with` `between` `and` |
| Constant    | `true` `false`                                                           |

---

## Requirements

- VS Code 1.70 or later
- No other extensions required

---

## License

MIT
