// Datan haku workerilta sekä lataus-, virhe- ja kauden-ulkopuoli-näkymät.
import { WORKER_URL } from "./config.js";
import { state, favNames } from "./state.js";
import { escapeHTML } from "./format.js";
import { render, onScroll, $list, $updated, $controls, $subbar, $footer } from "./render.js";

// Suosikkikortti latauksen aikana: oikea nimi näkyy heti, mutta kaupunki,
// levätilanne ja lämpötila ovat haamukuvina kunnes data on haettu.
const favSkeleton = name => `<article class="beach skfav">
    <span class="fav" aria-hidden="true">★</span>
    <div class="bmain">
      <div class="bname">${escapeHTML(name)}</div>
      <div class="bmeta"><div class="sk" style="width:46%"></div></div>
    </div>
    <div class="bdata"><span class="sk sk-temp"></span></div>
  </article>`;

// Geneerinen haamukortti "Kaikki rannat" -listaan.
const ghostSkeleton = () => `<article class="beach skghost">
    <span class="fav" aria-hidden="true">☆</span>
    <div class="bmain">
      <div class="sk" style="width:55%"></div>
      <div class="sk" style="width:32%;margin-top:8px"></div>
    </div>
    <div class="bdata"><span class="sk sk-temp"></span></div>
  </article>`;

export function showLoading(){
  state.loading = true;
  const favs = favNames();
  let html = "";
  if(favs.length){
    html += `<div class="sec"><span class="star">★</span> Suosikit</div>`;
    favs.forEach(name => { html += favSkeleton(name); });
    html += `<div class="sec">Kaikki rannat</div>`;
  }
  // suosikkien ollessa esillä riittää vähemmän haamuja näytön täyttämiseen
  const ghosts = favs.length ? 4 : 6;
  for(let i=0;i<ghosts;i++) html += ghostSkeleton();
  // näytä yläosa (suodattimet + leväkytkin) heti, vaikka data vielä latautuu
  $controls.hidden = false; $subbar.hidden = false;
  $list.className = "skeleton"; $list.innerHTML = html;
  $updated.innerHTML = "Ladataan uimavesitietoja…";
}

export function showError(){
  state.loading = false;
  $list.className = ""; $controls.hidden = true; $subbar.hidden = true; $footer.hidden = true;
  $list.innerHTML = `<div class="state">
    <svg class="wave" viewBox="0 0 128 14" fill="none"><path d="M1 7c10.5-8 21-8 31.5 0S53.5 15 64 7s21-8 31.5 0 21 8 31.5 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    <h2>Tietojen haku ei onnistunut</h2><p>Yhteys uimavesipalveluun katkesi. Tarkista verkkoyhteys ja yritä uudelleen.</p>
    <button class="retry" id="retry">Yritä uudelleen</button></div>`;
  document.getElementById("retry").addEventListener("click", load);
}

export function showOffSeason(updatedText){
  state.loading = false;
  $list.className = ""; $controls.hidden = true; $subbar.hidden = true;
  $list.innerHTML = `<div class="state">
    <svg class="wave" viewBox="0 0 128 14" fill="none"><path d="M1 7c10.5-8 21-8 31.5 0S53.5 15 64 7s21-8 31.5 0 21 8 31.5 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    <h2>Uimakausi ei ole käynnissä</h2><p>Reaaliaikaisia uimavesihavaintoja näytetään kesäkaudella. Pulahdetaan taas silloin!</p></div>`;
  $updated.innerHTML = updatedText ? "Päivitetty " + updatedText : "&nbsp;";
}

export async function load(){
  showLoading();
  try{
    const res = await fetch(WORKER_URL, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    const beaches = Array.isArray(data.beaches) ? data.beaches : [];
    if(beaches.length === 0){ showOffSeason(data.updatedText); return; }
    state.beaches = beaches;
    state.loading = false;
    $list.className = "";
    $controls.hidden = false; $subbar.hidden = false; $footer.hidden = false;
    $updated.innerHTML = `<span class="dot-live"></span>Päivitetty ${escapeHTML(data.updatedText || "")}`;
    render(); onScroll();
  }catch(err){
    console.error(err); showError();
  }
}
