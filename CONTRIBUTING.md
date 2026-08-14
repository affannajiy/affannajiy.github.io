# Contributing

This is a personal portfolio, so the honest framing first: **I am not looking
for feature contributions.** The content is my own record and the design is a
set of deliberate decisions, most of them written down.

What is genuinely welcome:

- **Bug reports.** A broken link, a layout that collapses on your device, a
  certificate PDF that 404s, the Projects table failing on your browser.
- **Accessibility problems.** A contrast failure, a trap for keyboard focus, a
  control your screen reader announces wrongly. These are the reports I most
  want, because I cannot test every combination.
- **Factual corrections** to anything on the page.
- **Security issues** — but read `SECURITY.md` first, and do not open a public
  issue for anything exploitable.

If you want to reuse the site as a template, you do not need permission for the
code. Fork it. Read `LICENSE` for what is and is not covered.

---

## Before you open a pull request

**Read `CLAUDE.md`.** It is the invariants file, and it is not a style
suggestion — it is the list of things a change may not break, with the reason
attached to each. A pull request that violates one will be closed with a
pointer to the rule, so it is cheaper to read it first.

The five that catch people out:

| | |
| --- | --- |
| **No frameworks** | No React, no Vue, no Tailwind, no jQuery, no runtime library of any kind. |
| **No build step** | No npm, no bundler, no transpiler, no preprocessor. GitHub Pages serves the repo verbatim: what is committed is what ships. |
| **No dependencies** | Including CDN `<script>`/`<link>` tags and web fonts. Every external request is a new failure mode and a new privacy leak. |
| **Four source files** | `index.html`, `style.css`, `script.js`, `assets/`. Adding a fifth is the first step toward needing a build step. |
| **The CSP is load-bearing** | `default-src 'none'` makes the three rules above something the browser enforces. **Never** add `unsafe-inline` to silence a violation — fix the code. This is also why there are no inline `style` attributes and no inline `<script>`. |

Two more that are easy to trip over by accident:

- **No analytics, trackers, cookies, or consent banners.** Nothing here needs
  consent, and that is a property worth keeping.
- **No third-party contact details, anywhere, including inside a PDF.** No
  phone numbers or email addresses belonging to referees, signatories, or
  committee members. A published PDF is permanently crawlable; deleting the
  file does not recall it from a crawler. See `CLAUDE.md` §2.8 and §2.10.

## Running it

There is nothing to install. Serve the directory over HTTP:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123`. **Do not test with `file://`** — the
Projects table fetches the GitHub API, and the origin rules break that.

## Verifying a change

`CLAUDE.md` §5 is the checklist, and it is not optional for anything visual:

1. Serve over HTTP, not `file://`.
2. Console clean of errors the site owns.
3. Check **375px** and **1280px**. Both.
4. Exercise the sort controls, the filter, and the Retry button — clicking
   them, not reading them.
5. No horizontal page overflow at 375px: `document.documentElement.scrollWidth`
   must equal `window.innerWidth`.
6. The Projects table still populates from the live API.
7. If colours changed, **measure** contrast against §3.3. Do not eyeball it.

If you touched anything that prints, also open the Build a PDF dialog, run both
formats, and confirm the page is put back afterwards — cancelling a print must
not leave the page mangled.

State what you measured in the pull request. "Looks fine" is not a result.

## Commits

Present tense, and say what changed and why. The why is the part that is
expensive to reconstruct a year later; the what is visible in the diff.

## Reporting a bug

Use the issue templates — they ask for the browser, the width, and the steps,
which is the information a report is usually missing.
