// Rantadatan logiikka: järjestys ja näkyvyys nykyisillä suodattimilla.
import { RANK } from "./config.js";
import { state, isFav } from "./state.js";

export function rankOf(b){ return typeof b.algaeRank === "number" ? b.algaeRank : (RANK[b.algae] ?? 1); }

export function compare(a,b){
  const fa = isFav(a)?0:1, fb = isFav(b)?0:1;
  if(fa !== fb) return fa - fb;
  const ra = rankOf(a), rb = rankOf(b);
  if(ra !== rb) return ra - rb;
  const ta = a.tempC, tb = b.tempC;
  if(ta == null && tb == null) return a.name.localeCompare(b.name, "fi");
  if(ta == null) return 1;
  if(tb == null) return -1;
  return tb - ta;
}

export function visible(b){
  if(state.city !== "all" && b.municipality !== state.city) return false;
  if(state.hideAlgae && rankOf(b) >= 2) return false;
  return true;
}
