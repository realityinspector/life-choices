# LIFE CHOICES by ALL ONE THING

![LIFE CHOICES Logo](./generated-icon.png)

**Turn your time into choices, and always know what to do next.**

Life Choices (2025–26) is a mobile-first app that treats your life as a set of activities and life events. Each one has a frequency, a duration and a value. Instead of a to-do list or a dashboard, it hands you **one next thing** and shows you what your habits add up to over the rest of your life.

It grew out of Sundial (2022), whose "your life as a single day" math it simplified. It was built fast on Replit with React, Express and Postgres.

---

## What was great about it

### 1. What's Next: one card, one decision
The home screen shows a single activity that's due now. Ordering:
1. Overdue activities and ones with no due date come first.
2. Ties are sorted by **priority**, then by **oldest due date**.

Skip it and you get the next one, without repeating the ones you just skipped. Completing or skipping moves `nextDue` forward by that activity's own frequency.

See `client/src/pages/whats-next.tsx`, `client/src/context/user-context.tsx` and `storage.getNextActivity` in `server/storage.ts`.

### 2. A value model for life events
*This lives on the [`seed/life-events`](https://github.com/realityinspector/life-choices/tree/seed/life-events) branch.*

Every life event (a gym session, date night, doomscrolling, a family vacation) carries a value range, a cost range, an hours range and three multipliers:
- **people:** shared time is worth more.
- **love priority:** relationship time is worth more.
- **time vortex:** some things eat far more time than they look like they will.

```
adjusted     = mid(value) · people · love / time_vortex
net          = adjusted − mid(cost)
value / hour = net / mid(hours)
annual       = net · events_per_year
score 0–100  = clamp(round(20 · log10(max(annual, 1) + 1)), 0, 100)
```

Doomscrolling (value −80..0, vortex 1.6) scores 0. Date night (people 1.5, love 2) and a family vacation (people 1.8, love 2) rise to the top.

See `shared/event-scoring.ts`, with 25 pre-scored events in `scripts/data/life-events-seed.csv`.

### 3. A free sundial
No account needed. Enter your age, life expectancy and sleep, and see what time it is in your life on a 6 AM to 6 PM dial. You also get your remaining conscious hours and how much of them each activity takes.

See `client/src/pages/free-sundial.tsx`, `client/src/components/ui/sundial-chart.tsx` and `client/src/lib/calculations.ts`.

### 4. Time machine slider
Drag from today to the end of your life expectancy and watch the hours pile up (`client/src/components/time-machine.tsx`).

### 5. Clusters and books
- **Clusters** bundle activities toward a goal ("Lose 10 lbs").
- **Books** are ordered, printable collections of activities, with a clean report and PDF export.

See `BOOK.md` and `client/src/pages/book*.tsx`.

### 6. Shareable activities
Any activity can be shared as a link (`/share/:token`), so a friend joins by trying the thing you sent them.

### 7. AI-assisted catalog
Admin tools use Together AI to generate activities, step-by-step "recipes" and images. The service is `server/services/together-ai.ts`, and the prompts are in `server/config/llm-prompts.json`.

### 8. Reusable seed data
- `scripts/data/activities-seed.csv` (on `seed/life-events`): 39 typical activities with frequency, hours, emoji, emotion and longevity impact.
- `life-events-seed.csv`: calibrated multipliers (time vortex 0.9–1.6, people and love 1–2.2) that are useful anywhere you want to weigh how people spend their time.

---

## Status and known issues

- **Last active:** July 2026. `main` is the June 2025 app. `seed/life-events` adds the value model and seed data.
- **What works:** `npm run build` passes.
- **Type errors:** `npm run check` reports about 190 errors. The first comes from JSX in a `.ts` file (`client/src/index.ts`).
- **Tests:** they need the `canvas` package, which doesn't compile on Node 24. Use Node 20.
- **Analytics page:** shows placeholder numbers, not real calculations.
- **Admin access:** controlled by a hardcoded username list in `server/routes.ts`.
- **Missing images:** the original images, database backups and Replit logs were removed from this public history, so activity images will be missing until you regenerate or upload your own.

## Getting started

Requirements: **Node 20** (for `canvas`) and **PostgreSQL**.

```bash
npm install                 # on Node 24: npm ci --ignore-scripts (tests won't run)
npm run db:push             # create tables with Drizzle
npm run dev                 # http://localhost:5000
```

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | required |
| `SESSION_SECRET` | required (e.g. `openssl rand -hex 32`) |
| `TOGETHER_API_KEY` | optional: AI activity, recipe and image generation |
| `OPENAI_API_KEY` | optional: LLM fallback |

Seed data (on `seed/life-events`):

```bash
npx tsx scripts/seed-life-events.ts
npx tsx scripts/import-activities.ts
```

## Project structure

```
client/   React + Vite frontend (wouter, TanStack Query, shadcn/ui, d3, recharts)
server/   Express API, Passport sessions, Together AI / OpenAI services
shared/   Drizzle schema and shared logic (event scoring)
scripts/  seeders, importers and seed CSVs
```

## License

Licensed under the [Business Source License 1.1](LICENSE). Production use is free for organizations with under US $10M in annual revenue; larger organizations need a commercial license. On 2030-10-21 the code converts to Apache-2.0.

## Credits

Built by Sean McDonald ([realityinspector](https://github.com/realityinspector)) with Replit Agent, as part of ALL ONE THING.
