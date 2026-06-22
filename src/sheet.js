// Rannan tietopaneeli (alhaalta nouseva sheet): kartta, tila, kuvaus, reittiopas.
import { ALGAE_LABEL } from "./config.js";
import { splitTemp, escapeAttr, escapeHTML } from "./format.js";
import { state } from "./state.js";

let $sheet, $backdrop, $sheetName, $sheetCity, $sheetBody, $sheetMap, $sheetStatus, $sheetDesc, $sheetRoute, $sheetClose;
let sheetReturnFocus = null;
let sheetHideTimer = null;

function reittiopasURL(b){
  // Digitransit-muoto: /reitti/<lähtö>/<määränpää>, paikka = "Nimi::lat,lon".
  // POS = "Oma sijainti" → reitti lasketaan käyttäjän paikannuksesta rannalle.
  return "https://reittiopas.hsl.fi/reitti/POS/" + encodeURIComponent(`${b.name}::${b.lat},${b.lon}`);
}
function osmEmbedURL(b){
  const d = 0.004; // pieni laatikko pisteen ympärille
  const bbox = [b.lon - d, b.lat - d, b.lon + d, b.lat + d].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${b.lat},${b.lon}`;
}

export function openSheet(name, card){
  const b = state.beaches.find(x => x.name === name);
  if(!b) return;
  clearTimeout(sheetHideTimer);
  sheetReturnFocus = card || document.activeElement;

  $sheetName.textContent = b.name;
  $sheetCity.textContent = b.municipality || "";

  // Lämpötila + levä (sama logiikka kuin kortissa).
  const aKey = b.algae || "unknown";
  const t = splitTemp(b.temp);
  const tempHTML = t
    ? `<div class="sheet-temp">${escapeHTML(t.val)}<span class="unit">${escapeHTML(t.unit)}</span>${b.tempExact ? "" : `<span class="approx">arvio</span>`}</div>`
    : "";
  const algaeHTML = `<span class="sheet-algae a-${aKey}"><span class="d"></span>${ALGAE_LABEL[aKey] || ALGAE_LABEL.unknown}</span>`;
  $sheetStatus.innerHTML = tempHTML + algaeHTML;

  // Kuvaus.
  $sheetDesc.textContent = b.description || "";
  $sheetDesc.hidden = !b.description;

  // Kartta + reittiopas (pinned footer) vain jos koordinaatit ovat tiedossa.
  if(b.lat != null && b.lon != null){
    $sheetMap.innerHTML = `<iframe loading="lazy" title="Kartta: ${escapeAttr(b.name)}" src="${osmEmbedURL(b)}"></iframe>`;
    $sheetMap.hidden = false;
    $sheetRoute.href = reittiopasURL(b);
    $sheet.classList.remove("no-foot");
  } else {
    $sheetMap.innerHTML = "";
    $sheetMap.hidden = true;
    $sheetRoute.removeAttribute("href");
    $sheet.classList.add("no-foot");
  }

  $backdrop.hidden = false;
  $sheet.hidden = false;
  $sheetBody.scrollTop = 0;
  requestAnimationFrame(() => { $backdrop.classList.add("show"); $sheet.classList.add("show"); });
  document.body.style.overflow = "hidden";
  $sheetClose.focus();
  document.addEventListener("keydown", onSheetKey);
}

function closeSheet(){
  $backdrop.classList.remove("show");
  $sheet.classList.remove("show");
  document.removeEventListener("keydown", onSheetKey);
  document.body.style.overflow = "";
  sheetHideTimer = setTimeout(() => {
    $backdrop.hidden = true;
    $sheet.hidden = true;
    $sheetMap.innerHTML = ""; // pysäytä kartan iframe-lataus
  }, 320);
  if(sheetReturnFocus && sheetReturnFocus.focus) sheetReturnFocus.focus();
}

function onSheetKey(e){ if(e.key === "Escape") closeSheet(); }

export function initSheet(){
  $sheet = document.getElementById("sheet");
  $backdrop = document.getElementById("sheetBackdrop");
  $sheetName = document.getElementById("sheetName");
  $sheetCity = document.getElementById("sheetCity");
  $sheetBody = document.getElementById("sheetBody");
  $sheetMap = document.getElementById("sheetMap");
  $sheetStatus = document.getElementById("sheetStatus");
  $sheetDesc = document.getElementById("sheetDesc");
  $sheetRoute = document.getElementById("sheetRoute");
  $sheetClose = document.getElementById("sheetClose");

  $sheetClose.addEventListener("click", closeSheet);
  $backdrop.addEventListener("click", closeSheet);
}
