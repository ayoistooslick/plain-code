---
name: Runtime package setup
description: Replit package-management behavior relevant to Node runtime and lockfile changes
---

When project dependencies require a newer Node version, package-management runtime changes can alter the active shell runtime and may create a local checkpoint or rewrite lockfile registry metadata.

**Why:** A dependency install can succeed while leaving the shell on a different Node command, and it can add environment-specific resolved URLs or dependency drift that does not belong in the project diff.

**How to apply:** After installing packages, verify the active Node binary explicitly, rerun checks with that runtime, inspect package.json/package-lock.json, restore unrelated lockfile changes, and confirm the final worktree is staged-only when requested.