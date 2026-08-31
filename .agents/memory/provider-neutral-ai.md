---
name: Provider-neutral AI
description: The project’s AI integration boundary for compatible providers and documentation.
---

PlainScript AI support should remain provider-neutral: use the OpenAI-compatible
chat and embeddings request shapes, provider presets for common services, and
custom endpoint/key options for other compatible APIs.

**Why:** This lets Telegram bots, web routes, scheduled jobs, and ordinary
programs share one implementation without duplicating provider-specific syntax.

**How to apply:** Keep credentials in environment variables, preserve explicit
provider and custom endpoint options, and compile every documented AI example
through the documentation validation test.