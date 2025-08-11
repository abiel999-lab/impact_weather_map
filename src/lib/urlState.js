// Tiny encoder/decoder for URL query state
export function readState() {
  const p = new URLSearchParams(location.search);
  const num = (k, d) => (p.has(k) ? Number(p.get(k)) : d);
  return {
    route: p.get("r") || "dashboard",
    lat: num("lat", null),
    lon: num("lon", null),
    z: num("z", null),
    t: p.get("t") || null,  // C|F
    w: p.get("w") || null,  // mps|kmh
    radar: p.get("radar") === "1",
    wind: p.get("wind") === "1",
    embed: p.get("embed") === "1",
  };
}
export function writeState(next) {
  const p = new URLSearchParams(location.search);
  const set = (k, v) => (v == null ? p.delete(k) : p.set(k, String(v)));
  set("r", next.route);
  set("lat", next.lat?.toFixed?.(4));
  set("lon", next.lon?.toFixed?.(4));
  set("z", next.z);
  set("t", next.t);
  set("w", next.w);
  set("radar", next.radar ? 1 : null);
  set("wind", next.wind ? 1 : null);
  history.replaceState({}, "", `${location.pathname}?${p.toString()}`);
}
