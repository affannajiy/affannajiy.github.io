---
name: record-decision
description: Write a design decision, a rejected suggestion, or a fresh measurement into the right skill reference file instead of growing CLAUDE.md. Use after making a non-obvious call, after deciding not to build something, after finding a bug worth remembering, or after any verification round that produced new numbers.
---

# Record a decision

`CLAUDE.md` is an **index**, not a notebook. It is deliberately kept under 200
lines. Anything longer than a table row belongs in a skill `reference/` file under `.claude/skills/`.

The failure mode this prevents: a 500-line `CLAUDE.md` that is expensive to load
every session and that nobody, human or model, reads to the end.

---

## Where it goes

| What you have | File |
| --- | --- |
| A colour, a token, a typography call | `.claude/skills/site-design-and-layout/reference/design-system.md` |
| A contrast or tap-target rule | `.claude/skills/check-accessibility/reference/accessibility.md` |
| Anything about the grid, the header, or something wanting a width | `.claude/skills/site-design-and-layout/reference/layout.md` |
| Filtering, URL state, search, keyboard, view modes, status and error copy | `.claude/skills/site-state-and-tables/reference/state-and-data.md` |
| Folds, sorting, table shape | `.claude/skills/site-state-and-tables/reference/tables.md` |
| Anything that happens on paper | `.claude/skills/verify-print/reference/printing.md` |
| What may be written into the page; privacy of third parties | `.claude/skills/edit-site-content/reference/content-rules.md` |
| A sanitising helper, the CSP, an untrusted input | `.claude/skills/audit-untrusted-input/reference/security-posture.md` |
| **A suggestion that was rejected** | `.claude/skills/site-feature-map/reference/decisions-not-built.md` |
| **A number you just measured** | `.claude/skills/verify-site/reference/verification-log.md` |
| Pushing, Pages, the live site | `.claude/skills/deploy-site/reference/deployment.md` |

A *procedure* — a repeatable sequence of steps with snippets — is not a doc. It
is a **skill** in `.claude/skills/`.

## Only touch CLAUDE.md when

- A **hard constraint** changes (the eight in §1). These are load-bearing and
  stay in the index.
- A **new skill or reference file is created**, and the routing table must point at
  it. This is the one that gets forgotten: a doc nobody is routed to is a doc
  nobody reads.

## How to write it

Three things, in this order, or it will be re-litigated in six months:

1. **The rule, stated as a rule.** Not "we tried X" — "do X, never Y".
2. **Why**, in one or two sentences, naming the constraint or the measurement
   behind it.
3. **What it cost or what it prevents**, with a number where one exists.
   "123.8px → 41.6px, 82px given back" survives an argument; "it feels better"
   does not.

For a rejection, name **what would have to change** to buy it — that is what
makes it a decision rather than a refusal. The prefetch entry in
`decisions-not-built.md` is the model: it names the exact CSP downgrade the
feature would cost.

## Numbers go stale

A measurement in `.claude/skills/verify-site/reference/verification-log.md` is a claim about a specific day. Put
it under the dated round it came from. **A number with no date behind it is a
number nobody has checked** — if you find one, either re-measure it or say it is
unverified.
