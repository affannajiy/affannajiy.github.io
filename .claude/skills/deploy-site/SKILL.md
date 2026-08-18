---
name: deploy-site
description: Deploy the portfolio to GitHub Pages and diagnose deploy failures — repo name and visibility requirements, correct push-then-enable order, and what each failure symptom actually means. Use when asked to deploy, push, publish, enable Pages, or when the live site is wrong or missing.
---

# Deploy to GitHub Pages

Push **is** the deploy. There is no build step and no pipeline to break — GitHub
Pages serves the repo verbatim.

Run the `verify-site` round before pushing; there is no CI to catch anything.
Background in `docs/deployment.md`.

## Preconditions — check these before touching Pages

Both are silent failures. Neither produces a useful error message.

**1. The repo name must be exactly `affannajiy.github.io`.**

This is a GitHub *user site*, and the name is what makes it serve at the root
domain. Any other name serves at `affannajiy.github.io/<repo-name>/` instead.

The name that matters is the one **on GitHub**, not the folder on disk.
Renaming a local folder does nothing at all. Verify:

```bash
git remote -v
```

To probe what actually exists remotely — note that after a rename GitHub keeps a
redirect, so the *old* name resolving does not mean the rename failed:

```bash
git ls-remote https://github.com/affannajiy/affannajiy.github.io.git
```

`Repository not found` means the rename has not happened.

**2. The repo must be public** (on the free plan).

Pages from a private repo requires a paid plan. A private repo is the usual
reason the Pages settings screen offers no branch, or the site 404s forever.

Because the API hides private repos, absence from this list means private:

```bash
curl -s "https://api.github.com/users/affannajiy/repos?per_page=100" \
  | grep -o '"full_name": *"[^"]*"' | grep github.io
```

Fix at Settings → General → Danger Zone → Change repository visibility → Public.

## Order: push first, then enable Pages

Enabling Pages before anything is pushed gives a 404 you then have to wait out,
because there is no commit to build from.

```bash
git add -A && git commit -m "Update portfolio"
```

```bash
git push origin master
```

Then GitHub → Settings → **Pages**:

- **Source:** `Deploy from a branch`
- **Branch:** `master`, folder `/ (root)`

The branch dropdown must match the actual default branch — this repo uses
`master`, not `main`. Confirm with `git branch --show-current`.

First publish takes 1–2 minutes. Every push after that redeploys automatically.

## Before pushing, check what is staged

The working tree still carries deletions from the old Next.js scaffold, and
`assets/` must not gain a PDF containing personal data.

```bash
git status --short
```

Never commit: API tokens, phone numbers, or a résumé PDF carrying third-party
contact details. Once pushed to a public repo it is crawlable, and rewriting
history does not un-publish it.

## Failure symptoms

| Symptom | Cause and fix |
| --- | --- |
| Site at `affannajiy.github.io/<name>/` | Repo not named `affannajiy.github.io`. Rename it. |
| Pages screen offers no branch | Repo is private (free plan), or nothing has been pushed yet. |
| 404 immediately after enabling | Normal on first deploy — wait. If it persists, check branch and `/ (root)`. |
| Pushed, site unchanged | Browser or CDN cache. Hard-refresh (`Ctrl+Shift+R`). Check the Actions tab for a failed run. |
| Projects table empty on the live site | GitHub API rate limit (60/hr per IP), not a deploy fault. The page states this itself and offers Retry. |
| Styles missing on the live site only | A CSP violation, or a path that works locally but is case-wrong. Pages is case-sensitive; local Windows is not. |
| Run stuck on `Queued`, status green | Orphaned run — enqueued during an incident and never picked up. Re-running revives the same wedged record. Use `workflow_dispatch` instead. Escalate at **10 min**; normal pickup is seconds. |
| `deploy` fails 503, `build` succeeded | GitHub's Pages deployment API, not the commit. Check `githubstatus.com` and wait; the artifact was built fine. |
| Run page green, site still old | Measure the edge, not the browser: `curl -s "https://affannajiy.github.io/index.html?b=$(date +%s)" | grep -c cert-verify` |

## Verify the live site after deploy

Do not assume it worked. Load `https://affannajiy.github.io`, then confirm:

- The Projects table populates (proves `script.js` loaded and the API call ran).
- No console errors owned by the site.
- The page renders styled (proves `style.css` resolved — a case-mismatched path
  fails on Pages while working locally).


## When a deploy will not land

Full ladder in `docs/deployment.md`. Three rules that matter most:

- **Never click Unpublish site** to force a redeploy. This is a user page, so
  there is no `None` branch — Unpublish is the only equivalent, and it takes the
  live site down. Stale-but-serving beats dark.
- **Never revert or force-push** to trigger a deploy. The commit is not what
  failed; a new hash meets the same queue.
- **Order matters when switching to Actions**: the workflow must be on `master`
  before Source is set to `GitHub Actions`, or nothing deploys.
