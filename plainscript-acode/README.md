# PlainScript for Acode

Syntax highlighting for the PlainScript programming language (`.ps`) in
[Acode](https://acode.app), implemented with Acode's modern CodeMirror 6
`editorLanguages` API.

## Features

- Automatic `.ps` file recognition
- Syntax highlighting derived from the PlainScript compiler itself
  (`compiler/lexer.js`, `compiler/parser.js`, `compiler/generator.js`)
- Structural keywords (declarations, control flow, web, database, gateway)
- Multi-word comparison phrases (`is above`, `is at least`, `between ... and`,
  `contains`, `starts with`, ...)
- expression words (`first ... from`, `... of ...`, `... length`,
  `add/remove/write` calls)
- Numbered-item number words (`player one from players`)
- Strings, numbers, `//` comments and `note:` documentation comments
- Route paths (`route "/"`, `when someone visits "/path"`) in a distinct
  string style
- `use` package/module names (including scoped `@scope/pkg` and hyphenated
  names)
- Standard-library function calls (`readFile(...)`, `jsonEncode(...)`, ...)
- JavaScript gateway blocks (`javascript ... done`) highlighted as JavaScript
- SQL blocks (`query ... done`, `insert ... done`, ...) kept visually distinct
  from PlainScript code

## Installation

1. Zip the contents of this directory (`plugin.json`, `main.js`,
   `stream-spec.js`, `README.md`).
2. Open Acode → Settings → Plugins → "+" and select the zip.
3. Open any `.ps` file — highlighting applies automatically.

## What this plugin does not do

PlainScript for Acode only provides syntax highlighting and `.ps` file
recognition. It does **not** run the PlainScript compiler, provide LSP
diagnostics, autocomplete, formatting, or terminal integration.

## Compatibility

- Requires Acode's CodeMirror 6 editor (`minVersionCode` 290).
- Registers the `.ps` language through `acode.require("editorLanguages")`
  (modern API). If `editorLanguages` is missing (older Ace-based Acode
  builds), the plugin falls back to the legacy `aceModes` API. If neither
  API is available, the plugin fails gracefully with a descriptive console
  error instead of throwing an opaque TypeError.

## Development

The highlighting rules live in `stream-spec.js`, a pure CommonJS module with
no CodeMirror dependency. The PlainScript test suite (`npm test`) exercises it
directly from `tests/compiler.test.js`, so the tokenizer is verified with the
same code the editor runs.

Compatible with PlainScript v0.1.7.
