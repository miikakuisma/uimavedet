# Helsinki beach conditions worker — design

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan

## Goal

Repurpose the existing Puter Worker (currently a food-menu proxy) into one that
serves live **sea temperature** and **blue-green algae** status for the
**Helsinki metropolitan area** (Helsinki + Espoo + Vantaa) public swimming
beaches, rendered on a TRMNL e-ink display.

The food-menu functionality (`/api/menu`, Aromi API) is **removed entirely** —
this is a full replacement, not an addition.

## Architecture & data flow

```
TRMNL display  →  Puter Worker (GET /api/beaches)  →  Service Map API (api.hel.fi)
                          ↓
            JSON: { updated, beaches: [ {name, temp, algae, ...} ] }
                          ↓
            TRMNL plugin.html renders the beach table on e-ink
```

The shape of the system is unchanged (Puter Worker acts as a CORS-friendly proxy
+ transformer between a public API and the TRMNL plugin). Only the upstream
source and the data model change.

## Data source

**City of Helsinki Service Map API** — the same backend that powers
ulkoliikunta.fi. A single request returns all beaches with their real-time
observations:

```
GET https://api.hel.fi/servicemap/v2/unit/?service=730,731&municipality=helsinki,espoo,vantaa&include=observations&page_size=400&only=name,municipality,observations&format=json
```

- `service=730,731` — both swimming-spot services: `731` = *uimarannat*
  (public beaches) and `730` = *uimapaikat* (swimming places). Both carry the
  same temperature + algae observations; `730` adds well-known spots such as
  Seurasaaren uimala, Uunisaari, Pihlajasaari and Suomenlinna that are not filed
  as `731` beaches. (`917` = *liikunta* is too broad and is excluded.)
- `municipality=helsinki,espoo,vantaa` — the three metro cities (excludes
  Kirkkonummi/Siuntio). Yields ~68 units, ~47 with fresh live data.
- `include=observations` — attaches the real-time readings (omitted by default).
- `only=...` — trims the payload to the fields we use (`municipality` is kept so
  each beach can show its city).

### Temperature availability differs by city

Only Helsinki beaches carry `measured_swimming_water_temperature` (precise sensor
°C). Espoo/Vantaa beaches report only the `swimming_water_temperature` category
range (e.g. "19-21°C"). Both are therefore needed; measured is preferred, the
category range is the fallback.

### Relevant observation properties (per beach)

| Property                               | Meaning                          | Use                          |
|----------------------------------------|----------------------------------|------------------------------|
| `measured_swimming_water_temperature`  | Precise sensor °C (e.g. 20.88)   | Primary temperature          |
| `swimming_water_temperature`           | Category string (e.g. "15-17°C") | Fallback when no measured °C |
| `swimming_water_cyanobacteria`         | Blue-green algae level 0–3 + label | Algae status               |

### Algae normalization

The API returns a numeric `value` (0–3) and a ready Finnish `name` label. We
pass the label through verbatim and add a normalized key for the template:

| value | normalized | typical label (`name.fi`)        |
|-------|------------|----------------------------------|
| 0     | `none`     | Ei havaittua sinilevää           |
| 1     | `little`   | Vähän sinilevää                  |
| 2     | `lots`     | Runsaasti sinilevää              |
| 3     | `much`     | Erittäin runsaasti sinilevää     |
| —     | `unknown`  | (no observation)                 |

## Worker logic (`worker.js`)

1. Make the single upstream request above.
2. For each unit, read the three observations.
3. **Staleness filter:** ignore any reading whose timestamp is older than
   `MAX_AGE_DAYS` (14). This drops genuinely stale values (one beach's only temp
   is from 2023) and also gives correct off-season behaviour — in winter every
   reading ages out, so the worker returns an empty list and the display shows an
   "off-season / no data" state.
4. **Filter:** after staleness, drop beaches with no usable data (no fresh temp
   *and* no fresh algae — e.g. "Cafe Kobben", saunas).
5. Temperature: prefer fresh `measured_swimming_water_temperature` rounded to one
   decimal (`tempExact: true`); else fall back to the fresh
   `swimming_water_temperature` category range (`tempExact: false`); else `null`.
   A numeric sort key `tempC` is also produced (measured value, or the midpoint of
   the category range).
6. Algae: normalize value → key, keep the Finnish label and the observation time.
7. **Sort warmest first** by `tempC` desc; beaches without a numeric temp sort
   last (alphabetically).
8. Return JSON. Preserve the existing `jsonResponse`, `CORS_HEADERS`, and
   `router.get(...)` patterns. Replace endpoint `/api/menu` → `/api/beaches`.
9. On upstream failure return `502 { error }` (same as today).

### Response shape

```json
{
  "updated": "2026-06-22T08:30:00.000Z",
  "beaches": [
    {
      "name": "Rastilan uimaranta",
      "municipality": "Helsinki",
      "temp": "20.9°C",
      "tempC": 20.9,
      "tempExact": true,
      "tempTime": "2026-06-22T08:58:10+03:00",
      "algae": "none",
      "algaeLabel": "Ei havaittua sinilevää",
      "algaeTime": "2026-06-21T09:55:44+03:00"
    }
  ]
}
```

- `temp` is a display-ready string (`"20.9°C"` for a measured reading, `"19-21°C"`
  for a category range) or `null`.
- `tempC` is the numeric sort key (measured value or category midpoint) or `null`.
- `tempExact` is `true` for a precise sensor reading, `false` for a category range.
- `algae` ∈ `none | little | lots | much | unknown`; `algaeLabel` is the API's
  Finnish wording (or `null`).
- `tempTime` / `algaeTime` may be `null` when the corresponding reading is absent.

## TRMNL plugin (`TRMNL plugin.html`)

Replace the meal loop with a compact list/table of beaches:

- Per row: beach name (+ city), temperature (`{{ beach.temp }}`), and an algae
  indicator. Because the e-ink panel is 1-bit (no color), the indicator is
  text/symbol-based: `✓` (or blank) for `none`, `⚠` + label for any algae level.
- Title bar: "Uimarannat" + the `updated` timestamp.
- Empty state when `beaches` is empty ("Ei uintitietoja saatavilla").
- ~30 rows must fit a TRMNL 800×480 panel, so a **two-column** layout is used.

## README

Update `README.md` to reflect the new source: data-flow diagram, endpoint name
(`/api/beaches`), sample response, file descriptions, and the technologies list
(Service Map API instead of Aromi).

## Error handling

- Upstream non-2xx or fetch failure → `502 { error: <message> }`.
- A beach missing an observation → that field is `null` / excluded, beach still
  shown if it has any other usable data.

## Decisions / assumptions

- **Sort:** warmest first.
- **Scope of files changed:** worker + plugin + README (all three needed for the
  display to work end-to-end).
- **Geography:** Helsinki + Espoo + Vantaa (`municipality=helsinki,espoo,vantaa`),
  per user request to include the wider metro area.

## Out of scope (YAGNI)

- Kirkkonummi / Siuntio beaches (also under service 731).
- The `notice` observation (e.g. temporary swimming restrictions) — useful, but
  beyond the agreed temperature + algae scope. Easy to add later.
- Temperature history or trends.
- The separate Forum Virium UiRaS GeoJSON feed (Service Map covers temperature).
- Caching / rate-limit handling (single low-frequency call per TRMNL poll).
