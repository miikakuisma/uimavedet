// Sovelluksen muuttuva tila ja suosikkien talletus.
import { FAV_KEY } from "./config.js";

export const state = {beaches:[], city:"all", hideAlgae:false, search:"", loading:true};

let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch (e) {}

export function isFav(b){ return favs.has(b.name); }

// Suosikkien nimet talletusjärjestyksessä – latausnäkymä piirtää näiden
// pohjalta suosikkikortit jo ennen kuin rantadata on haettu.
export function favNames(){ return [...favs]; }

// Vaihtaa suosikkitilan ja tallettaa localStorageen. Ei aja uudelleenpiirtoa –
// kutsuja (render.js:n klikkikäsittelijä) hoitaa animaation ja render():n.
export function toggleFavorite(name){
  if(favs.has(name)) favs.delete(name); else favs.add(name);
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch(e){}
}
