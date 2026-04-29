# ChessInsights Architecture

ChessInsights is a public analytics app for Chess.com players. A user enters a
Chess.com username and receives practical performance insights based on public
game history: results by rating range, openings, time class, endings, and rating
history.

## Goals

- Turn public Chess.com archives into useful self-analysis without requiring PGN
  exports.
- Keep imports reliable for small and large accounts.
- Preserve raw provider data for reproducibility while exposing stable,
  normalized domain records to the app.
- Make provider access safe, queued, throttled, observable, and testable.
- Ship an MVP that can become a production system without replacing the core
  architecture.

## Non-Goals

- Do not perform engine analysis in the MVP.
- Do not bypass provider limits or protections.
- Do not require Chess.com authentication for public dashboard analysis.
- Do not build saved accounts, billing, team dashboards, or scheduled refreshes
  until the core import and analytics loop is reliable.

## Target Users

- Casual Chess.com players who want trends without exporting PGNs.
- Improving players tracking weak spots by rating band, opening, and time
  control.
- Coaches reviewing student history.
- Streamers and content creators making player breakdowns.
- Club admins comparing member performance in a future expansion.

## Roadmap

| Phase | Deliverables |
| --- | --- |
| 0. Discovery Spike | Validate Chess.com endpoints, import three real users manually, define result and opening mappings, and estimate worst-case archive size. |
| 1. Data Pipeline | Fetch profile, stats, archive list, and monthly games. Store raw responses. Retry and cache with provider headers. |
| 2. Normalizer | Convert raw games into `GameRecord`. Filter `rules === "chess"`. Classify result, color, ratings, time class, opening, ending, and move count. |
| 3. Aggregates | Build SQL queries for result breakdown, rating timeline, opponent-rating buckets, opening stacks, and most-played time class. |
| 4. Dashboard MVP | Build search, progress state, player summary, charts, filters, empty states, and error states. |
| 5. Production Hardening | Add queue workers, rate limiting, observability, tests, deployment, seed fixtures, privacy controls, and abuse controls. |

## Recommended Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Web | Next.js App Router, React, TypeScript | Strong dashboard ergonomics, server rendering, route handlers, and a broad deployment ecosystem. |
| API | Next.js route handlers | Good backend-for-frontend endpoints for search, job status, and dashboard reads. |
| Worker | Node.js and BullMQ | Durable Redis-backed jobs, retries, progress, and horizontal worker scaling. |
| Database | PostgreSQL | Relational game records, fast analytical queries, JSONB raw payloads, and materialized views when needed. |
| ORM | Prisma plus narrow raw SQL | Typed schema iteration with escape hatches for aggregate-heavy reads. |
| Cache/Queue | Redis | Job queue, rate limiting, locks, and short-lived cache. |
| Charts | Apache ECharts | Dense timelines, stacked charts, and interactive dashboard visualizations. |
| Client State | TanStack Query | Server-state caching, polling, refetching, and loading states. |
| Styling | Tailwind CSS with shadcn/ui and Radix | Accessible primitives and fast UI iteration. |
| Testing | Vitest, Playwright, MSW, Testcontainers | Unit, mocked-provider, end-to-end, and real dependency integration coverage. |

## Target Repository Layout

```text
chessinsights/
  apps/
    web/
      app/
        page.tsx
        player/[username]/page.tsx
        api/analyze/route.ts
        api/jobs/[jobId]/route.ts
      components/
      charts/
      styles/
    worker/
      src/index.ts
      src/jobs/import-player.ts
  packages/
    chesscom-client/
      src/client.ts
      src/types.ts
    domain/
      src/normalize-game.ts
      src/result-map.ts
      src/opening-family.ts
      src/move-count.ts
    db/
      prisma/schema.prisma
      src/client.ts
      src/queries/
    config/
  tests/
    fixtures/chesscom/
    integration/
    e2e/
```

## Data Flow

1. User submits a Chess.com username.
2. API validates the username and checks cached analysis freshness.
3. If data is missing or stale, the API enqueues an import job.
4. Worker fetches profile, stats, archive list, then monthly archives.
5. Worker serializes archive fetches per username and respects provider rate
   limits.
6. Raw provider responses are stored.
7. Normalizer creates stable game records.
8. Aggregates are computed from normalized records.
9. Dashboard reads precomputed or query-time aggregate JSON.

## Chess.com Public Endpoints

Use public read-only endpoints only:

- `GET /pub/player/{username}`
- `GET /pub/player/{username}/stats`
- `GET /pub/player/{username}/games/archives`
- `GET /pub/player/{username}/games/{YYYY}/{MM}`

Provider integration rules:

- Send a clear `User-Agent` with contact information before production launch.
- Serialize requests for the same username.
- Cap global concurrency.
- Retry `429` with exponential backoff and jitter.
- Respect `ETag` and `Last-Modified` when practical.
- Prefer fixture-backed tests over live calls in CI.

## Core Data Model

- `players`: Chess.com username, player ID, avatar, profile URL, status, and
  last sync metadata.
- `import_jobs`: requested username, status, progress, errors, and timestamps.
- `archives`: player, year, month, archive URL, `ETag`, `Last-Modified`, and
  fetch status.
- `raw_games`: game URL, archive, raw JSONB, PGN, and checksum.
- `games`: normalized color, ratings, result, ending, time class, opening, date,
  move count, and URL.
- `opening_families`: deterministic mapping rules with taxonomy version.
- `aggregate_snapshots`: cached chart payloads per player, filter set, and time
  class.

## Milestone Criteria

MVP is complete when a user can enter a username and get accurate charts for
bullet, blitz, rapid, and daily games.

Beta is complete when imports are reliable for large accounts and do not block
web requests.

Production is complete when the app handles concurrent users, refreshes cached
data safely, and monitors failed imports plus Chess.com rate-limit behavior.

## Operational Risks

- Chess.com rate limits: use queue-first imports, per-player serialization,
  global concurrency caps, and backoff.
- Large accounts: index normalized games by `player_id`, `time_class`, and
  `end_time`; store one normalized row per game; precompute expensive
  aggregates.
- Stale data: expose refresh state clearly and avoid real-time guarantees.
- Opening parsing: preserve raw ECO URL/name and taxonomy version.
- Result ambiguity: keep raw ending codes and log unknown mappings.
- Security: validate usernames, rate-limit searches, store only public data, and
  never proxy arbitrary provider URLs.
- Scaling: add scheduled refreshes, materialized aggregates, object storage for
  raw monthly payloads, and table partitioning only when measured need appears.
