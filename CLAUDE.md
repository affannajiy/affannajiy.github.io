# CLAUDE.md — index and hard constraints

A zero-dependency static portfolio served by GitHub Pages. **This file is a map,
not a manual.** It holds the eight constraints that must never be broken quietly,
and points at where everything else lives. Keep it under 200 lines — see the
`record-decision` skill for what goes where.

If a requested change requires breaking a rule below, **say so and propose an
alternative** rather than breaking it quietly.

---

## 1. Hard constraints

Never break these. Every one of them is enforced or load-bearing.

| # | Rule | Why |
| --- | --- | --- |
| 1.1 | **No frameworks.** No React, Vue, Tailwind, jQuery, or any runtime library. | The site must stay readable and editable years from now with no toolchain. |
| 1.2 | **No build step.** No npm, bundler, transpiler, preprocessor, or CI build. | GitHub Pages serves the repo verbatim. What is committed is what ships. |
| 1.3 | **No dependencies of any kind**, including CDN `<script>`/`<link>` tags and web fonts. | Every external request is a new failure mode and a new privacy leak. |
| 1.4 | **Exactly four source files**: `index.html`, `style.css`, `script.js`, `assets/`. | Adding files is the first step toward needing a build step. See "What is not source" below. |
| 1.5 | **No secrets in the repo.** Never add a GitHub token to `script.js`. | The file is public. A committed token is a leaked token. |
| 1.6 | **No analytics, trackers, cookies, or consent banners.** | Nothing here needs consent. Keep it that way. |
| 1.7 | **The CSP in `index.html` is load-bearing.** `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `connect-src https://api.github.com`, `require-trusted-types-for 'script'`. | It makes 1.1–1.3 something the browser enforces, not a convention. Never add `unsafe-inline` to silence a violation — fix the code. Trusted Types means **any** `innerHTML` write now throws, clearing included: clear with `textContent = ""`. |
| 1.8 | **No inline `style` attributes and no inline `<script>`.** Widths, colours and behaviour live in `style.css` / `script.js`. | The CSP blocks them, and a blocked inline style fails *silently* in layout. |

**What is not source.** `CLAUDE.md`, `README.md`, `SECURITY.md`,
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `docs/`, `.github/` and
`.claude/` are tooling and documentation — nothing links to them and no page
loads them. Pages will still serve them at their paths; that is harmless and is
**not** a reason to add a build step to strip them.

**Three rules that follow from 1.7 / 1.8 and bite hardest:**

- **Never assemble HTML from remote data.** Build DOM nodes and set
  `textContent`. There is deliberately no `escapeHTML()` in `script.js` — the
  one it had left quotes unescaped and produced a live attribute injection, and
  repairing it would only have reset the trap (`docs/security-posture.md` §3).
  Since 2026-08-17 the CSP enforces this in Chrome/Edge, so a string assigned to
  `innerHTML` throws instead of shipping.
- The CSP does **not** stop CSSOM writes, so a width set from JS is not blocked —
  it is an invariant broken quietly. Data bars are drawn with block characters
  instead (`docs/layout.md` §4).
- **A rule that sets `display` overrides the `hidden` attribute.** Any component
  styled `display: flex/grid/block` needs its own `[hidden] { display: none }`,
  or it renders while claiming to be hidden (`docs/layout.md` §3a).
- Never invent content to fill a gap. Unfinished content is marked with a visible
  `.hint` (`docs/content-rules.md` §2).

## 2. Where everything is

**Read the relevant doc before changing the thing it describes.** These are not
background reading; they hold the reasons that make a change safe.

| I am about to… | Read |
| --- | --- |
| Find out what the site already does | [`docs/feature-inventory.md`](docs/feature-inventory.md) |
| Change a colour, token, or typeface | [`docs/design-system.md`](docs/design-system.md) |
| Add or restyle any interactive control | [`docs/accessibility.md`](docs/accessibility.md) |
| Touch the grid, the sticky header, or anything wanting a width | [`docs/layout.md`](docs/layout.md) |
| Touch the GitHub fetch, filters, URL state, search, keyboard, or view modes | [`docs/state-and-data.md`](docs/state-and-data.md) |
| Touch a table, a fold, or sorting | [`docs/tables.md`](docs/tables.md) |
| Touch anything that reaches paper | [`docs/printing.md`](docs/printing.md) |
| Write or remove page copy, or add a PDF | [`docs/content-rules.md`](docs/content-rules.md) |
| Touch a sanitising helper or the CSP | [`docs/security-posture.md`](docs/security-posture.md) |
| Propose a feature | [`docs/decisions-not-built.md`](docs/decisions-not-built.md) **first** |
| Quote a measurement | [`docs/verification-log.md`](docs/verification-log.md) |
| Push, or diagnose the live site | [`docs/deployment.md`](docs/deployment.md) |

**General theory, not project-specific:**
[`docs/UI-UX_Rulebook.md`](docs/UI-UX_Rulebook.md) ·
[`docs/SECURITY_Rulebook.md`](docs/SECURITY_Rulebook.md)

**History:** [`docs/FEATURES-suggestion.md`](docs/FEATURES-suggestion.md) — the
2026-08-14 feature round, what shipped and what did not.

## 3. Skills — use them, do not re-derive them

Each skill in `.claude/skills/` carries the measurement snippets and the
environment quirks that are easy to get wrong.

| Skill | Use it when |
| --- | --- |
| `verify-site` | After **any** edit to `index.html`, `style.css` or `script.js`. The full measured round. |
| `edit-site-content` | Adding or editing a section, table, link or copy. Covers numbering, nav, and the header-offset trap. |
| `check-accessibility` | A colour changed, a control was added, or an animation was added. |
| `verify-print` | The print block, a printed section, or the export dialog changed. |
| `audit-untrusted-input` | The render path, the cache shape, or a sanitising helper changed. |
| `preview-pane-quirks` | A measurement looks wrong, a screenshot times out, or scroll/animation behaviour looks broken. |
| `record-decision` | A non-obvious call was made, something was rejected, or new numbers were measured. |
| `deploy-site` | Pushing, enabling Pages, or diagnosing a wrong/missing live site. |

## 4. The short version of doing work here

1. **Read the doc** for the area you are touching, from the table in §2.
2. **Make the change** in one of the four source files.
3. **Run `verify-site`**, plus `check-accessibility` / `verify-print` /
   `audit-untrusted-input` if the change reaches those areas.
4. **Record it** with `record-decision` — new numbers into
   `docs/verification-log.md`, new rules into the matching doc.
5. **Do not push** unless asked. Push is the deploy.

Three habits, because each has cost real time here:

- **Measure, do not eyeball.** Contrast, tap targets and header height all
  regressed invisibly before.
- **Exercise controls, do not read them.** Sort, filter and Retry have each
  looked correct in the markup while being broken in fact.
- **A stated failure needs a way to act on it.** Every error path names the fix
  and offers Retry.

## 5. Standing instructions from Affan

- **Affan commits and pushes. Never run `git commit` or `git push`.** Not after a
  clean verification round, not when a plan was agreed, not when he picked an
  option that ended in the word "deploy" — a choice about *plan* is not consent to
  edit his public site. Leave the work uncommitted and say so. Broken 2026-08-17;
  the remote had to be force-rolled back.
- If he does ask for a commit, **no `Co-Authored-By` trailer.**
- **One release per commit, subject `vX.Y.Z - Title Case Summary`.** Read
  `git log` first and continue the series — `v1.0.0 - First Release`,
  `v1.0.1 - Layout Fixes`, `v1.1.0 - Added Features`. Patch = fixes only, minor =
  anything new, major = something a reader relied on is gone. (`v.1.1.0` carries a
  stray dot; the standard is `v1.1.0`, and history is not rewritten to fix it.)
- **An uncommitted tree means he is still accumulating.** Work sitting modified is
  not a forgotten commit — it is one bundle in progress, and it gets **one** version
  number when he decides it is done. Never suggest splitting it into per-change
  commits, and never number a release before he asks for one.
- The site is about showcasing him. **No supervisor, referee or colleague is
  named as a contact** — see `docs/content-rules.md` §3.
- **No dark mode.** Light-only is deliberate.
- The GitHub cache stays as it is.
- Curate by tagging on GitHub, never by adding an allowlist to the code.
