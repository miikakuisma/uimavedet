// Puhtaat muotoiluapurit – ei DOM- tai tilakytköksiä.

export function escapeHTML(s){ return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
export function escapeAttr(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

export function splitTemp(t){
  if(!t) return null;
  const s = String(t);
  const i = s.indexOf("°");
  if(i < 0) return {val:s, unit:""};
  return {val:s.slice(0,i), unit:s.slice(i)};
}
