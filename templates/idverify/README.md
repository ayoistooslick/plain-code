# idverify — PlainScript ID-verification npm SDK (template)

A working, publish-ready npm SDK written 100% in PlainScript. It fingerprints
documents with SHA-256, parses machine-readable document lines, and produces a
deterministic verification result — no runtime npm packages required (only Node
built-ins).

## Layout

```
templates/idverify/
├── package.json     # npm package; main → dist/index.js
└── src/
    ├── index.pln     # public entry: re-exports the SDK surface
    ├── hash.pln      # SHA-256 fingerprinting / digest helpers
    ├── mrz.pln       # machine-readable zone parsing
    ├── verify.pln    # the verification workflow
    └── demo.pln      # runnable demo
```

## Run it

```bash
npm install --save-dev plainscript-lang   # install the compiler
plainscript build                    # src/ → dist/
plainscript run src/demo.pln          # run the demo
node -e "console.log(require('./dist/index.js').verifyDocument({ holder: 'ADA LOVELACE' }))"
```

`plainscript build` (no argument) compiles every `.pln` under `src/` to `dist/`.
Every top-level `define` function is exported from the built file, so consumers
`require('idverify')` it like any Node package.

## Example output

```
{"holder":"ADA LOVELACE","documentType":"P","number":"UTOLOVELACE","ok":true,"fingerprint":"b7a1eba3..."}
```

See `templates/` sibling `oauth` for a second, equally runnable template, and
the language reference in `knowledge.md`.
