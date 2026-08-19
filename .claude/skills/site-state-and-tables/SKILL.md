---
name: site-state-and-tables
description: How the portfolio fetches GitHub, caches it, reports status and errors, filters, searches, keeps URL state, handles keyboard and view modes, and how its tables fold and sort. Use before touching the fetch, the cache, filters, search, the command palette, view modes, a table, a fold, or sorting.
---

# State, data and tables

| Touching… | Read |
| --- | --- |
| GitHub fetch, cache, status and error copy, filters, URL state, search, keyboard, view modes | [reference/state-and-data.md](reference/state-and-data.md) |
| Folds, static sorting, the Projects table shape | [reference/tables.md](reference/tables.md) |

## The traps that bite hardest

- **Never assemble HTML from remote data.** Build nodes, set `textContent`.
  There is deliberately no `escapeHTML()` in `script.js`; Trusted Types makes any
  `innerHTML` write throw — clear with `textContent = ""`.
- **The Projects list is never hardcoded** and never falls back to a baked-in
  list. Curate by tagging on GitHub, never by an allowlist in the code.
- **A stated failure needs a way to act on it.** Every error path names the fix
  and offers Retry.
- **Exercise controls, do not read them.** Sort, filter and Retry have each
  looked correct in the markup while being broken in fact.

After any change here run `verify-site`, and `audit-untrusted-input` if the
render path, the cache shape or the fields read from the API moved.
