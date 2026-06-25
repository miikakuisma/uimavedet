// Sovelluksen sisääntulo: tyylit, ohjainten kuuntelijat, sheetin alustus, lataus.
import "./style.css";
import { state } from "./state.js";
import { render, onScroll } from "./render.js";
import { initSheet } from "./sheet.js";
import { initSearch } from "./search.js";
import { load } from "./api.js";
import { inject } from "@vercel/analytics"

document.getElementById("cities").addEventListener("click", e => {
  if(state.loading) return; // suodattimet näkyvät mutta eivät toimi ennen dataa
  const btn = e.target.closest("button"); if(!btn) return;
  if(!btn.dataset.city) return; // ohita hakupainike (ei data-city:tä)
  state.city = btn.dataset.city;
  e.currentTarget.querySelectorAll("button[data-city]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
  render();
});

document.getElementById("hideAlgae").addEventListener("change", e => {
  if(state.loading){ e.target.checked = state.hideAlgae; return; } // pidä kytkin synkassa
  state.hideAlgae = e.target.checked; render();
});

window.addEventListener("scroll", onScroll, {passive:true});

inject()
initSheet();
initSearch();
load();
