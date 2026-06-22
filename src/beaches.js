// Rantadatan logiikka: järjestys ja näkyvyys nykyisillä suodattimilla.
import { RANK } from "./config.js";
import { state, isFav } from "./state.js";

export function rankOf(b){ return typeof b.algaeRank === "number" ? b.algaeRank : (RANK[b.algae] ?? 1); }

// Järjestys ilman suosikkien nostoa: levä → lämpötila → nimi. Hakutulokset
// käyttävät tätä (neutraali järjestys), normaalilista lisää suosikit eteen.
export function compareBase(a,b){
  const ra = rankOf(a), rb = rankOf(b);
  if(ra !== rb) return ra - rb;
  const ta = a.tempC, tb = b.tempC;
  if(ta == null && tb == null) return a.name.localeCompare(b.name, "fi");
  if(ta == null) return 1;
  if(tb == null) return -1;
  return tb - ta;
}

export function compare(a,b){
  const fa = isFav(a)?0:1, fb = isFav(b)?0:1;
  if(fa !== fb) return fa - fb;
  return compareBase(a,b);
}

export function passesAlgae(b){
  return !(state.hideAlgae && rankOf(b) >= 2);
}

export function visible(b){
  if(state.city !== "all" && b.municipality !== state.city) return false;
  return passesAlgae(b);
}

// Hakuosuma: nimi TAI kaupunki sisältää hakusanan (pienaakkostettuna).
export function matchesQuery(b, q){
  if(!q) return true;
  return `${b.name || ""} ${b.municipality || ""}`.toLowerCase().includes(q);
}
