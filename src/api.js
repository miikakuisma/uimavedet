// Datan haku workerilta sekä lataus-, virhe- ja kauden-ulkopuoli-näkymät.
import { WORKER_URL } from "./config.js";
import { state } from "./state.js";
import { escapeHTML } from "./format.js";
import { render, onScroll, $list, $updated, $controls, $footer } from "./render.js";

export function showLoading(){
  let sk = "";
  for(let i=0;i<6;i++) sk += `<article class="beach" style="opacity:1;transform:none"><div style="width:38px"></div><div class="bmain"><div class="sk" style="width:55%"></div><div class="sk" style="width:32%;margin-top:8px"></div></div><div class="sk" style="width:54px;height:26px"></div></article>`;
  $list.className = "skeleton"; $list.innerHTML = sk;
  $updated.innerHTML = "Ladataan uimavesitietoja…";
}

export function showError(){
  $list.className = ""; $controls.hidden = true; $footer.hidden = true;
  $list.innerHTML = `<div class="state">
    <svg class="wave" viewBox="0 0 128 14" fill="none"><path d="M1 7c10.5-8 21-8 31.5 0S53.5 15 64 7s21-8 31.5 0 21 8 31.5 0" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    <h2>Tietojen haku ei onnistunut</h2><p>Yhteys uimavesipalveluun katkesi. Tarkista verkkoyhteys ja yritä uudelleen.</p>
    <button class="retry" id="retry">Yritä uudelleen</button></div>`;
  document.getElementById("retry").addEventListener("click", load);
}

export function showOffSeason(updatedText){
  $list.className = ""; $controls.hidden = true;
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
    $list.className = "";
    $controls.hidden = false; $footer.hidden = false;
    $updated.innerHTML = `<span class="dot-live"></span>Päivitetty ${escapeHTML(data.updatedText || "")}`;
    render(); onScroll();
  }catch(err){
    console.error(err); showError();
  }
}
