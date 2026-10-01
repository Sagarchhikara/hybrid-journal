# Hybrid Training Journal

A local-first training journal for people who lift and run. Log gym workouts, runs and
sleep; see history, a dashboard, an activity heatmap and descriptive insights.

It is a journal and a dashboard — not a coach or a planner. No backend, no accounts, no
sync. All data lives on-device in SQLite.

## Status: Phase 0 (foundation)

The shell, theme, database and dev tooling exist. Logging forms, charts, the heatmap and
insights are placeholders.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on a physical device. No development build is needed:
`expo-sqlite` and `react-native-svg` are both bundled in Expo Go, and Drizzle's migration
bundling is a build-time Babel transform rather than native code.

| Script                | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `npm run typecheck`   | `tsc --noEmit`                                                 |
| `npm run lint`        | ESLint                                                         |
| `npm run format`      | Prettier, write                                                |
| `npm run db:generate` | Regenerate Drizzle migrations after editing `src/db/schema.ts` |

## Layout

```
src/
  app/            Expo Router routes — (tabs) group + log/ modal stack
  db/             schema, client, migrations, seeds, query hooks
  components/     Screen, Text, Card, Button, Icon
  theme/          colour / spacing / radii / typography tokens
  lib/            date and unit helpers
  features/       gym, runs, sleep, insights — empty until later phases
```

## Two rules that matter

**Dates are local calendar strings.** Every `date` column is `'YYYY-MM-DD'` text, never a
UTC timestamp. Streaks and weekly rollups are calendar questions; storing an instant would
shift entries across midnight when the user changes time zone. Use the helpers in
`src/lib/dates.ts` — in particular never `new Date('2026-10-01')`, which parses as UTC
midnight.

**Pace is derived, never stored.** `runs` holds `distance_km` and `duration_sec`;
`formatPace()` in `src/lib/units.ts` does the division at read time.

## Dev tooling

In a dev build, the **You** tab gains a Developer section that seeds three weeks of
plausible workouts, runs, sleep and daily metrics, or clears everything. Both are gated
behind `__DEV__`. The Home tab's counts come from Drizzle live queries, so they update the
instant anything is written.
