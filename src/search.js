// Haku: vaihtaa kaupunkipainikkeet hakukentäksi ja suodattaa listaa kirjoitettaessa.
import { state } from "./state.js";
import { render } from "./render.js";

let $seg, $searchbar, $searchInput, $searchClear, $searchBtn;

function openSearch(){
  if(state.loading) return; // haku availutuu vasta kun rannat on ladattu
  $seg.hidden = true;
  $searchbar.hidden = false;
  $searchBtn.setAttribute("aria-expanded", "true");
  $searchInput.focus();
}

// × / Esc: tyhjentää hakusanan JA sulkee haun → kaupunkipainikkeet takaisin.
function closeSearch(){
  $searchInput.value = "";
  state.search = "";
  $searchbar.hidden = true;
  $seg.hidden = false;
  $searchBtn.setAttribute("aria-expanded", "false");
  render();
}

export function initSearch(){
  $seg = document.getElementById("cities");
  $searchbar = document.getElementById("searchbar");
  $searchInput = document.getElementById("searchInput");
  $searchClear = document.getElementById("searchClear");
  $searchBtn = document.getElementById("searchBtn");

  $searchBtn.addEventListener("click", openSearch);
  $searchClear.addEventListener("click", closeSearch);
  $searchInput.addEventListener("input", () => {
    state.search = $searchInput.value;
    render();
  });
  $searchInput.addEventListener("keydown", e => {
    if(e.key === "Escape"){ e.preventDefault(); closeSearch(); }
  });
}
