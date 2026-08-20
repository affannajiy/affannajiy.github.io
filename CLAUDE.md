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
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `rulebooks/`, `.github/` and
`.claude/` are tooling and documentation — nothing links to them and no page
loads them. Pages will still serve them at their paths; that is harmless and is
**not** a reason to add a build step to strip them.

**Three rules that follow from 1.7 / 1.8 and bite hardest:**

- **Never assemble HTML from remote data.** Build DOM nodes and set
  `textContent`. There is deliberately no `escapeHTML()` in `script.js` — the
  one it had left quotes unescaped and produced a live attribute injection, and
  repairing it would only have reset the trap (`.claude/skills/audit-untrusted-input/reference/security-posture.md` §3).
  Since 2026-08-17 the CSP enforces this in Chrome/Edge, so a string assigned to
  `innerHTML` throws instead of shipping.
- The CSP does **not** stop CSSOM writes, so a width set from JS is not blocked —
  it is an invariant broken quietly. Data bars are drawn with block characters
  instead (`.claude/skills/site-design-and-layout/reference/layout.md` §4).
- **A rule that sets `display` overrides the `hidden` attribute.** Any component
  styled `display: flex/grid/block` needs its own `[hidden] { display: none }`,
  or it renders while claiming to be hidden (`.claude/skills/site-design-and-layout/reference/layout.md` §3a).
- Never invent content to fill a gap. Unfinished content is marked with a visible
  `.hint` (`.claude/skills/edit-site-content/reference/content-rules.md` §2).

## 2. Where everything is — invoke the skill

**Every reason, rule and measured number lives inside a skill.** General theory
lives in `rulebooks/`. **Invoke the skill before you change the thing it
governs** — its `reference/` files hold the reasons that make a change safe, and
the SKILL.md holds the traps.

| I am about to… | Skill |
| --- | --- |
| Anything at all — after **any** edit to `index.html`, `style.css`, `script.js` | `verify-site` (holds the verification log) |
| Change a colour, token, typeface, the grid, the sticky header, spacing, anything wanting a width | `site-design-and-layout` |
| Touch the GitHub fetch, cache, filters, URL state, search, keyboard, view modes, a table, a fold, sorting | `site-state-and-tables` |
| Find out what the site does, or **propose a feature** | `site-feature-map` (read its rejected list **first**) |
| Add or edit a section, table, link, copy, or a PDF | `edit-site-content` |
| Add or restyle an interactive control, change a colour, add an animation | `check-accessibility` |
| Touch anything that reaches paper | `verify-print` |
| Touch a sanitising helper, the CSP, the render path, the cache shape | `audit-untrusted-input` |
| Push, enable Pages, diagnose the live site | `deploy-site` |
| A measurement looks wrong, a screenshot times out, a CSS edit seems ignored | `preview-pane-quirks` |
| Record a decision, a rejection, or a fresh number | `record-decision` |

**General theory, not project-specific — three portable rulebooks in
[`rulebooks/`](rulebooks/README.md).** A skill says what *this* site does. A
rulebook says what good software does. Read the rulebook when the skill has no
ruling, or when the change is a new one nobody wrote a rule for yet.

| Lens | Rulebook | Ask |
| --- | --- | --- |
| Human | [`rulebooks/UI-UX_Rulebook.md`](rulebooks/UI-UX_Rulebook.md) | Can a person understand and use this? |
| Trust | [`rulebooks/SECURITY_Rulebook.md`](rulebooks/SECURITY_Rulebook.md) | Can a person misuse, break or exploit this? |
| Code | [`rulebooks/ENGINEERING_Rulebook.md`](rulebooks/ENGINEERING_Rulebook.md) | Can we change this without a fire? |

Read one, not all three — [`rulebooks/README.md`](rulebooks/README.md) routes
twelve kinds of change to the right file and states what each costs to load.
**Never paste a rulebook into this file.** Reference it by path, so it is read
only when the task needs it.

Section numbers moved on 2026-08-20. A citation written before that date can
name a real section and still point at the wrong rule — check it against the
file before you trust it.

## 3. Skills are the manual — do not re-derive them

Each skill in `.claude/skills/` carries the rules, the measurement snippets and
the environment quirks that are easy to get wrong, plus a `reference/` directory
holding the long-form why. **Do not answer from memory or from reading the source
when a skill covers the area — invoke it.** Do not write new rules into
`CLAUDE.md`; `record-decision` routes them into the right skill.

## 4. The short version of doing work here

1. **Invoke the skill** for the area you are touching, from the table in §2.
2. **Make the change** in one of the four source files.
3. **Run `verify-site`**, plus `check-accessibility` / `verify-print` /
   `audit-untrusted-input` if the change reaches those areas.
4. **Record it** with `record-decision` — new numbers into
   `.claude/skills/verify-site/reference/verification-log.md`, new rules into the matching doc.
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
- **One release per commit, one tag per release, subject `vX.Y.Z - Title Case Summary`.**
  Tagging and release convention: `.claude/skills/deploy-site/reference/deployment.md`. The tag is the canonical
  version — `v.1.1.0`'s tag is `v1.1.0`. Read
  `git log` first and continue the series — `v1.0.0 - First Release`,
  `v1.0.1 - Layout Fixes`, `v1.1.0 - Added Features`. Patch = fixes only, minor =
  anything new, major = something a reader relied on is gone. (`v.1.1.0` carries a
  stray dot; the standard is `v1.1.0`, and history is not rewritten to fix it.)
- **An uncommitted tree means he is still accumulating.** Work sitting modified is
  not a forgotten commit — it is one bundle in progress, and it gets **one** version
  number when he decides it is done. Never suggest splitting it into per-change
  commits, and never number a release before he asks for one.
- The site is about showcasing him. **No supervisor, referee or colleague is
  named as a contact** — see `.claude/skills/edit-site-content/reference/content-rules.md` §3.
- **No dark mode.** Light-only is deliberate.
- **Repo-wide Workflow permissions stay read-only.** `.github/workflows/pages.yml`
  declares its own `permissions:` block, which overrides the repo default, so the
  deploy needs nothing wider. Widening it buys nothing and arms every future
  workflow. Set to "Read and write" on 2026-08-18 during a deploy outage; the
  workflow file was the actual fix.
- The GitHub cache stays as it is.
- Curate by tagging on GitHub, never by adding an allowlist to the code.
