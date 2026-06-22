# Vite conversion — design

**Date:** 2026-06-22
**Goal:** Convert the single-file mobile site (`index.html`) into a Vite project
with a modular vanilla-JS source tree. **Pure refactor — no behavior change.**

## Scope

- **In scope:** `index.html` only — its inline `<style>` and `<script>` move into
  a Vite `src/` tree; the markup shell stays.
- **Untouched:** `worker.js` (separate Puter Worker backend) and
  `TRMNL plugin.html` (Liquid template pasted into TRMNL). Neither is part of a
  frontend build.
- **Decisions:** plain JS (no TypeScript), modular split, Vite setup only (no
  deploy automation).
- The previously-designed **search feature is deferred** — built on this
  structure after the conversion lands and is verified.

## Target structure

```
meri/
├─ index.html          Vite entry: <head> + body markup, no inline style/script,
│                       ends with <script type="module" src="/src/main.js">
├─ package.json        vite devDep; scripts dev / build / preview; "type":"module"
├─ vite.config.js      minimal; base:'./' so dist/ is host-portable
├─ .gitignore          node_modules/, dist/, .DS_Store
├─ src/
│  ├─ main.js          entry: import style.css; wire city seg + algae toggle +
│  │                   scroll; initSheet(); load()
│  ├─ config.js        WORKER_URL, FAV_KEY, RANK, ALGAE_LABEL
│  ├─ format.js        escapeHTML, escapeAttr, splitTemp (pure, no DOM/state)
│  ├─ state.js         state object; favorites (favs Set, isFav, toggleFavorite,
│  │                   localStorage persistence)
│  ├─ beaches.js       rankOf, compare, visible (data logic)
│  ├─ card.js          cardHTML
│  ├─ sheet.js         detail sheet: url builders, openSheet, closeSheet,
│  │                   initSheet() (refs + listeners)
│  ├─ render.js        render(); onScroll; shared refs ($list/$count/$updated/
│  │                   $controls/$footer); list click + keydown listeners
│  ├─ api.js           load() fetch; showLoading/showError/showOffSeason
│  └─ style.css        all current CSS, verbatim
├─ worker.js           untouched
└─ TRMNL plugin.html   untouched
```

## Import graph (acyclic)

```
config  ← state, beaches, card, sheet, api
format  ← state(no), card, sheet, api
state   ← beaches, card, sheet, render, api, main
beaches ← render
card    ← render
sheet   ← render(openSheet), main(initSheet)
render  ← api(render, onScroll, refs), main(render, onScroll)
api     ← main(load)
```

**Cycle avoidance:**
- `toggleFav` today both mutates favorites *and* re-renders. Split it:
  `state.toggleFavorite(name)` mutates + persists only; the fav-click handler in
  `render.js` does the star-pop animation and `setTimeout(render, 180)`. Keeps
  `state.js` from importing `render.js`.
- `onScroll` lives in `render.js` (owns `$controls`) and is imported by both
  `api.js` (called after a successful load) and `main.js` (scroll listener), so
  nothing needs to import the `main.js` entry.
- The retry button's handler references `load` locally within `api.js`.

ES module scripts are deferred, so top-level `getElementById` in `render.js`
runs after the DOM is parsed.

## Config files

- **package.json:** `private:true`, `type:"module"`, scripts `dev`/`build`/
  `preview`. Vite pinned to the actual latest via `npm install -D vite` (not a
  guessed version).
- **vite.config.js:** `export default defineConfig({ base: './' })`.
- **.gitignore:** `node_modules/`, `dist/`, `.DS_Store`.

## Deployment change

Was: upload `index.html` to Puter static hosting. Now: `npm install` once, then
`npm run build` → upload `dist/`. `WORKER_URL` stays a constant in
`src/config.js`. README "Mobiilisivu" section updated to match.

## Verification

1. `npm run build` succeeds and emits `dist/`.
2. `npm run dev` serves; load in browser and confirm parity with the current
   site (hits the live worker; summer data available 2026-06-22): list renders,
   city filter, algae toggle, favorites + star-pop, detail sheet open/scroll/
   close, sticky-on-scroll shadow.
