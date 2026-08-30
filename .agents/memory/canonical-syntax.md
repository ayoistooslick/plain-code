---
name: Canonical syntax workflow
description: Durable rule for keeping PlainScript examples, docs, and editor tooling aligned with the compiler.
---

PlainScript documentation and examples must follow the grammar implemented by
the compiler, not historical prose or legacy examples. Maintained `.pln`
programs should be validated with `plainscript check` whenever the language
reference or editor snippets change.

**Why:** The repository contains several generations of syntax and the parser
has stricter rules than some older documentation suggests. Treating prose as
the authority causes examples to drift and makes generated tooling teach forms
that do not compile.

**How to apply:** Use current parser-accepted forms in README, docs, examples,
samples, templates, snippets, and grammars. Preserve intentionally negative
circular-import fixtures as test cases rather than treating their check
failure as a migration defect.