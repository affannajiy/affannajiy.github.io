# Deployment

`master` → GitHub Pages, served at the repo root. **Push is the deploy**; there
is no pipeline to break.

Full steps and failure symptoms are in the `deploy-site` skill and `README.md`.

---

## Two preconditions, both silent failures

- The repo must stay named **`affannajiy.github.io`** — any other name moves the
  site off the root domain onto a `/subpath/`. The name that matters is the one
  on GitHub, not the folder on disk.
- The repo must stay **public** — Pages from a private repo needs a paid plan.

Neither produces a useful error message. Both just serve the wrong thing, or
nothing.

## What ships

Everything committed. GitHub Pages serves the repo verbatim, so `CLAUDE.md`,
`docs/`, `.claude/` and the rest are reachable at their paths. That is harmless
and is **not** a reason to add a build step to strip them — nothing links to
them and no page loads them.

## Before pushing

Run the `verify-site` round. There is no CI to catch anything, so the last
measurement before the push is the only measurement.
