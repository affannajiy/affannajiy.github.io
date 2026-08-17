# Feature inventory

Every feature, what it does, where its rules live. Written during the 2026-08-14
review against [UI-UX_Rulebook.md](UI-UX_Rulebook.md) and
[SECURITY_Rulebook.md](SECURITY_Rulebook.md).

"Changed in review" means measured or exercised, not read. Numbers in
[verification-log.md](verification-log.md).

---

## 1. Content and structure

| Feature | What it does | Rules | Changed in review |
| --- | --- | --- | --- |
| Eight numbered sections | About, Education, Experience, Skills, Certificates, Projects, Links, Résumé | [tables.md](tables.md) | — |
| Masthead | Name, role and a five-item fact list | — | — |
| Collapsible folds | Native `<details>`, all open on load | [tables.md](tables.md) §1 | — |
| Sticky header + scrollspy | Marks the section being read, condenses to one row on mobile | [layout.md](layout.md) §2–3 | — |
| Skip link | First focusable element, jumps to `#main` | [accessibility.md](accessibility.md) | **Raised to the 40px floor** — measured 37px |
| Colophon | Data sources, live system panel, how it is built, JSON view | [state-and-data.md](state-and-data.md) §1 | — |
| ASCII work diagram | Areas of work, drawn in text so it needs no image | [layout.md](layout.md) §4 | — |

## 2. Projects, from the GitHub API

| Feature | What it does | Rules | Changed in review |
| --- | --- | --- | --- |
| Live repository table | Fetched every load, never hardcoded | [content-rules.md](content-rules.md) C1 | **Rendered as DOM nodes, not HTML strings** |
| Stale-while-revalidate cache | 6-hour `localStorage` copy so a return visit paints instantly | [state-and-data.md](state-and-data.md) §1 | **Bounded, clamped and self-healing** |
| Skeleton rows | Shape-matched loading state, never a spinner | [state-and-data.md](state-and-data.md) §1 | **`aria-busy` while they are on screen** |
| Failure handling | Advice selected from the failure, Retry on both paths | [state-and-data.md](state-and-data.md) §1 | **10s timeout; Retry rate-limits itself** |
| Text filter | Name, description, language, topic — instant, no debounce | [state-and-data.md](state-and-data.md) §2 | — |
| Topic chips | Built from real GitHub topics used more than once | [content-rules.md](content-rules.md) C4 | — |
| Column sorting | `aria-sort` is the source of truth, CSS draws from it | [tables.md](tables.md) §2 | — |
| Statistics panel | Counts plus a language distribution drawn in block characters | [layout.md](layout.md) §4 | Rendered as nodes |
| Selected projects band | Repositories tagged `featured`; hides itself when none are | [content-rules.md](content-rules.md) C4 | Rendered as nodes |
| Repository detail dialog | Language, dates, topics, link — no second API call | — | Rendered as nodes |
| Comparison | Two or more repositories side by side | — | **"Clear selection" now does something** |
| URL state | `?q= ?sort= ?dir= ?topic= ?view=` via `replaceState` | [state-and-data.md](state-and-data.md) §3 | — |
| No-JavaScript path | Says the table needs JS and links the profile | [accessibility.md](accessibility.md) | **New** |

## 3. The static tables

| Feature | What it does | Rules | Changed in review |
| --- | --- | --- | --- |
| Generic sorting | Any `[data-sortable]` table with 3+ rows | [tables.md](tables.md) §2 | Reads cells through `readableText()` |
| Period-aware sort | Sorts "May 2024 – Aug 2027" by start date, not month name | [tables.md](tables.md) §2 | — |
| Certificate filters | Year, issuer, type — selects built from the rows | [state-and-data.md](state-and-data.md) §2 | — |
| Experience year bar | Filters roles by the years they ran | [state-and-data.md](state-and-data.md) §2 | **An employer left with no roles in the year is collapsed, sub-heading and all** |
| Density toggle | Compact rows, remembered in `localStorage` | [state-and-data.md](state-and-data.md) §6 | — |
| Skills evidence column | Every skill points at a row elsewhere on the page | [printing.md](printing.md) §3 | **Now real links, not prose** |
| Evidence links | An evidence phrase jumps to the row it names, clearing whatever hid it, and the status line says which skill sent you | [state-and-data.md](state-and-data.md) §7 | **New** |
| Related repositories | The detail dialog names repos sharing a topic; each swaps the dialog to it | [state-and-data.md](state-and-data.md) §8 | **New** |

## 4. Navigation and search

| Feature | What it does | Rules | Changed in review |
| --- | --- | --- | --- |
| Site-wide search | `/`, `Ctrl`/`Cmd`+`K`, or the header control; indexed from the DOM on open | [state-and-data.md](state-and-data.md) §4 | **Result text no longer carries control labels** |
| Header search control | The palette's front door, and the only one on a touch device | [layout.md](layout.md) §3a | **New — the dialog was previously unreachable on a phone** |
| Command palette | Commands built from the page's own controls, listed before anything is typed | [state-and-data.md](state-and-data.md) §4 | **New** |
| Search syntax | `section:` `type:` `year:` `lang:`; an unknown prefix is searched literally and said so | [state-and-data.md](state-and-data.md) §4 | **New** |
| Jump to the match | The index holds the node, so a result lands on the row, not the section | [state-and-data.md](state-and-data.md) §4 | **New** |
| Hit highlighting | CSS Custom Highlight API, cleared after 2.6s; row flash where it is missing | [accessibility.md](accessibility.md) | **New** |
| Unhide on jump | Opens the fold, leaves the view mode, clears the filter — and states which | [state-and-data.md](state-and-data.md) §2, §4 | **New** |
| Position readout | `04 / 08` in the header, in the coordinates the sections already use | [layout.md](layout.md) §3a | **New** |
| `g` chords | Eight section jumps, chord expires after 1200ms | [state-and-data.md](state-and-data.md) §4 | — |
| Keyboard reference | `?` panel, shown only where a pointer can hover | [state-and-data.md](state-and-data.md) §4 | **Now documents `f` and the search syntax** |
| Section copy-link | `#` button beside each heading | — | — |
| Copy contact | Email, GitHub and LinkedIn, with a stated failure path | — | — |
| View modes | Everything / Recruiter / Developer, full is the default | [state-and-data.md](state-and-data.md) §5 | — |
| Focus mode | One section on screen; `f`, the palette, or `?focus=`. Invisible while off | [state-and-data.md](state-and-data.md) §5a | **New** |
| Nav marks empty sections | Dotted and labelled when nothing in a section is showing; never hidden | [state-and-data.md](state-and-data.md) §2 | **New** |
| Reset the view | One command clearing every control that hides content; offered only when something is on | [state-and-data.md](state-and-data.md) §9 | **New** |
| Collapse all / expand all | One control for every fold | [tables.md](tables.md) §1 | — |

## 5. Output

| Feature | What it does | Rules | Changed in review |
| --- | --- | --- | --- |
| PDF export dialog | Picks format and sections, then hands the page to the browser | [printing.md](printing.md) §5 | — |
| One-page résumé mode | Curated rows, linearised tables, ATS-safe | [printing.md](printing.md) §2 | — |
| Line budget | States lines used against lines available before printing | [printing.md](printing.md) §3 | **Counts what actually prints** |
| Print restore | Every print-time change reverted on `afterprint` | [printing.md](printing.md) §5 | — |
| JSON view | Reads the whole page back as structured data | — | **No longer includes control labels** |
| Fixed résumé PDF | `assets/resume.pdf`, for job portals that want a file | [content-rules.md](content-rules.md) | — |
| QR code | A committed PNG. Dialog from the Links row for showing and downloading; 18mm in the masthead on paper | [printing.md](printing.md) §0 | **New** |

## 6. Security controls

Not features a reader sees, but the things holding the rest up. Full detail in
[security-posture.md](security-posture.md).

| Control | What it does | Changed in review |
| --- | --- | --- |
| Content-Security-Policy | `default-src 'none'`, one allowed connection | **Every implied directive written out; `data:` dropped; `script-src-attr 'none'` added** |
| Trusted Types | `require-trusted-types-for 'script'` + `trusted-types 'none'` — every HTML sink throws on a string | **New — the "build nodes" rule is now the browser's** |
| Referrer-free fetch | `credentials: "omit"`, `referrerPolicy: "no-referrer"` on the API call | **New** |
| Hash treated as an id | `#anchor` is pattern-checked then `getElementById`, never a raw selector | **New — was `querySelector(hash)`** |
| DOM-node rendering | No HTML parser in any remote-data path | **New — replaced the escaper** |
| `safeRepoURL()` | Only `https:` on `github.com`, else the profile URL | — |
| `safeTopics()` | Only GitHub slugs, capped at 12, de-duplicated | — |
| `narrow()` | One boundary for both the API and the cache: shape, count and length | **New** |
| Self-healing cache | A cache that fails validation is deleted, not re-read | **New** |
| Retry cooldown | Protects the 60-per-hour budget from a held-down button | **New** |
| No secrets, no trackers, no cookies | Nothing to leak and nothing to consent to | — |

---

## What is deliberately absent

Dark mode, analytics, a backend, a PDF library, a framework, a build step, an
`og:image`, hover-prefetch, a back-to-top button, persisted fold state, a README
in the repository dialog.

Added 2026-08-17 from a 60-item proposal: **Archive view mode** · **remembered
scroll** · **session restore** · **search filter chips** · **recent-search
history** · **section minimap** · **breadcrumb** · and everything needing facts
the page lacks — **project maturity**, **job-target résumé profiles**, **skill
first-use dates**, **what-changed "ENDED"**.

Reasons in [decisions-not-built.md](decisions-not-built.md). **Check there before
proposing any of these again.**
