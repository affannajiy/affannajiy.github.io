# docs/

The reasons behind the rules. `CLAUDE.md` at the repo root holds the eight hard
constraints and routes here; **this directory holds the why**, one file per area.

Nothing here is loaded by the site. These are notes for whoever — human or
model — changes it next.

| File | Covers |
| --- | --- |
| [feature-inventory.md](feature-inventory.md) | Every feature the site has, and which doc governs it |
| [design-system.md](design-system.md) | Colour tokens, the orange rule, typography |
| [accessibility.md](accessibility.md) | Contrast floor, tap targets, focus, ARIA, reduced motion |
| [layout.md](layout.md) | The grid, the sticky-header offset, the condensed mobile header, things that want a width |
| [state-and-data.md](state-and-data.md) | GitHub fetch, status and errors, filtering, URL state, search, keyboard, view modes |
| [tables.md](tables.md) | Folds, static sorting, the Projects table shape |
| [printing.md](printing.md) | Print typography, the one-page résumé, PDF export |
| [content-rules.md](content-rules.md) | What may be written into the page; third-party privacy; open items |
| [security-posture.md](security-posture.md) | The CSP, the three untrusted inputs, the sanitising helpers |
| [decisions-not-built.md](decisions-not-built.md) | Rejected suggestions, and what each would cost |
| [verification-log.md](verification-log.md) | The last measured round, and the bugs it found |
| [deployment.md](deployment.md) | Pages, the two silent preconditions |

**General theory, not project-specific:**
[UI-UX_Rulebook.md](UI-UX_Rulebook.md) · [SECURITY_Rulebook.md](SECURITY_Rulebook.md)

**History:** [FEATURES-suggestion.md](FEATURES-suggestion.md) — the 2026-08-14
feature round.

---

## Adding to this directory

Use the `record-decision` skill. In short: a *rule* goes in the matching file
above, a *number* goes in `verification-log.md` under a dated round, a
*procedure* is not a doc at all — it is a skill in `.claude/skills/`.

If you add a file here, add a row to this table **and** to the routing table in
`CLAUDE.md`. A doc nobody is routed to is a doc nobody reads.
