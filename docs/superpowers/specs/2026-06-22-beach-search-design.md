# Beach search — design

**Date:** 2026-06-22
**Goal:** Add a search affordance to the mobile site (post-Vite structure) plus
a sticky-behaviour tweak.

## Decisions (confirmed)

- **Match against:** beach name **and** municipality (case-insensitive substring).
- **Exit:** a `×` button inside the field — clears the query *and* closes search,
  restoring the city buttons. `Esc` does the same. Deleting all text manually
  keeps the field open and returns the normal list.
- **Algae toggle:** still applies during search (global filter).

## Behaviour

1. **Search button** — a magnifier icon appended inside `.seg` (`#cities`) after
   Vantaa, `flex:none` (~42px) so the four city buttons keep their width.
2. **Open** — tapping it hides `.seg`, shows `.searchbar` (magnifier glyph +
   `<input>` "Hae rantaa…" + `×`), focuses the input. The searchbar lives in the
   same sticky `.controls` row, so it stays pinned while results scroll.
3. **Filter** — `state.search` holds the query.
   - **Empty** → current behaviour exactly (city filter + algae toggle +
     Suosikit section).
   - **Non-empty** → flat list, **no** Suosikit section; matches name OR
     municipality; **ignores** the city filter (global search); still honours the
     hide-algae toggle; sorted by `compareBase` (algae rank → temp → name, no
     favourites-float). Cards still show their ★. Empty result → "Ei
     hakutuloksia" state.
4. **Close (`×`/`Esc`)** — clears the input, `state.search=""`, hides
   `.searchbar`, re-shows `.seg`; the previously selected city is preserved.

## Sticky change

Split the controls: `.controls` stays sticky but holds only the
segment/searchbar row. The `.toggle` (hide-algae switch + count) moves into a
new non-sticky `.subbar` inside `.wrap`, below the sticky row, aligned to the
card column — so it scrolls away and slides under the stuck pill.

## Code touchpoints (modular vanilla JS)

- **index.html** — add search button + `.searchbar` inside `.seg`'s
  `.controls-inner`; move the toggle into `<div class="subbar" id="subbar">`
  inside `.wrap`.
- **src/state.js** — add `search:""` to `state`.
- **src/beaches.js** — extract `compareBase` from `compare`; add `passesAlgae`
  and `matchesQuery`; `visible` reuses `passesAlgae`.
- **src/render.js** — branch `render()` on `state.search`; export `$subbar`;
  import `escapeHTML` for the empty-search state.
- **src/api.js** — toggle `$subbar.hidden` alongside `$controls` in load/error/
  off-season.
- **src/search.js** (new) — `initSearch()`: open/close + input/Esc handlers.
- **src/main.js** — `initSearch()`; guard the city-click handler to ignore the
  search button (no `data-city`).
- **src/style.css** — `.seg-search`, `.searchbar`, `.subbar` styles;
  `.seg[hidden],.searchbar[hidden]{display:none}` (needed because both are
  `display:flex`, which overrides the bare `[hidden]` attribute); drop the
  toggle's `margin-top`.

## Verification

`npm run build` succeeds; in the browser: open search, type a name and a city
(e.g. "espoo"), confirm flat filtered list with no Suosikit and algae toggle
still working; empty input returns the normal view; `×`/`Esc` restore the city
buttons; only the search/segment row stays sticky on scroll.
