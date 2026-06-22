
// Helsingin seudun (Helsinki, Espoo, Vantaa) uimarantojen veden lämpötila ja
// sinilevätilanne. Data: Helsingin kaupungin Palvelukartta-API (Service Map),
// sama lähde jota ulkoliikunta.fi käyttää.

const API_URL = "https://api.hel.fi/servicemap/v2/unit/";
const BEACH_SERVICES = "730,731"; // 730 = uimapaikat, 731 = uimarannat
const MUNICIPALITIES = "helsinki,espoo,vantaa";

// Älä näytä havaintoja jotka ovat tätä vanhempia. Karsii vanhentuneet lukemat
// (yhden rannan ainoa lämpötila on vuodelta 2023) ja hoitaa kauden ulkopuolen:
// talvella kaikki havainnot vanhenevat ja lista jää tyhjäksi.
const MAX_AGE_DAYS = 14;

// Sinileväasteikko (swimming_water_cyanobacteria) -> normalisoitu avain.
const ALGAE_LEVELS = { "0": "none", "1": "little", "2": "lots", "3": "much" };

// Järjestysarvo: levätön ensin, sitten "ei tietoa", sitten kasvava levämäärä.
const ALGAE_RANK = { none: 0, unknown: 1, little: 2, lots: 3, much: 4 };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

function getObservation(unit, property) {
  const list = Array.isArray(unit.observations) ? unit.observations : [];
  return list.find((o) => o.property === property) || null;
}

function isFresh(time, now) {
  if (!time) return false;
  const t = new Date(time).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function normalizeAlgae(value) {
  return ALGAE_LEVELS[String(value)] || "unknown";
}

// "19-21" -> 20, "0-15" -> 7.5. Käytetään vain lämpimimmästä-järjestämiseen
// kun tarkkaa mittausta ei ole.
function categoryMidpoint(value) {
  const m = String(value).match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function roundTemp(n) {
  return Math.round(n * 10) / 10;
}

function capitalize(s) {
  return typeof s === "string" && s ? s[0].toUpperCase() + s.slice(1) : null;
}

function transformBeach(unit, now) {
  const name = (unit.name && (unit.name.fi || unit.name.en)) || "Uimaranta";
  const municipality = capitalize(unit.municipality);

  // Sijainti karttaa ja reittiopas-linkkiä varten. Service Map antaa GeoJSON
  // Pointin jossa koordinaatit ovat järjestyksessä [lon, lat].
  const coords = unit.location && Array.isArray(unit.location.coordinates) ? unit.location.coordinates : null;
  const lat = coords ? coords[1] : null;
  const lon = coords ? coords[0] : null;

  // Kuvaus (sisältää usein saapumis-/joukkoliikenneohjeet). Suomeksi, varalla en.
  const description = (unit.description && (unit.description.fi || unit.description.en)) || null;

  // Lämpötila: ensisijaisesti tarkka anturilukema, muuten kategoria-arvio.
  let temp = null;
  let tempC = null;
  let tempExact = false;
  let tempTime = null;

  const measured = getObservation(unit, "measured_swimming_water_temperature");
  const category = getObservation(unit, "swimming_water_temperature");

  if (measured && typeof measured.value === "number" && isFresh(measured.time, now)) {
    tempC = roundTemp(measured.value);
    temp = `${tempC}°C`;
    tempExact = true;
    tempTime = measured.time;
  } else if (category && category.value && isFresh(category.time, now)) {
    temp = `${category.value}°C`; // value esim. "19-21"
    tempC = categoryMidpoint(category.value);
    tempExact = false;
    tempTime = category.time;
  }

  // Sinilevä.
  let algae = "unknown";
  let algaeLabel = null;
  let algaeTime = null;

  const cyano = getObservation(unit, "swimming_water_cyanobacteria");
  if (cyano && isFresh(cyano.time, now)) {
    algae = normalizeAlgae(cyano.value);
    algaeLabel = (cyano.name && cyano.name.fi) || null;
    algaeTime = cyano.time;
  }

  return {
    name,
    municipality,
    lat,
    lon,
    description,
    temp,
    tempC,
    tempExact,
    tempTime,
    algae,
    algaeRank: ALGAE_RANK[algae],
    algaeLabel,
    algaeTime,
  };
}

function transformBeaches(apiData, now = new Date()) {
  const results = apiData && Array.isArray(apiData.results) ? apiData.results : [];

  const beaches = results
    .map((unit) => transformBeach(unit, now))
    // Pudota rannat joista ei ole tuoretta tietoa lainkaan.
    .filter((b) => b.temp !== null || b.algae !== "unknown");

  // Levättömät ensin; saman levätason sisällä lämpimin ensin; rannat ilman
  // lämpötilaa loppuun aakkosjärjestyksessä.
  beaches.sort((a, b) => {
    if (a.algaeRank !== b.algaeRank) return a.algaeRank - b.algaeRank;
    if (a.tempC === null && b.tempC === null) return a.name.localeCompare(b.name, "fi");
    if (a.tempC === null) return 1;
    if (b.tempC === null) return -1;
    return b.tempC - a.tempC;
  });

  return { updated: now.toISOString(), updatedText: helsinkiText(now), beaches };
}

// Valmiiksi muotoiltu Helsingin aika näyttöä varten. Uimakausi (kesä-elokuu) on
// aina EEST eli UTC+3, joten kiinteä siirtymä riittää.
function helsinkiText(now) {
  const t = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${t.getUTCDate()}.${t.getUTCMonth() + 1}. klo ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

async function fetchBeaches() {
  const url =
    `${API_URL}?service=${BEACH_SERVICES}&municipality=${MUNICIPALITIES}` +
    `&include=observations&page_size=400&only=name,municipality,location,description,observations&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Service Map API returned ${response.status}`);
  }

  return response.json();
}

router.get("/api/beaches", async () => {
  try {
    const apiData = await fetchBeaches();
    return jsonResponse(transformBeaches(apiData));
  } catch (err) {
    return jsonResponse({ error: err.message }, 502);
  }
});
