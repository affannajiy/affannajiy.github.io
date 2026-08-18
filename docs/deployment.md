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

## Two sources, and why this repo has a workflow file

`affannajiy.github.io` is a **user page**, so Settings → Pages offers only
`Deploy from a branch` and `GitHub Actions`. There is no `None` branch — user
pages get **Unpublish site** instead.

**Never click Unpublish to force a redeploy.** It takes the live site down
immediately. If the republish then fails, the site is dark rather than stale.
Stale-but-serving always beats dark.

Classic branch deploy has no manual trigger. That is the gap
`.github/workflows/pages.yml` closes: `workflow_dispatch` gives a Run button.
The workflow uploads the checkout as-is — no build step, rule 1.2 intact.

Switching source is reversible, but **order matters**: the workflow file must be
on `master` *before* Source is set to `GitHub Actions`, or the new source finds
no workflow and nothing deploys.

## Recovery ladder

Run in order. Stop at the first one that lands.

1. **Check** `https://www.githubstatus.com/api/v2/status.json`. If not
   `"All Systems Operational"`, stop — a re-run just re-rolls the same dice.
2. **Measure the live site, not the browser.** A marker string that only exists
   in the new commit, cache-busted:
   `curl -s "https://affannajiy.github.io/index.html?b=$(date +%s)" | grep -c cert-verify`
   The run page can say green while the edge still serves the old file.
3. **Re-run failed jobs.** Fixes an ordinary one-off failure.
4. **Escalate at: queued > 10 min with status green.** Normal pickup is seconds.
   A run queued during an incident can be orphaned — re-running it revives the
   same wedged record, so stop re-running and switch to `workflow_dispatch`.
5. **Never revert or force-push to trigger a deploy.** The commit is not what
   failed; a new hash meets the same queue. Rewriting published history to fix a
   scheduler is a bad trade — that clean-up already cost a day on 2026-08-17.

## Serving locally during an outage

Zero infra, works offline, enough to demo or screenshot:

```
python -m http.server 8000
```

Then `http://localhost:8000`. Must be **HTTP, not `file://`** — the CSP and the
`api.github.com` fetch both behave differently on a `file://` origin.

## Mirror, if one is ever wanted

Not built. If it ever is: **Cloudflare Pages**, connected to the same repo, build
command empty and output directory `/`. It is the only option that stays honest
to the constraints — static file serving, no build, no runtime, no per-request
logic. Netlify and Vercel work too but both default to injecting analytics,
which is rule 1.6.

Keep any mirror **unlinked and off DNS** until an outage. A second live copy of
the same content on a second domain is a duplicate-content problem the rest of
the year, for redundancy that is needed a day a decade.

## Releases and tags

One release per commit, one tag per release. The commit subject and the tag carry
the same version, and the release body is the full notes.

- **Tag format is `vX.Y.Z`, always.** Lightweight tag on the release commit.
- **The tag is the canonical version, not the commit subject.** Commit `e7ef3de`
  reads `v.1.1.0` with a stray dot; its tag is `v1.1.0`. Tags normalise, history is
  not rewritten to match.
- **Patch = fixes only. Minor = anything new. Major = something a reader relied on
  is gone.** Judged against *the site*, not the repo — a change touching only
  workflows and docs is a patch however new it is.
- **Release title is the full commit subject**, `vX.Y.Z - Title Case Summary` —
  not the bare tag. A releases page listing `v1.0.0, v1.0.1, v1.1.0` tells a
  reader nothing, and the summary already exists in the commit. Standardised
  across all six releases on 2026-08-18.
- Body is the notes, the same text bundled for the commit.
- Never tag before Affan asks for the release number. An uncommitted tree is one
  bundle in progress, not a queue of releases.

```
gh release create vX.Y.Z --title "vX.Y.Z - Title Case Summary" --notes-file notes.md
```

`gh release create` creates and pushes the tag as well, so it is a push. It is
Affan's to run.

### Repairing a wrong tag

A tag pointing at the wrong commit is worse than a missing one — it makes a false
claim about what shipped. Delete it in both places; a local delete alone leaves the
remote lying.

```
git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
```

Backfilling a missed release is safe at any time. The commit goes in `--target`,
as a **full SHA** — the positional argument after the tag is an asset file, not a
commit, and passing one there fails with `no matches found`.

```
gh release create vX.Y.Z --target <full-sha> --title "..." --notes-file notes.md --latest=false
```

`--latest=false` on a backfill: without it, a release created today takes the
"Latest" badge from the newer version it is being filed behind.
