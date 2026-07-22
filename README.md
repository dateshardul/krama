# Krama

*क्रम — sequence, order, one step following another.*

A planning tool for one person working towards one goal, with one mentor looking over
their shoulder. Goal → epics → milestones → two-week sprints → tasks, with the meetings
and commitments that eat the week counted against capacity rather than ignored.

Built for Shardul's push into the AI market, and overseen by his father.

If you have never met Agile before, read **[AGILE.md](AGILE.md)** first — or press **?**
inside the app, which has the short version.

---

## Running it

No build step, no dependencies. Any static server will do:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` straight off disk works too — the only thing that breaks is the
repo-activity fetch, which fails silently and falls back to a snapshot.

| URL | What you get |
|---|---|
| `/` | The real plan |
| `/?demo` | Scrubbed sample data, nothing real — this is what the public sees |

---

## The files

```
index.html            markup for the five views and every modal
style.css             the parchment design system, shared in spirit with the
                      Date Panchang task board
seed.js               starting data — real epics, real repos, real dates
app.js                all behaviour: state, persistence, charts, rendering
supabase-schema.sql   the sync table, plus the auth hardening to apply later
activity.json         written nightly by the Action; safe to delete
.github/workflows/    the repo-activity refresh job
```

## The five views

- **Today** — what to do now: this sprint's open tasks, anything blocked, the week's
  commitments, and the next milestones. The daily 5-minute check.
- **Sprint** — the board for the current two weeks, plus a capacity meter, a WIP-limit
  warning, and a burndown that tells you you're behind *early* rather than at the end.
- **Backlog** — everything unscheduled, grouped by epic, with milestones shown in place.
  Each epic shows how long since its repo was last touched.
- **Roadmap** — every epic as a row across the months. Diamonds are milestones you set,
  circles are deadlines someone else set. Red line is today.
- **Review** — the page to open when you sit down together. What got finished, velocity
  across sprints, retro notes, and every comment either of you has left.

## Data, and who can see it

The plan lives in `localStorage` by default — one browser, nothing shared. Click the
**Local** chip to connect a free Supabase project and the same plan appears on every
device you connect.

> **Do not put this on a public subdomain in its current state.** Sync uses the Supabase
> anon key, so anyone with the URL and key can read and edit the plan. That is fine for
> two people's own devices. `supabase-schema.sql` has the auth + row-level-security
> policies to apply before it goes anywhere public, and the app change that goes with it.

**Download a backup** from Settings before anything risky. It's a plain JSON file and
restores through the same panel.

## Repo activity

Each epic can name a GitHub repo. The Action in `.github/workflows/repo-activity.yml`
writes `activity.json` nightly so the Backlog can show *last commit 38d ago* against each
epic — a quiet, honest signal about which projects have actually stalled.

It needs a fine-grained PAT with read-only Metadata access to your repos, stored as the
repo secret `REPO_SCAN_TOKEN`. The default `GITHUB_TOKEN` only sees this one repo.

---

## Deploying

The plan is a private subdomain plus a public demo:

1. Push this repo to GitHub (private).
2. New Cloudflare Pages project → connect the repo → **no build command**, output
   directory `/`.
3. Custom domain `plan.shardul.date`.
4. Apply the Stage 2 policies in `supabase-schema.sql` **before** step 3 goes live.

The portfolio then links to `plan.shardul.date/?demo` as a case study — recruiters see
the work, nobody sees the plan.

Note that `shardul.date` itself is a *separate* Cloudflare Pages project (`portfolio-9kx`).
Krama gets its own project so its deploys never touch the portfolio.

---

## Not built yet

Deliberately left for after the first real sprint, so the design follows actual use:

- Supabase Auth — currently anon-key only (see the warning above)
- Reordering the backlog by priority (drag to rank)
- Linking a task to a specific commit or PR
- Mobile layout below ~700px is usable but not designed
