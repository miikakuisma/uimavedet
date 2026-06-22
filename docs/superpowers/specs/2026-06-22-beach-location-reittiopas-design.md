# Beach location + HSL Reittiopas — design

**Date:** 2026-06-22
**Status:** Approved (pending spec review)

## Goal

When a user taps a beach in the Uimavedet app, open a detail sheet that shows
**where the beach is** (a map) and a **button that opens a route to it in HSL
Reittiopas** (the journey planner). The sheet also repeats the water
temperature / blue-green algae status and shows the beach's description text.

## Context

- [index.html](../../../index.html) — a single static HTML/CSS/JS file
  (mobile-first, no build step, no JS dependencies). It fetches beach data from
  a Cloudflare Worker at `https://meri.puter.work/api/beaches` and renders a
  sortable, filterable list of beach cards. Each card has a favorite `★`
  toggle.
- [worker.js](../../../worker.js) — the Worker. It queries Helsinki's Service
  Map API (`api.hel.fi/servicemap/v2/unit/`), transforms the result, and
  returns `{ updated, updatedText, beaches: [...] }`. Each beach currently
  carries `name`, `municipality`, `temp`, `tempC`, `tempExact`, `tempTime`,
  `algae`, `algaeRank`, `algaeLabel`, `algaeTime` — **no coordinates and no
  description**.
- The Service Map API *does* return per-unit `location` (a GeoJSON Point with
  `coordinates: [lon, lat]`) and `description` (`{ fi, sv, en }`). Verified
  2026-06-22 against the live API.

Because the front-end has no coordinates today, this feature requires a small
worker change in addition to the front-end work.

## Constraints / non-goals

- Keep the project dependency-free: no JS libraries, no build step, no API
  keys / secrets.
- No backend beyond the existing worker.
- Don't redesign the list, filters, favorites, or loading/error/off-season
  states. This feature is purely additive.

## Design

### 1. Worker change ([worker.js](../../../worker.js))

- Add `location,description` to the API request's `only=` query parameter
  (currently `only=name,municipality,observations`).
- In `transformBeach(unit, now)`:
  - Read coordinates from `unit.location?.coordinates`. The API order is
    `[lon, lat]`. Produce `lat` and `lon` (numbers), or `null` if absent.
  - Read `description` from `unit.description?.fi` (fall back to `.en`), or
    `null` if absent.
  - Add `lat`, `lon`, `description` to the returned object.
- The existing filter (`b.temp !== null || b.algae !== "unknown"`) is
  unchanged — coordinates/description never gate inclusion.

### 2. Front-end: opening the sheet ([index.html](../../../index.html))

- The existing `$list` click handler already intercepts clicks on the `.fav`
  button. Extend it: a click on a card that is **not** on the `.fav` button
  opens that beach's detail sheet.
- Look up the full beach object from `state.beaches` by `name` (the same unique
  key favorites already use) — keeps the heavy `description` text out of the
  DOM/data attributes.
- Make the card itself an accessible activation target: add
  `role="button"`, `tabindex="0"`, and handle `Enter` / `Space` to open the
  sheet. The `★` favorite button remains a separate, independently working
  control (its clicks must not also open the sheet).

### 3. Front-end: the detail sheet

A bottom sheet that slides up over a dimmed backdrop (mobile-first, respecting
the existing `env(safe-area-inset-*)` handling). One sheet element in the DOM,
reused/populated per beach. Contents, top to bottom:

1. **Header** — beach name (Fraunces, matching `.bname`) + municipality, and a
   close `✕` button.
2. **Map** — an `<iframe>` pointing at OpenStreetMap's embed with a marker at
   the beach:
   `https://www.openstreetmap.org/export/embed.html?bbox=<minlon>,<minlat>,<maxlon>,<maxlat>&layer=mapnik&marker=<lat>,<lon>`
   where the bbox is a small box around the point (e.g. ±0.004°). The iframe
   `src` is set when the sheet opens and cleared when it closes, so no map
   loads until needed and it stops loading on close.
3. **Temp + algae** — water temperature and algae status/label, reusing the
   existing `ALGAE_LABEL` map and `--accent` color treatment.
4. **Description** — the `description` paragraph (preserve line breaks).
5. **Primary button — "Avaa reittiopas →"** — an
   `<a target="_blank" rel="noopener">` whose href is
   `https://reittiopas.hsl.fi/reitti/POS/<encoded>` where `<encoded>` is
   `encodeURIComponent(name + "::" + lat + "," + lon)`. `POS` tells Reittiopas
   to plan the journey from the user's current location to the beach.

**Behavior & a11y:**
- Closeable via the `✕` button, a tap on the backdrop, and the `Esc` key.
- On open, move focus into the sheet (the close button). On close, return focus
  to the card that opened it.
- Respect `prefers-reduced-motion` for the slide animation (consistent with the
  existing `@media (prefers-reduced-motion:reduce)` rule).
- **No coordinates:** if `lat`/`lon` are `null`, omit the map iframe and the
  Reittiopas button; still show name, temp/algae, and description.

### 4. External contract to verify during implementation

The exact `reittiopas.hsl.fi` route-URL format is the one external dependency.
The Digitransit shape `/reitti/POS/<name>::<lat>,<lon>` is expected to be
correct, but it must be confirmed against the live site during implementation
rather than assumed.

## Testing

- **Worker:** `transformBeach` returns `lat`/`lon`/`description` for a unit with
  `location`/`description`, and `null`s when those are absent; the API URL
  includes `location,description` in `only=`.
- **Front-end (manual, in-browser):**
  - Tapping a card (not the star) opens the sheet for that beach; tapping the
    star still only toggles favorite.
  - Map iframe loads with a pin on the beach; closing the sheet clears it.
  - "Avaa reittiopas" opens reittiopas.hsl.fi with a route from current location
    to the correct beach coordinates.
  - Close works via `✕`, backdrop, and `Esc`; focus returns to the card.
  - A beach with no coordinates shows the sheet without map/Reittiopas button.

## Out of scope

- Street address field (the description already covers arrival/transit).
- Caching, offline, or any change to data refresh behavior.
- Styling the map tiles to match the paper palette (would require Leaflet; not
  worth the dependency).
