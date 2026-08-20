---
name: record-decision
description: Write a design decision, a rejected suggestion, or a fresh measurement into the right skill reference file instead of growing CLAUDE.md. Use after making a non-obvious call, after deciding not to build something, after finding a bug worth remembering, or after any verification round that produced new numbers.
---

# Record a decision

`CLAUDE.md` is an **index**, not a notebook, and stays under 200 lines. Anything
longer than a table row goes in a `reference/` file under `.claude/skills/`.

This prevents a 500-line `CLAUDE.md` that costs a load every session and that
nobody, human or model, reads to the end.

## Where it goes

| What you have | File |
| --- | --- |
| A colour, a token, a typography call | `site-design-and-layout/reference/design-system.md` |
| A contrast or tap-target rule | `check-accessibility/reference/accessibility.md` |
| The grid, the header, anything wanting a width | `site-design-and-layout/reference/layout.md` |
| Filtering, URL state, search, keyboard, view modes, status and error copy | `site-state-and-tables/reference/state-and-data.md` |
| Folds, sorting, table shape | `site-state-and-tables/reference/tables.md` |
| Anything that happens on paper | `verify-print/reference/printing.md` |
| What may go in the page; privacy of third parties | `edit-site-content/reference/content-rules.md` |
| A sanitising helper, the CSP, an untrusted input | `audit-untrusted-input/reference/security-posture.md` |
| **A rejected suggestion** | `site-feature-map/reference/decisions-not-built.md` |
| **A number you measured** | `verify-site/reference/verification-log.md` |
| Pushing, Pages, the live site | `deploy-site/reference/deployment.md` |

A *procedure* — repeatable steps with snippets — is not a doc. It is a **skill**.

## Touch CLAUDE.md only when

- A **hard constraint** changes (the eight in §1). Those are load-bearing.
- A **new skill or reference file exists** and the routing table must point at it.
  This is the one people forget. A doc nobody is routed to is a doc nobody reads.

## How to write it

Three things, in this order, or it gets re-litigated in six months:

1. **The rule, stated as a rule.** Not "we tried X" — "do X, never Y".
2. **Why**, in a sentence or two, naming the constraint or the measurement.
3. **What it cost or prevents**, with a number. "123.8px → 41.6px, 82px given
   back" survives an argument. "It feels better" does not.

For a rejection, name **what would have to change to buy it**. That makes it a
decision instead of a refusal. The prefetch entry in `decisions-not-built.md` is
the model: it names the exact CSP downgrade the feature costs.

## Numbers go stale

A measurement in `verify-site/reference/verification-log.md` is a claim about one
day. Put it under the dated round it came from. **A number with no date is a
number nobody checked.** If you find one, re-measure it or mark it unverified.
