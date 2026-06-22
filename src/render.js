// Listan piirto, sticky-varjo ja kortteihin liittyvät tapahtumakuuntelijat.
import { state, isFav, toggleFavorite } from "./state.js";
import { visible, compare, compareBase, passesAlgae, matchesQuery } from "./beaches.js";
import { cardHTML } from "./card.js";
import { openSheet } from "./sheet.js";
import { escapeHTML } from "./format.js";

// Jaetut DOM-viitteet (myös api.js käyttää näitä tilanäkymiin).
export const $list = document.getElementById("list");
export const $updated = document.getElementById("updated");
export const $controls = document.getElementById("controls");
export const $subbar = document.getElementById("subbar");
export const $footer = document.getElementById("footer");
const $count = document.getElementById("count");

export function render(){
  const q = state.search.trim().toLowerCase();
  const searching = q.length > 0;

  // Haussa: tasalista, ei suosikkiosiota, kaupunkisuodatin ohitetaan, mutta
  // leväsuodatin jää voimaan. Muuten normaali näkymä.
  const shown = searching
    ? state.beaches.filter(b => passesAlgae(b) && matchesQuery(b, q)).sort(compareBase)
    : state.beaches.filter(visible).sort(compare);

  $count.textContent = shown.length + (shown.length === 1 ? " ranta" : " rantaa");

  if(shown.length === 0){
    $list.innerHTML = searching
      ? `<div class="state"><h2>Ei hakutuloksia</h2><p>Haulla ”${escapeHTML(state.search.trim())}” ei löytynyt rantoja. Kokeile toista hakusanaa.</p></div>`
      : `<div class="state"><h2>Ei näytettäviä rantoja</h2><p>Kokeile vaihtaa kaupunkia tai näyttää myös leväiset rannat.</p></div>`;
    return;
  }

  let html = "", i = 0;
  if(!searching){
    const favList = shown.filter(isFav);
    const rest = shown.filter(b => !isFav(b));
    if(favList.length){
      html += `<div class="sec"><span class="star">★</span> Suosikit</div>`;
      favList.forEach(b => { html += cardHTML(b, i++); });
      html += `<div class="sec">Kaikki rannat</div>`;
    }
    rest.forEach(b => { html += cardHTML(b, i++); });
  } else {
    shown.forEach(b => { html += cardHTML(b, i++); });
  }
  $list.innerHTML = html;
}

// sticky-varjo vieritettäessä
export const onScroll = () => $controls.classList.toggle("stuck", window.scrollY > 130);

$list.addEventListener("click", e => {
  const fav = e.target.closest(".fav");
  if(fav){
    toggleFavorite(fav.dataset.name);
    // pop the just-tapped star, then re-render (which re-pins)
    fav.classList.add("pop");
    setTimeout(render, 180);
    return;
  }
  const card = e.target.closest(".beach");
  if(card && card.dataset.name) openSheet(card.dataset.name, card);
});

// Keyboard activation for the card itself (role="button"). The fav button
// fires its own click on Enter/Space, so guard on e.target === card.
$list.addEventListener("keydown", e => {
  if(e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".beach");
  if(card && e.target === card){ e.preventDefault(); openSheet(card.dataset.name, card); }
});
