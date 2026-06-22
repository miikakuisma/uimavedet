// Yhden rantakortin HTML.
import { ALGAE_LABEL } from "./config.js";
import { splitTemp, escapeAttr, escapeHTML } from "./format.js";
import { isFav } from "./state.js";

export function cardHTML(b, idx){
  const aKey = b.algae || "unknown";
  const label = ALGAE_LABEL[aKey] || "Ei levätietoa";
  const t = splitTemp(b.temp);
  const fav = isFav(b);
  let tempHTML, tempClass;
  if(!t){ tempHTML = "&ndash;"; tempClass = "none"; }
  else { tempClass = b.tempExact ? "" : "range"; tempHTML = `<span class="num">${t.val}</span><span class="unit">${t.unit}</span>`; }
  const approx = (t && !b.tempExact) ? `<span class="approx">arvio</span>` : "";
  return `<article class="beach a-${aKey}" style="--i:${idx}" data-name="${escapeAttr(b.name)}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${escapeAttr(b.name)} – näytä sijainti ja reittiopas">
    <button class="fav" data-name="${escapeAttr(b.name)}" aria-pressed="${fav}" aria-label="${fav?"Poista suosikeista":"Lisää suosikiksi"}: ${escapeAttr(b.name)}">${fav?"★":"☆"}</button>
    <div class="bmain">
      <div class="bname" title="${escapeAttr(b.name)}">${escapeHTML(b.name)}</div>
      <div class="bmeta"><span class="city">${escapeHTML(b.municipality||"")}</span><span class="balgae"><span class="d"></span>${label}</span></div>
    </div>
    <div class="bdata">${approx}<div class="btemp ${tempClass}">${tempHTML}</div></div>
  </article>`;
}
