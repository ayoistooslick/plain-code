# Add PlainScript support to GitHub Linguist

You are an OpenCode AI agent working in a clone of **`github/linguist`**. Your task is
to add a brand-new language called **PlainScript** (.pln) to Linguist so that GitHub
correctly detects and highlights PlainScript files. Use your own web search / `git
log` as needed to confirm current Linguist conventions, but the instructions below
are complete enough to get you started.

Follow Linguist's own contributing rules. When you are done, open a pull request
against `github/linguist` and post the PR URL.

---

## 1. Language facts about PlainScript

- **Name**: PlainScript
- **Extension**: `.pln`
- **Type**: programming
- **Color**: pick one you like (e.g. `#2b4d3a` — a deep green)
- **Group**: `PlainScript`
- **Aliases**: `plainscript`, `plain`, `pln`
- **ACE mode / Codemirror mode / Textmate scope**: there is no official ACE mode yet.
  Configure Chroma yourself (see step 3); for ACE/Codemirror/Textmate, set a generic
  `text` scope unless you write a syntax file. It is acceptable to leave the
  ACE/Codemirror modes as a sane generic value and rely on Chroma for actual
  highlighting.
- **Searchable**: true
- **Grammar / language-server**: none required by Linguist.

### Purpose of the language
PlainScript is an **intent-oriented programming language** that compiles to Node.js.
A programmer writes readable, sentence-like `.pln` source describing the result they
want, and a compiler turns it into JavaScript. Example files live in the
`examples/` and `samples/` folders of the PlainScript repository.

### Core vocabulary (useful for building the Chroma grammar)
Statements / keywords commonly seen in `.pln` source:
- `web app`
- `route get "<path>"` / `route post "<path>"`
- `reply json` / `reply file "<path>"` / `reply text`
- `allow cors`
- `remember <name> as <value>`
- `start <port>`
- `show <expr>`
- `if` / `otherwise` / `done`
- `for each <item> in <list>` / `while ... done`
- `make <name>(args) ... done`
- `database "<file>"`, `execute ... done`, `insert ... done`, `update ... done`,
  `delete ... done`, `remember <x> as query ... done`
- `mongo "<uri>" db "<name>"`
- `try ... recover ... done`
- `stream "<file>" as <line> ... done`
- built-in calls like `env("KEY")`, `body("field")`, `chatWith(provider, model, msgs)`,
  `ocr "file.png" as text`, `sha256Buffer(...)`

Comments are `//` line comments (and strings/backtick templates hold prose, so treat
backtick blocks as strings).

---

## 2. Files you must modify in Linguist

Create or edit these files. Match the exact style of existing entries (read a few
similar languages, e.g. a language with one extension and Chroma support, before
writing).

1. **`lib/linguist/languages.yml`** — add a new top-level entry:

   ```yaml
   PlainScript:
     type: programming
     color: "#2b4d3a"
     extensions:
     - ".pln"
     aliases:
     - plainscript
     - plain
     - pln
     searchable: true
     group: PlainScript
     tm_scope: text
     ace_mode: text
     codemirror_mode: text
     codemirror_mime_type: text/plain
   ```

   - Keep entries alphabetized. Place `PlainScript` near other `P...` names.
   - `extensions` must be sorted and unquoted.
   - Add `language_id` — Linguist normally assigns an unused numeric id
     automatically. Inspect `lib/linguist/languages.yml` for the current highest
     `language_id` and the auto-numbering rule, then add a fresh unused id that
     follows their convention (they reserve ranges; pick one that is not taken).
   - IMPORTANT: verify the exact required fields by reading existing entries —
     Linguist's schema evolves. If any field above is no longer valid, adjust to
     match current entries.

2. **`lib/linguist/vendor.yml`** (only if needed) — if `.pln` could collide with
   anything, extend the vendor list; usually not required for a fresh extension.
   Check whether `.pln` is already claimed by another language (`grep .pln` across
   the repo). If it is, you must reconcile the conflict (e.g. add to the
   `ambiguous` handling or document the override) rather than silently overwrite.

3. **`lib/linguist/samples/PlainScript/`** — create a new samples directory for the
   language and add representative `.pln` sample files. Linguist uses these for
   the classifier training and validation. Include a handful of realistic files:
   a simple hello-world, a web app with routes, a Mongo-backed chat bot, and a
   data/collections example. Each sample must be actual valid PlainScript.

4. **`test/test_blob.rb`** — add a test case (if the test file covers all languages)
   that points at a sample file and asserts it is classified as `PlainScript`. Look
   at how neighboring languages are tested and mirror that.

5. **`.gitattributes`** in the `samples/PlainScript/` folder (Linguist convention) —
   some languages add a `.gitattributes` to keep generated files out of the
   classifier. Add one only if the samples include generated data; otherwise omit.

6. **`grammars/` / Textmate scope** — skip unless you want to author a full
   Textmate grammar. For Chroma highlighting (below) is where real coloring happens.

---

## 3. Add Chroma highlighting (recommended, this is what GitHub uses)

Linguist stores highlighter grammars under **`vendor/grammars/chroma/`** as YAML
files consumed by Chroma. To give PlainScript real syntax highlighting:

- Look at how an existing Chroma language is defined, e.g.
  `vendor/grammars/chroma/go.yaml` or a small one, to copy the structure
  (keys for keywords, literals, strings, comments, namespaces, etc.).
- Create `vendor/grammars/chroma/plaintext.yaml` style override only if useful — but
  better, register a dedicated Chroma alias so highlighting works:
  - Add `PlainScript` with Chroma support in `lib/linguist/samples/` plus a
    `chroma` registration in the Chroma YAML list (see how `C:\...` entries map).
- Keep the grammar modest but real: highlight the `//` comments, string/backtick
  literals, the keywords listed in section 1, numbers, and function/builtin calls.

If a full Chroma grammar is too much, set `plaintext` as the Chroma/Ally is fine,
but you should try to add at least keyword and comment highlighting.

---

## 4. Regenerate derived data and run the test suite

Linguist maintains generated artifacts that must be refreshed. Do the following
exactly as the repo's own docs instruct:

```bash
bundle install

# Regenerate the language samples inventory / classifier data
bundle exec rake samples

# Regenerate any serialized data files
bundle exec rake all   # or the repo's documented regeneration task

# Run the full test suite
bundle exec rake test
```

If `rake samples` fails because a PlainScript sample is not valid, fix the sample
(or check the language is recognized) and re-run.

Committed generated files (e.g. `lib/linguist/samples.json`,
`lib/linguist/colors.json`, classifier dumps under `classifier/`) **must** be
regenerated and included in the PR. Do not hand-edit these.

---

## 5. Sanity checks before you open the PR

- `bundle exec rake test` passes with **zero failures**.
- A sample `.pln` file is detected as PlainScript. You can verify locally with:
  ```bash
  bin/linguist path/to/sample.pln
  ```
  (adjust to the repo's actual CLI entrypoint; `./bin/linguist` is historical —
  check the current command).
- No other language claims `.pln`; if any test or `rake` emits a conflict about
  `.pln`, resolve it by following Linguist's disambiguation rules.
- `git status` shows: `lib/linguist/languages.yml`,
  `lib/linguist/samples/PlainScript/*`, the regenerated data files, and the test
  additions. No stray or unrelated changes.

---

## 6. Open the pull request

- Use `gh` (GitHub CLI) to open a PR against `github/linguist`.
- Title: `Add PlainScript language`
- PR body: summarize what you added (languages.yml entry, samples, chroma grammar,
  tests) and note that PlainScript is an intent-oriented language compiled to
  Node.js with the `.pln` extension.
- Provide the PR URL as your final output.

If anything in this guide conflicts with how the current Linguist codebase actually
works (field names, rake tasks, Chroma registration, test harness), **prefer the
live repo's conventions** and adapt. When done, return the PR URL.
