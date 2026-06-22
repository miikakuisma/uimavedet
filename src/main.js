// Sovelluksen sisääntulo: tyylit, ohjainten kuuntelijat, sheetin alustus, lataus.
import "./style.css";
import { state } from "./state.js";
import { render, onScroll } from "./render.js";
import { initSheet } from "./sheet.js";
import { load } from "./api.js";

document.getElementById("cities").addEventListener("click", e => {
  const btn = e.target.closest("button"); if(!btn) return;
  state.city = btn.dataset.city;
  [...e.currentTarget.children].forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
  render();
});

document.getElementById("hideAlgae").addEventListener("change", e => {
  state.hideAlgae = e.target.checked; render();
});

window.addEventListener("scroll", onScroll, {passive:true});

initSheet();
load();
