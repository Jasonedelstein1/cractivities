# Caribe Sur — Honeymoon Day Planner

A static, offline-capable PWA for deciding what to do each day on Costa Rica's southern
Caribbean coast, Oct 5–10 2026. It is a **menu, not a schedule**: every day shows the fixed
logistics plus a set of options, filterable by category, area, open-now, and distance.

Live site: `https://jasonedelstein1.github.io/cractivities/`

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/cractivities/
npm run validate   # sanity-check activities.json + days.json
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve dist/ with the service worker active
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which validates the data, builds, and
publishes `dist/` to GitHub Pages. One-time setup in the repo: **Settings → Pages → Source:
GitHub Actions**.

## Editing content

All content lives in two files. Components contain no copy.

- `src/data/activities.json` — every place and activity (schema in `src/data/schema.ts`).
  - `hours`: `["08:00","16:00"]`, `null` for closed that day, omit the key when unknown.
  - `bestDays`: ISO dates the item fits; empty = any day.
  - `booking.whatsapp`: digits only (`50688398386`).
- `src/data/days.json` — per-day anchors (flights, car, check-in) and 2–4 named option sets.
  Lodging for the day is `lodgingId`, which must be an activity id.

`npm run validate` catches bad ids, malformed hours, and dangling references.

## Behaviour notes

- All times are computed in `America/Costa_Rica` (UTC−6, no DST), never device time.
- Outside Oct 5–10 2026 the Today screen shows a date strip defaulting to Oct 5.
- "Near me" asks for location once. If denied, distances fall back to the day's lodging and the
  filter bar says so.
- Drive-time estimates assume 30 km/h on a road 1.3× the straight-line distance, labelled "~".
- Done / Skip / Favorite and the last-used filters persist in `localStorage`.
- After one full load the app shell and data work in airplane mode; the map keeps up to 600
  previously viewed OpenStreetMap tiles.
