# mycli — PlainScript CLI Tool Template

A complete, publish-ready CLI tool template written 100% in PlainScript. Features argument parsing, interactive prompts, colored output, subcommands with their own flags, and global options.

## Layout

```
templates/cli-tool/
├── package.json       # npm package with bin entry
└── src/
    └── cli.pln        # Main CLI implementation
```

## Features

- **Argument Parsing** — Custom parser supporting short (`-v`), long (`--verbose`), and combined (`-vq`) flags
- **Interactive Prompts** — Uses `ask` for user input during commands
- **Colored Output** — ANSI color codes for beautiful terminal output
- **Subcommands** — `init`, `build`, `deploy`, `config`, `help` with their own flags
- **Global Flags** — `--verbose`, `--quiet`, `--version`, `--help`
- **Installable** — `bin` entry in package.json for global installation

## Quick Start

```bash
# Install the compiler
npm install --save-dev plainscript-lang

# Build the CLI
plainscript build

# Run locally
node dist/cli.js --help
node dist/cli.js init --name my-project

# Or run directly with plainscript
plainscript run src/cli.pln init
```

## Installation

```bash
# Install globally (after publishing to npm)
npm install -g @plainscript/cli-tool-template

# Or use npx
npx @plainscript/cli-tool-template --help
```

## Commands Reference

### Global Options

| Flag | Short | Description |
|------|-------|-------------|
| `--verbose` | `-v` | Enable verbose/debug output |
| `--quiet` | `-q` | Suppress non-error output |
| `--version` | | Show version number |
| `--help` | `-h` | Show help message |

---

### `init` — Initialize a new project

```bash
mycli init [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--name <name>` | `-n` | Project name |
| `--template <template>` | `-t` | Template: `react`, `vue`, `vanilla`, `node` (default: `vanilla`) |
| `--dir <directory>` | `-d` | Target directory (default: current) |
| `--git` | | Initialize git repository |
| `--install` | | Install dependencies after init |
| `--yes` | `-y` | Skip prompts, use defaults |

**Examples:**
```bash
mycli init -n my-app -t react --git --install
mycli init --name my-project --template vue --yes
mycli init  # Interactive mode
```

---

### `build` — Build the project for production

```bash
mycli build [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--out <dir>` | `-o` | Output directory (default: `dist`) |
| `--production` | `-p` | Production build (minified) |
| `--source-map` | | Generate source maps |
| `--clean` | | Clean output directory before build |
| `--watch` | | Watch for changes and rebuild |

**Examples:**
```bash
mycli build --production --out build --clean
mycli build -p --source-map
mycli build --watch
```

---

### `deploy` — Deploy the project to a target

```bash
mycli deploy [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--target <target>` | `-t` | Deploy target: `aws`, `vercel`, `netlify`, `docker`, `k8s`, `firebase` (default: `vercel`) |
| `--region <region>` | `-r` | Target region (default: `us-east-1`) |
| `--env <environment>` | `-e` | Environment: `staging`, `production` (default: `production`) |
| `--dry-run` | | Simulate deployment without changes |
| `--force` | | Force deployment without confirmation |

**Examples:**
```bash
mycli deploy --target vercel --env production
mycli deploy -t aws -r eu-west-1 --dry-run
mycli deploy --target netlify --force
```

---

### `config` — Manage configuration

```bash
mycli config <subcommand> [options]
```

| Subcommand | Description |
|------------|-------------|
| `get <key>` | Get a configuration value |
| `set <key> <value>` | Set a configuration value |
| `list` | List all configuration |
| `delete <key>` | Delete a configuration value |
| `reset` | Reset to defaults |

| Option | Description |
|--------|-------------|
| `--global` | Use global config |
| `--local` | Use local config (default) |

**Examples:**
```bash
mycli config get api.key
mycli config set deploy.target vercel
mycli config list --global
mycli config delete build.outDir
mycli config reset
```

---

### `help` — Show help

```bash
mycli help [command]
```

Shows general usage or command-specific help.

**Examples:**
```bash
mycli help
mycli help init
mycli help deploy
```

## Development

```bash
# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure (PlainScript)

```
src/cli.pln
├── ANSI color constants
├── Global state (verbose, quiet, version)
├── Utility functions (log, colorize, printBanner, printUsage)
├── Argument parser (parseArgs, getFlag, getArgs, hasFlag)
├── Command implementations (cmdInit, cmdBuild, cmdDeploy, cmdConfig, cmdHelp, cmdVersion)
└── Main entry point (main)
```

## Extending the Template

### Adding a New Command

1. Add a new `cmd<Command>` function in `src/cli.pln`
2. Add the command to the `when` block in `main`
3. Add help text in `printCommandHelp`
4. Export if needed

### Adding Global Flags

1. Check flag in `main` before command dispatch
2. Store in global variable
3. Use in command functions

### Customizing Colors

Modify the ANSI constants at the top of `src/cli.pln`:

```plainscript
const MY_COLOR = "\x1b[38;5;208m"  // 256-color
const MY_BG = "\x1b[48;5;22m"
```

## Publishing

```bash
# Update version in package.json
npm version patch

# Build
npm run build

# Publish
npm publish --access public
```

## License

MIT — Feel free to use this template for your own CLI tools!