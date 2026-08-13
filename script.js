/* ─────────────────────────────────────────────────────────────
   Projects table + nav scrollspy.

   The Projects list is never hardcoded: it is fetched from the GitHub REST
   API on every load. If the API is unreachable the failure is shown in the
   table — there is no stale baked-in fallback to hide behind.
   ───────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var GITHUB_USER = "affannajiy";
  var API_URL =
    "https://api.github.com/users/" +
    GITHUB_USER +
    "/repos?sort=updated&per_page=100";

  var tbody    = document.getElementById("projects-body");
  var statusEl = document.getElementById("projects-status");
  var table    = document.getElementById("projects-table");
  var filterEl = document.getElementById("projects-filter");

  var repos = [];      // everything the API returned, minus forks
  var view  = [];      // what is currently rendered: filtered, then sorted
  var sortKey = "updated";
  var sortDir = "descending";
  var query = "";

  /* ── Helpers ─────────────────────────────────────────── */

  // Repo text is remote data, so it is untrusted input.
  function escapeHTML(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  // Escaping stops a value breaking out of an attribute, but it does not stop
  // "javascript:..." being a valid href. Everything here is remote data, so the
  // scheme and host are checked rather than assumed (Security §3.6, §2.4).
  function safeRepoURL(value) {
    try {
      var url = new URL(String(value));
      if (url.protocol === "https:" && url.hostname === "github.com") {
        return url.href;
      }
    } catch (e) {
      /* falls through to the safe default below */
    }
    return "https://github.com/" + GITHUB_USER;
  }

  // Remote JSON is not guaranteed to type its own fields. Coerce before it
  // reaches innerHTML, so a non-numeric star count cannot carry markup.
  function safeCount(value) {
    var n = Number(value);
    return isFinite(n) && n >= 0 ? String(Math.floor(n)) : "0";
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toISOString().slice(0, 10);
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    if (state) statusEl.setAttribute("data-state", state);
    else statusEl.removeAttribute("data-state");
  }

  /* ── Loading state ───────────────────────────────────────
     Shape-matched skeleton rows rather than a spinner: they say what is
     coming, not merely that something is. */
  // Bar widths come from the stylesheet, not an inline style attribute: the
  // Content-Security-Policy forbids inline styles, and that is worth keeping.
  function renderSkeleton(rows) {
    var cells = "";
    for (var c = 0; c < 5; c++) cells += '<td><span class="skeleton-bar"></span></td>';

    var html = "";
    for (var r = 0; r < rows; r++) html += '<tr class="skeleton-row">' + cells + "</tr>";
    tbody.innerHTML = html;
  }

  /* ── Sorting ─────────────────────────────────────────── */

  function valueFor(repo, key) {
    switch (key) {
      case "name":     return repo.name.toLowerCase();
      case "language": return (repo.language || "").toLowerCase();
      case "stars":    return repo.stargazers_count;
      case "updated":  return repo.updated_at;
      default:         return "";
    }
  }

  // Filter first, then sort what survived.
  function applyFilter() {
    var q = query.trim().toLowerCase();
    if (!q) {
      view = repos.slice();
      return;
    }
    view = repos.filter(function (r) {
      return (
        r.name.toLowerCase().indexOf(q) !== -1 ||
        (r.description || "").toLowerCase().indexOf(q) !== -1 ||
        (r.language || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function sortRepos() {
    var dir = sortDir === "ascending" ? 1 : -1;
    view.sort(function (a, b) {
      var av = valueFor(a, sortKey);
      var bv = valueFor(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      // Stable tiebreak so equal values never shuffle between sorts.
      return a.name.localeCompare(b.name);
    });
  }

  // aria-sort is the single source of truth: the CSS arrow is drawn from it,
  // so the visible state and the announced state cannot drift apart.
  function syncSortIndicators() {
    var headers = table.querySelectorAll("thead th[aria-sort]");
    for (var i = 0; i < headers.length; i++) {
      var btn = headers[i].querySelector(".sort-btn");
      var key = btn && btn.getAttribute("data-key");
      headers[i].setAttribute(
        "aria-sort",
        key === sortKey ? sortDir : "none"
      );
    }
  }

  /* ── Rendering ───────────────────────────────────────── */

  function renderRows() {
    if (view.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5">No repositories match “' +
        escapeHTML(query) +
        '”.</td></tr>';
      return;
    }

    var html = "";
    for (var i = 0; i < view.length; i++) {
      var r = view[i];
      html +=
        "<tr>" +
        '<td><a class="text-link" href="' +
        escapeHTML(safeRepoURL(r.html_url)) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHTML(r.name) +
        "</a></td>" +
        "<td>" + (escapeHTML(r.description) || "—") + "</td>" +
        "<td>" + (escapeHTML(r.language) || "—") + "</td>" +
        "<td>" + safeCount(r.stargazers_count) + "</td>" +
        "<td>" + formatDate(r.updated_at) + "</td>" +
        "</tr>";
    }
    tbody.innerHTML = html;
  }

  // One sentence covering count, filter and sort — the whole state of the table.
  function describeState() {
    if (repos.length === 0) return "No public repositories found.";

    var sortLabel = { name: "name", language: "language", stars: "stars", updated: "last updated" }[sortKey];
    var direction = sortDir === "ascending" ? "ascending" : "descending";

    if (query.trim() === "") {
      return (
        repos.length +
        " public " +
        (repos.length === 1 ? "repository" : "repositories") +
        ", live from the GitHub API. Sorted by " + sortLabel + ", " + direction +
        ". Select a column header to sort."
      );
    }
    return (
      "Showing " + view.length + " of " + repos.length +
      " repositories matching “" + query.trim() + "”" +
      (view.length === 0 ? ". Clear the filter to see them all." :
        ", sorted by " + sortLabel + ", " + direction + ".")
    );
  }

  function refresh() {
    applyFilter();
    sortRepos();
    syncSortIndicators();
    renderRows();
    setStatus(describeState());
  }

  function renderError(message) {
    tbody.innerHTML =
      '<tr><td colspan="5">Could not load repositories.</td></tr>';

    // State the fix, not just the fault (Rulebook §1.9).
    setStatus(
      "Could not load repositories: " +
        message +
        ". This is usually the GitHub API hourly rate limit (60 requests per " +
        "hour). Wait a few minutes and retry, or browse the profile directly " +
        "at github.com/" + GITHUB_USER + ".",
      "error"
    );

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retry-btn";
    btn.textContent = "Retry";
    btn.addEventListener("click", function () {
      btn.disabled = true;
      loadProjects();
    });
    statusEl.appendChild(document.createElement("br"));
    statusEl.appendChild(btn);
  }

  /* ── Fetch ───────────────────────────────────────────── */

  function loadProjects() {
    setStatus("Loading repositories from GitHub…");
    renderSkeleton(6);

    fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("GitHub API responded " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        repos = data.filter(function (r) {
          return !r.fork;
        });

        if (repos.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="5">No public repositories found.</td></tr>';
          setStatus("No public repositories found.");
          return;
        }

        if (filterEl) filterEl.disabled = false;
        refresh();
      })
      .catch(function (err) {
        renderError(err.message);
      });
  }

  /* ── Sort click handling ─────────────────────────────── */

  table.addEventListener("click", function (event) {
    var btn = event.target.closest(".sort-btn");
    if (!btn || repos.length === 0) return;

    var key = btn.getAttribute("data-key");

    if (key === sortKey) {
      sortDir = sortDir === "ascending" ? "descending" : "ascending";
    } else {
      sortKey = key;
      // Text reads naturally A→Z; counts and dates read best largest-first.
      sortDir = key === "name" || key === "language" ? "ascending" : "descending";
    }

    refresh();
  });

  // Filtering 21 rows is instant, so there is nothing to debounce and no
  // spinner to justify — the table simply keeps up with typing.
  if (filterEl) {
    filterEl.disabled = true;   // no data to filter until the fetch lands
    filterEl.addEventListener("input", function () {
      query = filterEl.value;
      refresh();
    });
  }

  /* ── Nav scrollspy ───────────────────────────────────────
     Answers "where am I" without the user scrolling back to check. Marked in
     weight and rule as well as colour, so it never depends on colour alone. */
  function initScrollSpy() {
    var links = document.querySelectorAll(".site-nav a");
    var byId = {};
    var sections = [];

    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (section) {
        byId[id] = links[i];
        sections.push(section);
      }
    }
    if (sections.length === 0) return;

    var header = document.querySelector(".site-header");

    // The last section whose heading has passed under the header is the one
    // being read. Above the first section we are still in the masthead, so
    // nothing is marked rather than something being marked wrongly.
    function currentId() {
      var line = (header ? header.getBoundingClientRect().height : 0) + 24;
      var found = null;
      for (var s = 0; s < sections.length; s++) {
        if (sections[s].getBoundingClientRect().top <= line) {
          found = sections[s].id;
        }
      }
      // At the very bottom the last section may be too short to reach the
      // line; mark it anyway, since it is what the reader is looking at.
      var atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) found = sections[sections.length - 1].id;
      return found;
    }

    var marked;
    function update() {
      var current = currentId();
      if (current === marked) return;
      marked = current;
      for (var id in byId) {
        if (id === current) byId[id].setAttribute("aria-current", "true");
        else byId[id].removeAttribute("aria-current");
      }
    }

    // Coalesce to one update per frame — scroll fires far faster than paint.
    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        update();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  loadProjects();
  initScrollSpy();
})();
