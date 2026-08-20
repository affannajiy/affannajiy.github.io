---
name: audit-untrusted-input
description: Re-run the untrusted-input audit on the portfolio site — poison the localStorage repo cache and the URL query string with javascript: schemes, HTML injection and wrong types, then confirm nothing executes, bad rows are dropped and bad hosts fall back to the profile URL. Use after any change to the render path, the cache shape, the sanitising helpers, or the fields read from the GitHub API.
---

# Audit the untrusted inputs

Three inputs are attacker-controllable and are all narrowed on read: the GitHub
API reply, the `localStorage` cache, and the URL query string. The rules are in
[reference/security-posture.md](reference/security-posture.md). This is how to
prove they still hold.

**Re-run this whenever a new field reaches the cache or the render path.** Adding
`topics` prompted the last round.

## 1. Pin the render to the poison

The live API overwrites a poisoned cache before you can measure it. Point the
fetch at a 404, so the cache renders **and** the error path runs at the same
time:

```js
// in script.js, temporarily
var API_URL = "https://api.github.com/TESTFAIL/users/affannajiy/repos?...";
```

Revert it afterwards and confirm:

```bash
grep -c TESTFAIL script.js
```

That must print `0`.

## 2. Poison the cache

Write a mix of valid rows and every shape of bad one. The valid rows are the
control. If they disappear too, the guard is over-broad.

```js
var flood = [];
for (var i = 0; i < 500; i++) {
  flood.push({ name: 'flood-' + i, language: 'C', updated_at: '2026-01-01T00:00:00Z',
               topics: [], html_url: 'https://github.com/affannajiy/f' + i });
}

localStorage.setItem('projects-cache-v1', JSON.stringify({
  time: Date.now(),
  repos: [
    { name: 'good-one', description: 'fine', language: 'Python',
      html_url: 'https://github.com/affannajiy/good-one', topics: ['python'] },

    // The attribute-injection case. This is the one that actually got through:
    // quotes are NOT escaped by a textContent-based escaper, so a name like
    // this closed the data-repo attribute and opened onmouseover.
    { name: 'pwn" onmouseover="window.__XSS=1" data-x="',
      html_url: 'javascript:alert(1)' },

    { name: '<img src=x onerror=alert(1)>', html_url: 'https://evil.example.com/x' },
    { name: 'bad-lang', language: '<b>markup</b>' },
    { name: 'bad-topics', topics: 'not-an-array' },
    { name: 'long-topic', topics: ['x'.repeat(80)] },
    { name: 'shouty-topic', topics: ['PYTHON'] },
    { name: 'huge', description: 'D'.repeat(20000), language: 'L'.repeat(500) },
    { name: 'forked-out', fork: true },
    null,
    'a bare string',
    { name: '' }
  ].concat(flood)
}));
location.reload();
```

Check the cache key name against `script.js` before you paste. It must match what
the site reads.

## 3. Measure, do not read

```js
var body = document.getElementById('projects-body');
JSON.stringify({
  rows:     body.querySelectorAll('tr').length,
  injected: document.querySelectorAll(
              '#projects-body [onmouseover],#projects-body [onerror],#projects-body [onclick]'
            ).length,
  imgs:     body.querySelectorAll('img').length,
  bold:     body.querySelectorAll('b').length,
  xssRan:   window.__XSS === 1,
  hosts:    [].map.call(body.querySelectorAll('a'), function (a) {
              try { return new URL(a.href).hostname; } catch (e) { return 'BAD:' + a.href; }
            }).filter(function (v, i, all) { return all.indexOf(v) === i; }),
  maxDesc:  Math.max.apply(null, [].map.call(
              body.querySelectorAll('td:nth-child(2)'), function (t) { return t.textContent.length; })),
  status:   document.getElementById('projects-status').textContent
}, null, 1)
```

**Expected:** `rows` capped at `MAX_REPOS` (200) despite 512 entries;
`injected`, `imgs`, `bold` all `0`; `xssRan` false; `hosts` is `["github.com"]`
alone, so the `javascript:` URL and `evil.example.com` both fell back;
`maxDesc` is 300, so the clamp held against a 20,000-character description;
over-long topics dropped and uppercase ones folded to lowercase; the fork
excluded; the status line naming **both** the cache age and the failure, with a
Retry button present.

**`injected: 0` is the check that matters most.** It was `1` once, and the CSP,
not the escaper, is what stopped it running.

## 3a. The cache must heal itself

A cache that fails validation is deleted, not merely skipped. Two cases.

```js
// corrupt JSON
localStorage.setItem('projects-cache-v1', '{not json');
location.reload();
// then: localStorage.getItem('projects-cache-v1') === null

// a timestamp forged into the future, which would otherwise pin poison
// permanently past its own expiry
localStorage.setItem('projects-cache-v1', JSON.stringify({
  time: Date.now() + 31536000000,
  repos: [{ name: 'ghost', html_url: 'https://github.com/affannajiy/g' }]
}));
location.reload();
// then: getItem === null, and "ghost" appears nowhere in document.body.textContent
```

## 4. Poison the URL

```
?sort=<img onerror=alert(1)>&dir=javascript:&view=../../etc&topic=NOT_A_SLUG
```

**Expected:** every one ignored instead of assigned, and the query string
rewritten to the legal state only. `sort` and `dir` are checked with
`hasOwnProperty` against known sets, `view` against the two modes, and `topic`
against `TOPIC_RE`.

## 5. Clean up

```js
localStorage.removeItem('projects-cache-v1');
```

Revert `API_URL`, reload in a **fresh tab**, and confirm the console is clean.
Errors from the 404 runs persist in the pane's console and otherwise read back as
current failures. See `preview-pane-quirks`.

## 6. Check nobody rebuilt the trap

*Not parsing HTML* closes the whole class of bug. Escaping it well does not.
Confirm that is still true:

```bash
grep -n "innerHTML" script.js
```

Every hit must be a comment or a bare `= ""` clear. **An `innerHTML` assignment
built by concatenation is a regression**, even if the values look safe. An
`escapeHTML()` back in the file is the same regression wearing a hat. See
[reference/security-posture.md](reference/security-posture.md) §3.

## Done means

- Valid rows still render (the guard is not over-broad)
- Zero injected nodes, zero executed handlers
- Row count and field lengths bounded
- A failed cache is gone from `localStorage`, not just ignored
- No concatenated `innerHTML` anywhere in `script.js`
- Every bad URL falls back to the profile URL
- The status line names the cache age *and* the failure, and offers Retry
- `grep -c TESTFAIL script.js` prints `0`
- The result is written into `verify-site/reference/verification-log.md`
