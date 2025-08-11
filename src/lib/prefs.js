export const PREF_KEYS = {
  THEME: "iwm_theme",
  TEMP_UNIT: "iwm_temp_unit",
  WIND_UNIT: "iwm_wind_unit",
  FAVS: "iwm_favs",
  NOTIF: "iwm_notif",
  LANG: "iwm:lang",      // <— baru
  HOUR24: "iwm:hour24",  // <— baru
    // <— tambahkan ini
};

export function loadPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function savePref(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
