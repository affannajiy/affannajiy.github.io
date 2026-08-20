# Feature suggestions — what shipped

Suggestions from ChatGPT and Gemini, 2026-08-14, checked against the codebase and
`CLAUDE.md`, then built. A record of what was done and what was not.

**This is history, dated 2026-08-14.** The current state is in
[feature-inventory.md](feature-inventory.md), and the current rejections are in
[decisions-not-built.md](decisions-not-built.md).

**Affan's calls before the build:** no dark mode · no supervisor or third-party
contacts · GitHub cache left as-is · static tables may be revamped · Stars column
dropped · new content folded into existing sections, no new nav destinations ·
both view modes built · repository dialog without a README fetch · sorting only
on tables with 3+ rows.

---

## Shipped

### Projects
- **Stars column removed** — all 22 repositories have zero. Took `safeCount()`
  with it; the table is four columns.
- **Statistics panel** — repositories, languages, most-used, newest change, and
  a language distribution drawn with block characters (`█`) rather than CSS
  widths, which rule 1.8 forbids. Unclassified repositories are stated, not
  dropped.
- **Topic chips** — built from the topics the repositories actually carry,
  showing only those used more than once. Composes with the text filter as AND.
  Writes `?topic=`.
- **Selected-projects band** — repositories tagged `featured` on GitHub. Hides
  itself when nothing is tagged, which is its state today.
- **Repository detail dialog** — language, created, updated, topics, link.
  Built from cached fields, so no second API call and it works offline.
- **Comparison** — selection lives in the detail dialog rather than as a
  checkbox column, so the table stays a table.

### Tables
- **Generic sorter** for any `table[data-sortable]` with three or more rows:
  Education, Coursework, UTP experience, Certificates, Skills. Period columns
  sort by start date, not alphabetically by month name.
- **Certificate filters** — year, issuer and type, as selects built from the
  rows, with a stated empty result and a Reset.
- **Experience year bar** — years read out of the Period column; a role
  spanning two years answers to both.
- **Density toggle**, remembered in `localStorage`.

### Search and keyboard
- **Site-wide search** on `/` and `Ctrl`/`Cmd`+`K`, indexed from the DOM on
  open. Arrow keys walk results, Enter opens the first.
- **`g` chords** for all eight sections, **`?`** for the reference panel,
  installed only where `(hover: hover)` matches.

### View modes
- **Recruiter** and **Developer**, full view default, written to `?view=`.
  Measured 88 rows full, 82 recruiter, 76 developer.

### Content
- Currently seeking · Interests · How this went (trajectory) · what-I-work-on
  ASCII diagram — all folded into About.
- **Skills "Used in" column** — every level now points at a row that exists
  elsewhere on the page. Dropped from the one-page résumé, where it costs more
  than it gives.
- Keysight technologies `<dl>`.
- Copy buttons extended past `mailto:` to GitHub and LinkedIn; `#` copy-link on
  every section heading.
- **Footer colophon** — data sources, a measured system panel
  (`document.lastModified`, live API state, `navigator.onLine`), how the site is
  built, a JSON view of the page, and the keyboard reference.
- Console note for anyone who opens devtools.

### Bugs found and fixed on the way
- `estimateLines()` counted `.hint` paragraphs the print block hides — the
  résumé budget was over-reporting by five lines.
- Closing the search dialog left focus in its input, which killed **every**
  keyboard shortcut for the rest of the visit.
- Section labels read `"About#"` once the `#` copy button existed, in the search
  results, the export checkboxes and the JSON view.
- The stale-cache failure path stated the problem but offered no Retry.
- The featured list kept a stale entry after being hidden.
- `.anchor-btn` shipped at 16.8px, under the 40px floor.

---

## Deliberately not built

| Suggestion | Why not |
| --- | --- |
| Dark mode / `color-scheme: light dark` | Affan: no. Light-only is deliberate — see [design-system.md](../../site-design-and-layout/reference/design-system.md). |
| Named references, supervisor contact | Affan: not bothering him. Content rule P1 in [content-rules.md](../../edit-site-content/reference/content-rules.md) also blocks it. |
| Live sandbox / mock terminal | Needs a backend; widening `connect-src` breaks rule 1.7 and takes a runtime dependency (1.3). |
| `curl /raw` plaintext endpoint | Needs a fifth source file (rule 1.4). The console-note half shipped. |
| Hand-maintained activity log | Goes stale; a stale freshness indicator is worse than none. `document.lastModified` does the honest version. |
| Separate quick-facts strip | The masthead `<dl>` already is one. A second would be duplication. |
| README in the repository dialog | One API call per open against a 60/hour budget, rendering as a `<pre>` with no Markdown library. |
| Technical log / war stories | A writing project, not a build. Still worth doing — it needs Affan's material. |

## Still needs Affan

- **Tag repositories on GitHub** with `featured` to light up the Selected
  projects band. Optionally `academic` / `coursework` for more topic chips —
  only topics used more than once get one.
- ~~**Certificate verification URLs.**~~ **Done 2026-08-17**, four of seven. See
  [content-rules.md](../../edit-site-content/reference/content-rules.md) §4.
- **Keep the availability dates in "Currently seeking" current.**
- `assets/resume.pdf` still says the internship is ongoing.
