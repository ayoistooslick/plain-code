# oauth — PlainScript unified OAuth npm SDK (template)

A working, publish-ready npm SDK written 100% in PlainScript. It unifies
multiple OAuth 2.0 providers behind one interface: build authorization URLs,
exchange authorization codes for access + refresh tokens, and validate tokens.
No runtime npm packages required (only Node built-ins).

## Layout

```
templates/oauth/
├── package.json     # npm package; main → dist/index.js
└── src/
    ├── index.ps     # public entry: re-exports the whole SDK surface
    ├── crypto.ps    # token/state primitives (HS256 JWT via built-ins)
    ├── providers.ps # provider registry (google, github, ...)
    ├── oauth.ps     # buildAuthUrl / exchangeCode flow
    └── demo.ps      # runnable demo
```

## Run it

```bash
npm install --save-dev plainscript-lang   # install the compiler
plainscript build                    # src/ → dist/
plainscript run src/demo.ps          # run the demo
node -e "console.log(require('./dist/index.js').buildAuthUrl('github', 'ID', 'https://app.dev/cb', 'st8'))"
```

`plainscript build` (no argument) compiles every `.ps` under `src/` to `dist/`.
Every top-level `make` function is exported from the built file, so consumers
`require('oauth')` it like any Node package.

## Example output

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=GID-123&redirect_uri=...&scope=openid email profile&state=state-abc
{"provider":"github","ok":true,"accessToken":"eyJhbGciOiJIUzI1NiIs...","refreshToken":"eyJhbGciOiJIUzI1NiIs...","scope":"read:user user:email"}
{"sub":"GH-ID","provider":"github","kind":"access","iat":1787903452,"exp":1787907052}
```

See `templates/` sibling `idverify` for a second, equally runnable template, and
the language reference in `knowledge.md`.
