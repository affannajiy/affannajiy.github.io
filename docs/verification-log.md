# Verification log

The site has no tests and no build step, so verification is manual and the
result is written down. This file is the **record of the last full round** — the
*procedure* is in the `verify-site`, `verify-print`, `check-accessibility` and
`audit-untrusted-input` skills.

Update this file after any round that measured something new. A number here with
no date behind it is a number nobody has checked.

---

## Round: 2026-08-14, UI/UX and security review

The whole page read against both rulebooks, then re-measured. Everything below
was exercised, not read.

### The injection, before and after

Poisoned the `localStorage` cache with a repository name of
`pwn" onmouseover="window.__XSS=1" data-x="` and pointed the API at a 404 so the
poison was what rendered.

**Before:** a live `onmouseover` attribute on a real `<button>` —
`hasAttribute('onmouseover')` returned `true`. `script-src 'self'` blocked
execution (`window.__XSS` stayed undefined), so the CSP held, but the escaper
did not.

**After:** the same poison, plus a `javascript:` URL, an `evil.example.com`
host, an `<img onerror>` name, a `<b>` language, a non-array `topics`, an
80-character topic, an uppercase topic, a 20,000-character description, a
`fork: true` entry, `null`, a bare string, an empty name, and 500 filler rows —
508 entries in total.

| Measured | Result |
| --- | --- |
| Rows rendered | 200 — the `MAX_REPOS` cap held |
| `[onmouseover]`, `[onerror]`, `[onclick]` nodes | 0 |
| `img` / `b` / `script` nodes created | 0 |
| `window.__XSS` | never set |
| Distinct link hosts | `github.com` only — both bad URLs fell back |
| Longest description cell | 300 characters — clamp held against 20,000 |
| Bad topics | dropped; `PYTHON` folded to `python`; 80-char slug dropped |
| Fork entry | excluded |
| Status line | named the cache age **and** the failure, with Retry |

**Self-healing, both paths.** Corrupt JSON written to the cache: deleted on next
load, `getItem` returned `null`. A forged timestamp one year in the future:
deleted on next load, and the row it carried never rendered.

### Failure and rate limiting

With `TIMEOUT_MS` temporarily set to 1: status read "Could not load
repositories: GitHub did not answer within 0.001 seconds…", `aria-busy` cleared,
skeleton rows gone, Retry present, and the colophon's API row said
"Unreachable — GitHub did not answer within 0.001 seconds". Restored to 10000.

Retry clicked twice inside the cooldown: second click became `Wait 3s`,
`disabled: true`, then returned to `Retry` on its own.

### No JavaScript

With `.no-js` forced on: filter row, Projects status, Projects table, both
Projects hints, certificate filters, certificate status, the export button and
the JSON button all `display: none`. Projects table, certificates table and the
fixed-PDF link all still rendered. The `<noscript>` message states what is
missing and links the profile.

### Links that leave the page

34 links carry `target="_blank"`; **34 of 34** carry the "(opens in a new tab)"
note — 13 written in `index.html`, 21 built by `externalLink()`. Marker contrast
4.96:1 against the page. Dropped in the print block.

### Text read back out of the page

Search result for "linkedin" reads `LinkedIn · linkedin.com/in/affannajiy` —
previously `…affannajiy (opens in a new tab)Copy`. The JSON view's Links table
matches. JSON still reports 8 sections and 14 tables.

### Tap targets

Two failures found and fixed: skip link 37px → **40px**, footer "Back to top"
17px → **40px**. The three documented small controls still carry their 40px
overlays, confirmed through the CSSOM: `.anchor-btn::before` 40px,
`.detail-btn::after` 40px, `.copy-btn::after` 40px.

### Everything else, re-measured after the changes

| | 375px | 1280px |
| --- | --- | --- |
| Page overflow | 0 | −15 (scrollbar) |
| Inline style attributes | 0 | 0 |
| Repositories rendered | 22 | 22 |
| Header height | 124px → 42px condensed | — |
| `scroll-margin-top` | 172.5px → 67.5px | — |

Console clean in a fresh tab: the only output is the deliberate colophon note.
Zero offenders escaping `.table-wrap` at either width. `.filter-input` at 16px.
Keyboard reference correctly hidden on touch; 4 scroll hints shown at 375px.

**Exercised:** sort (`aria-sort` follows, first row becomes `ADS-academic`);
filter (4 of 22 for "python", stated in words); empty result ("No repositories
match “zzzzzz”."); repository dialog (5 rows, repository cell shows the resolved
`github.com` URL); comparison (3 columns, 7 rows, and **"Clear selection" now
clears the selection and closes the dialog** — it previously had no handler at
all); static sort on Education; certificate filters (1 of 7, then reset to 7);
year bar (9 of 15 roles for 2025); topic chips; collapse-all (8 → 0 → 8);
density toggle; all three view modes.

**View modes, re-measured** by counting rows with a non-null `offsetParent`:
**88 full, 81 recruiter, 74 developer.**

**Keyboard survives the killer path:** after opening and closing the search
dialog, `?`, `/`, `Ctrl+K` and the `g p` chord all still fire.

**Print:** budget reads "About 58 lines of the ~59 a page holds — fits on one
page". Applying the export sets `print-resume`, 4 `.print-hidden` and 8
`.resume-empty`; `afterprint` returns body class, hidden count, empty count,
fold state and filter value to exactly their starting values.

### Bugs this round found

| Bug | Severity |
| --- | --- |
| `escapeHTML()` left quotes unescaped — attribute injection, confirmed live | **High.** Only the CSP stopped execution |
| Cache accepted unbounded row counts and string lengths | Denial of service against the render and layout |
| Cache accepted a forged future timestamp, pinning poisoned data past expiry | Poison persisted indefinitely |
| A failed cache entry was skipped but left in place | Re-parsed and re-rejected on every visit |
| No fetch timeout — a hung request left "Loading…" up permanently | The status line lied |
| No `<noscript>` — same lie for every visitor with JS off | The status line lied |
| Compare dialog's "Clear selection" had no event handler at all | A labelled control that did nothing |
| 13 external links opened new tabs with no warning to anyone | WCAG 3.2.5 |
| Skip link 37px, "Back to top" 17px | Under the 40px floor |
| `sr-only` notes and "Copy" leaked into search results and JSON | Third occurrence of this bug family |

---

## Round: 2026-08-14, after the feature build

**Baseline.** 22 repos live; zero console errors and zero CSP violations — the
only console output is the deliberate colophon note; zero inline style
attributes at 375px and 1280px, including after exercising every control; no
horizontal overflow at either width.

### Tap targets

All measured at 375px: chips 40, filter selects 40, colophon summary 40, nav 44,
filter 40. `.anchor-btn`, `.detail-btn` and `.copy-btn` are 16–17px boxes
carrying a 40px invisible hit overlay — `.anchor-btn` uses `::before`, because
`::after` already carries its "copied" confirmation. Inline `.text-link`s in
prose and table cells remain below 40px, as before.

### Contrast

Measured, all ≥ 4.5:1: chip resting and pressed 17.92, language bar 5.25, stat
label 5.05, stat value 17.92, search kicker 5.05, search body 14.40, colophon
note 5.05, anchor button 5.05, detail button 5.35, view label 5.05, ASCII
diagram 15.27, featured language 5.35, featured description 15.27.

### Exercised, not just read

Static sort on Education orders periods chronologically both ways with
`aria-sort` following; certificate filters narrow, report counts, and state the
way out of an empty result; topic chips filter and write `?topic=python`, and
"All topics" clears it back to a bare URL; the year bar filters 15 experience
rows to 9 for 2025; all eight `g` chords, `?`, `/` and `Ctrl+K` fire, and all
stand down inside a field and behind an open dialog; the repo dialog opens from
cached fields with no second API call; comparison selects, compares and clears;
the JSON view reads the page back with all 8 sections and 14 tables.

### Security

Re-run after adding `topics` to the cache. Poisoned the cache with `javascript:`
URLs, an `<img onerror>` name, a `<b>` language, a non-array `topics`, an
over-long topic slug, an uppercase topic, `null`, a bare string and an empty
name — then pointed the API at a 404 so the poison was what rendered.

Result: three valid rows survived and the rest were dropped; zero
`img`/`script`/`b` nodes created; the `javascript:` URL and `evil.example.com`
both fell back to the profile URL; bad topics dropped and `PYTHON` folded into
`python`; the status line named both the cache age and the failure, and offered
Retry.

### Header

At 375px: **123.8px expanded → 41.6px condensed**, with `scroll-margin-top`
following it 172.5px → 67.5px. All eight nav items scroll clear of the edge
fade, checked one at a time; the marked item is auto-scrolled into view. At
1280px the header is 45.6px in both states and the nav still wraps — the
condensed styles are mobile-only. No feature in this round added a nav
destination; that was the point of folding the colophon into the footer.

### URL state

`?q=python&sort=stars&dir=descending` written and restored; a poisoned
`?sort=<img onerror>&dir=javascript:` is rejected and rewritten to `?q=data`;
the default sort writes no query string at all.

### Print

Résumé budget back under one page at **58 of ~59** after the `.hint` and
`.evidence` fixes; full record reports ~5 pages as expected. Defaults still
`about/education/experience/skills` on and the rest off. Print applied and fully
reverted — body class, `.print-hidden` (4), `.resume-empty` (8), forced folds
(8) and the Projects filter all returned to their starting state on
`afterprint`. `.copy-btn` is `display:none` in the print block, confirmed
through the CSSOM.

### View modes

Measured 88 rows full, 82 recruiter, 76 developer.

---

## Bugs this round found

Kept because each one is a class of mistake that can recur.

| Bug | What it cost |
| --- | --- |
| `estimateLines()` counted `.hint` paragraphs the print block hides | Résumé budget over-reported by five lines |
| Closing the search dialog left focus in its input | **Every keyboard shortcut dead for the rest of the visit**, silently |
| The `#` copy button's text leaked into `textContent` | Section labels read `"About#"` in search results, export checkboxes and the JSON view |
| The stale-cache failure path stated the problem but offered no Retry | Reader left holding stale data with only a full reload as a way out |
| The featured list kept a stale entry after being hidden | Latent |
| `.anchor-btn` shipped at 16.8px | Under the 40px tap-target floor |
