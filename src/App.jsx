import { useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import SearchAutocomplete from "./components/SearchAutocomplete";
import AlertsPanel from "./components/AlertsPanel";
import ComparePage from "./components/ComparePage";
import AlertsPage from "./components/AlertsPage";
import SettingsPage from "./components/SettingsPage";
import MiniCard from "./components/MiniCard";
import { getWeather } from "./lib/openmeteo";
import { buildAlerts } from "./lib/alerts";
import { notify } from "./lib/notif";
import { PREF_KEYS, loadPref, savePref } from "./lib/prefs";
import { readState, writeState } from "./lib/urlState";
import ThermoTicker from "./components/ThermoTicker";

// ===== i18n strings (ID/EN) =====
const STR = {
  id: {
    app_title: "Impact Weather Map",
    dashboard: "Dashboard",
    compare: "Compare",
    alerts: "Alerts",
    settings: "Settings",
    favorites: "Favorites",
    use_my_location: "Gunakan lokasiku",
    loading: "Memuat...",
    map: "Peta",
    location_panel: "Lokasi",
    pick_pin: "Titikan peta",
    feels: "Terasa",
    sea_level: "Tekanan permukaan laut",
    temperature: "Suhu",
    humidity: "Kelembapan",
    wind: "Angin",
    pressure: "Tekanan",
    degree: "Derajat",
    wind_unit: "Satuan angin",
    theme: "Tema",
    language: "Bahasa",
    forecast7: "Prakiraan 7 hari",
    max: "Maks",
    min: "Min",
    rain: "Hujan",
    rain_today: "Hujan (hari ini)",
    wind_today: "Angin maks (hari ini)",
    t_max_today: "Suhu maks (hari ini)",
    t_min_today: "Suhu min (hari ini)",
    lat: "Lintang",
    lon: "Bujur",
    opacity: "Opasitas",
    search_placeholder: "Cari kota (mis. New York / Bandung)",
    share: "Bagikan",
    refresh: "Muat ulang",
    test_notif: "Tes Notifikasi",
    enable: "Aktifkan",
    hours: "jam",
    high_temp: "Suhu tinggi ≥",
    daily_summary_at: "Ringkasan harian pukul",
    no_alerts: "Tidak ada alert.",
    location_a: "Lokasi A",
    location_b: "Lokasi B",


  },
  en: {
    app_title: "Impact Weather Map",
    dashboard: "Dashboard",
    compare: "Compare",
    alerts: "Alerts",
    settings: "Settings",
    favorites: "Favorites",
    use_my_location: "Use my location",
    loading: "Loading...",
    map: "Map",
    location_panel: "Location",
    pick_pin: "Pick on map",
    feels: "Feels",
    sea_level: "Sea-level",
    temperature: "Temperature",
    humidity: "Humidity",
    wind: "Wind",
    pressure: "Pressure",
    degree: "Degree",
    wind_unit: "Wind unit",
    theme: "Theme",
    language: "Language",
    forecast7: "7-Day Forecast",
    max: "Max",
    min: "Min",
    rain: "Rain",
    rain_today: "Rain (today)",
    wind_today: "Max wind (today)",
    t_max_today: "Max temp (today)",
    t_min_today: "Min temp (today)",
    lat: "Lat",
    lon: "Lon",
    opacity: "Opacity",
    search_placeholder: "Search city (e.g. New York / Bandung)",
    share: "Share",
    refresh: "Refresh",
    test_notif: "Test Notification",
    enable: "Enable",
    hours: "hours",
    high_temp: "High temp ≥",
    daily_summary_at: "Daily summary at",
    no_alerts: "No alerts.",
    location_a: "Location A",
    location_b: "Location B",

  },
};

export default function App() {
  // ===== URL state (shareable) =====
  const init = readState();

  // routing sederhana
  const [route, setRoute] = useState(init.route || "dashboard"); // "dashboard" | "compare" | "alerts" | "settings"

  // prefs
  const [dark, setDark] = useState(loadPref(PREF_KEYS.THEME, false));
  const [unitT, setUnitT] = useState(loadPref(PREF_KEYS.TEMP_UNIT, init.t || "C"));
  const [unitW, setUnitW] = useState(loadPref(PREF_KEYS.WIND_UNIT, init.w || "mps"));
  const [favs, setFavs] = useState(loadPref(PREF_KEYS.FAVS, []));

  // language
  const [lang, setLang] = useState(localStorage.getItem("iwm:lang") || "id"); // 'id' | 'en'
  const locale = lang === "id" ? "id-ID" : "en-US";
  const t = (k) => STR[lang][k] || k;
  const dtFmt = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: lang === "en" };

  // notif prefs
  const [notifPref, setNotifPref] = useState(
    loadPref(PREF_KEYS.NOTIF, {
      enabled: false,
      rainLookaheadHours: 3,
      rainSoonMinMm: 0.2,
      highTempC: 35,
      lowTempC: 5,
      summaryTime: "07:00",
    })
  );

  // state dasar cuaca
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState(
    init.lat != null && init.lon != null ? [init.lat, init.lon] : [-6.2, 106.816]
  );
  const [zoom, setZoom] = useState(init.z ?? 6);
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hourIdx, setHourIdx] = useState(0);

  // overlays peta (khusus dashboard)
  const [radarOn, setRadarOn] = useState(!!init.radar);
  const [radarPlaying, setRadarPlaying] = useState(true);
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [radarFrames, setRadarFrames] = useState(0);
  const [radarIndex, setRadarIndex] = useState(0);
  const [windFlag, setWindFlag] = useState(!!init.wind);

  // alerts aktif lokasi saat ini (untuk badge + panel dashboard)
  const [alerts, setAlerts] = useState([]);

  // theme & persist
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    savePref(PREF_KEYS.THEME, dark);
  }, [dark]);
  useEffect(() => savePref(PREF_KEYS.TEMP_UNIT, unitT), [unitT]);
  useEffect(() => savePref(PREF_KEYS.WIND_UNIT, unitW), [unitW]);
  useEffect(() => savePref(PREF_KEYS.FAVS, favs), [favs]);
  useEffect(() => savePref(PREF_KEYS.NOTIF, notifPref), [notifPref]);
  useEffect(() => localStorage.setItem("iwm:lang", lang), [lang]);

  // sinkron ke URL tiap perubahan penting (share link)
  useEffect(() => {
    writeState({
      route,
      lat: center[0],
      lon: center[1],
      z: zoom,
      t: unitT,
      w: unitW,
      radar: radarOn,
      wind: windFlag,
    });
  }, [route, center, zoom, unitT, unitW, radarOn, windFlag]);

  // first load
  useEffect(() => {
    fetchWeather(center[0], center[1]);
    // eslint-disable-next-line
  }, []);

  // Guard: kalau belum ada favorit, jangan biarkan masuk ke halaman Alerts
  useEffect(() => {
    if (route === "alerts" && favs.length === 0) setRoute("dashboard");
  }, [route, favs.length]);

  // Keyboard shortcuts: "/" fokus pencarian; Esc blur
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        const typing = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
        if (typing) return; // jangan ganggu saat sedang mengetik
        e.preventDefault();
        setRoute("dashboard");
        setTimeout(() => document.getElementById("global-search")?.focus(), 0);
      } else if (e.key === "Escape") {
        document.activeElement?.blur?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function fetchWeather(lat, lon, nameOverride) {
    try {
      setLoading(true);
      setErr("");
      const data = await getWeather(lat, lon);
      setWx({ ...data, locationName: nameOverride || wx?.locationName || null });

      // nearest hour index
      const times = data.hourly?.time || [];
      if (times.length) {
        const now = Date.now();
        let idx = 0;
        for (let i = 0; i < times.length; i++) {
          const t = new Date(times[i]).getTime();
          if (t <= now) idx = i; else break;
        }
        setHourIdx(idx);
      }

      // rebuild alerts utk lokasi aktif
      setAlerts(buildAlerts(data, notifPref));
    } catch (e) {
      setErr(e.message || (lang === "id" ? "Gagal memuat cuaca" : "Failed to load weather"));
    } finally { setLoading(false); }
  }

  async function onPickPlace(item) {
    setQuery(item.display);
    setCenter([item.lat, item.lon]);
    await fetchWeather(item.lat, item.lon, item.display);
  }

  async function useMyLocation() {
    if (!navigator.geolocation) return setErr(lang === "id" ? "Geolokasi tidak didukung browser ini" : "Geolocation is not supported by this browser");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setCenter([lat, lon]);
        await fetchWeather(lat, lon, lang === "id" ? "Lokasi saya" : "My location");
      },
      () => setErr(lang === "id" ? "Gagal mengambil lokasi" : "Failed to get location"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // helpers
  const toF = (v) => Math.round(v * 9/5 + 32);
  const toKmh = (v) => Math.round(v * 3.6);

  const cur = useMemo(() => {
    if (!wx) return null;
    const c = wx.current || {};
    const tC = Math.round(c.temperature_2m ?? 0);
    const w = c.wind_speed_10m ?? 0;
    return {
      location: wx.locationName || "",
      temp: unitT === "C" ? tC : toF(tC),
      feels: unitT === "C" ? tC : toF(tC),
      humidity: c.relative_humidity_2m ?? 0,
      wind: unitW === "mps" ? Math.round(w) : toKmh(w),
      pressure: Math.round(c.pressure_msl ?? 0),
      tempUnit: unitT === "C" ? "°C" : "°F",
      windUnit: unitW === "mps" ? "m/s" : "km/h",
    };
  }, [wx, unitT, unitW]);

  const daily7 = useMemo(() => {
    if (!wx) return [];
    const d = wx.daily || {};
    const len = Math.min(7, d.time?.length || 0);
    const out = [];
    for (let i = 0; i < len; i++) {
      const date = new Date(d.time[i]);
      const maxC = Math.round(d.temperature_2m_max?.[i] ?? 0);
      const minC = Math.round(d.temperature_2m_min?.[i] ?? 0);
      const max = unitT === "C" ? maxC : toF(maxC);
      const min = unitT === "C" ? minC : toF(minC);
      out.push({ date, max, min, rain: d.precipitation_sum?.[i] ?? 0 });
    }
    return out;
  }, [wx, unitT]);

  const hourlyInfo = useMemo(() => {
    if (!wx) return null;
    const h = wx.hourly || {};
    const i = Math.max(0, Math.min(hourIdx, (h.time?.length || 1) - 1));
    const time = h.time ? new Date(h.time[i]) : new Date();
    const tC = Math.round(h.temperature_2m?.[i] ?? 0);
    const temp = unitT === "C" ? tC : toF(tC);
    const precip = h.precipitation?.[i] ?? 0;
    return { i, time, temp, precip };
  }, [wx, hourIdx, unitT]);

  // favorites toggle
  const inFav = useMemo(() => {
    if (!wx) return false;
    const lat = Number(center[0].toFixed(4));
    const lon = Number(center[1].toFixed(4));
    return favs.some(f => Math.abs(f.lat - lat) < 1e-4 && Math.abs(f.lon - lon) < 1e-4);
  }, [favs, center, wx]);

  function toggleFav() {
    const lat = Number(center[0].toFixed(4));
    const lon = Number(center[1].toFixed(4));
    const idx = favs.findIndex(f => Math.abs(f.lat - lat) < 1e-4 && Math.abs(f.lon - lon) < 1e-4);
    if (idx >= 0) setFavs(favs.filter((_, i) => i !== idx));
    else {
      const name = wx?.locationName || `${center[0].toFixed(2)}, ${center[1].toFixed(2)}`;
      setFavs([{ id: `${name}-${lat},${lon}`, name, lat, lon }, ...favs].slice(0, 20));
    }
  }

  // ---- Notifications loops ----
  useEffect(() => {
    if (!notifPref.enabled) return;
    const id = setInterval(async () => {
      for (const f of favs.slice(0, 5)) {
        const data = await getWeather(f.lat, f.lon);
        const als = buildAlerts(data, notifPref);
        const soon = als.find(a => a.type === "rain_soon");
        if (soon) notify(`Rain soon in ${f.name}`, soon.message);
        const hot = als.find(a => a.type === "hot");
        const cold = als.find(a => a.type === "cold");
        if (hot) notify(`Hot in ${f.name}`, hot.message);
        if (cold) notify(`Cold in ${f.name}`, cold.message);
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [notifPref.enabled, notifPref.rainLookaheadHours, notifPref.rainSoonMinMm, notifPref.highTempC, notifPref.lowTempC, favs]);

  useEffect(() => {
    if (!notifPref.enabled) return;
    const tick = async () => {
      const now = new Date();
      const [hh, mm] = (notifPref.summaryTime || "07:00").split(":").map(Number);
      if (now.getHours() === hh && now.getMinutes() === mm && now.getSeconds() < 5) {
        const base = favs[0] || { name: wx?.locationName || "Current", lat: center[0], lon: center[1] };
        const data = await getWeather(base.lat, base.lon);
        const d = data.daily || {};
        const max = Math.round(d.temperature_2m_max?.[0] || 0);
        const min = Math.round(d.temperature_2m_min?.[0] || 0);
        const rain = (d.precipitation_sum?.[0] || 0).toFixed(1);
        notify("Daily weather", `${base.name}: Max ${max}°C / Min ${min}°C / Rain ${rain} mm`);
      }
    };
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, [notifPref.enabled, notifPref.summaryTime, favs, center, wx]);

  // ===== Embed widget mode =====
  if (readState().embed) {
    return (
      <div className="p-3">
        <MiniCard name={wx?.locationName || (lang === 'id' ? 'Lokasi' : 'Location')} cur={cur} daily={daily7} />
      </div>
    );
  }

  // ==== RENDER ====
  return (
    <div className="min-h-dvh w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0">
        {/* Sidebar */}
        <aside className="flex flex-col shrink-0 p-4 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur z-10 md:sticky md:top-0 md:h-dvh">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="px-2 py-1 rounded-xl bg-[#ac94d8] text-white dark:bg-white dark:text-[#ac94d8]">{t('app_title')}</span>
          </div>

          <nav className="hidden md:flex flex-col gap-1 mt-4" aria-label="Primary">
            <SidebarLink label={t('dashboard')} active={route==="dashboard"} onClick={()=>setRoute("dashboard")} />
            <SidebarLink label={t('compare')}   active={route==="compare"}   onClick={()=>setRoute("compare")} />
            {favs.length>0 && (
              <SidebarLink label={t('alerts')}  active={route==="alerts"}    onClick={()=>setRoute("alerts")} badge={alerts.length} />
            )}
            <SidebarLink label={t('settings')}  active={route==="settings"}  onClick={()=>setRoute("settings")} />
          </nav>

          {/* Favorites */}
          <div className="mt-4">
            <div className="text-xs opacity-70 mb-1">{t('favorites')}</div>
            <div className="space-y-1">
              {favs.length === 0 && <div className="text-xs opacity-60">—</div>}
              {favs.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setCenter([f.lat, f.lon]); fetchWeather(f.lat, f.lon, f.name); setRoute("dashboard"); }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-[#ac94d8]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                  title={`${f.lat}, ${f.lon}`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto text-xs opacity-60">powered by Open-Meteo & OSM</div>
        </aside>

        {/* Main switcher */}
        <section className="min-w-0">
          <Topbar
            route={route}
            lang={lang} setLang={setLang}
            dark={dark} setDark={setDark}
            unitT={unitT} setUnitT={setUnitT}
            unitW={unitW} setUnitW={setUnitW}
            useMyLocation={useMyLocation}
            t={t}
            // extra toggles hanya di dashboard
            extraRight={route === "dashboard" ? (
              <div className="flex items-center gap-2">
                <ToggleMini label="Radar" value={radarOn} onChange={setRadarOn} />
                <ToggleMini label="Wind"  value={windFlag} onChange={setWindFlag} />
                <button
                  onClick={() => { navigator.clipboard.writeText(location.href); alert(lang==='id' ? 'Link disalin' : 'Link copied'); }}
                  className="px-3 py-1.5 rounded-xl border border-[#ac94d8] text-[#ac94d8] hover:bg-[#ac94d8]/10 text-sm"
                >
                  {t('share')}
                </button>
              </div>
            ) : null}
          >
            {/* Search di Topbar hanya di dashboard */}
            {route === "dashboard" && (
              <SearchAutocomplete inputId="global-search" placeholder={t('search_placeholder')} value={query} onChange={setQuery} onPick={onPickPlace} />
            )}
          </Topbar>

          {/* Body */}
          {route === "dashboard" && (
            <DashboardBody
              t={t}
              locale={locale}
              dtFmt={dtFmt}
              center={center} setCenter={setCenter}
              wx={wx} cur={cur} daily7={daily7}
              hourlyInfo={hourlyInfo}
              hourIdx={hourIdx} setHourIdx={setHourIdx}
              loading={loading} err={err}
              radarOn={radarOn} radarPlaying={radarPlaying} setRadarPlaying={setRadarPlaying}
              radarOpacity={radarOpacity} setRadarOpacity={setRadarOpacity}
              radarFrames={radarFrames} setRadarFrames={setRadarFrames}
              radarIndex={radarIndex} setRadarIndex={setRadarIndex}
              windFlag={windFlag}
              toggleFav={toggleFav} inFav={inFav}
              onFetchWeather={fetchWeather}
              favs={favs}
              notifPref={notifPref}
              setNotifPref={setNotifPref}
              alerts={alerts}
              zoom={zoom}
              setZoom={setZoom}
            />
          )}

          {route === "compare" && (
            <div className="px-4 pb-8">
              <ComparePage t={t} unitT={unitT} unitW={unitW} getWeather={getWeather} />
            </div>
          )}

          {route === "alerts" && (
            <div className="px-4 pb-8">
              <AlertsPage
                t={t}
                center={center}
                currentName={wx?.locationName || (lang === 'id' ? 'Saat ini' : 'Current')}
                favs={favs}
                notifPref={notifPref}
                setNotifPref={setNotifPref}
                getWeather={getWeather}
              />
            </div>
          )}


          {route === "settings" && (
            <div className="px-4 pb-8">
              <SettingsPage dark={dark} setDark={setDark} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Sub components ---------- */

function DashboardBody(props) {
  const {
    t, locale, dtFmt,
    center, setCenter, wx, cur, daily7, hourlyInfo,
    hourIdx, setHourIdx, loading, err,
    radarOn, radarPlaying, setRadarPlaying, radarOpacity, setRadarOpacity,
    radarFrames, setRadarFrames, radarIndex, setRadarIndex,
    windFlag, toggleFav, inFav, onFetchWeather, alerts, notifPref, setNotifPref,
    zoom, setZoom,
  } = props;

  return (
    <div className="px-4 pb-8">
      {loading && <div className="text-sm opacity-70 mt-4">{t('loading')}</div>}
      {err && <div className="text-sm text-red-500 mt-4">{err}</div>}

      {cur && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          <Card><Label>{t('temperature')}</Label><Value>{cur.temp}{cur.tempUnit}</Value><Sub>{t('feels')} {cur.feels}{cur.tempUnit}</Sub></Card>
          <Card><Label>{t('humidity')}</Label><Value>{cur.humidity}%</Value><Sub>Relative humidity</Sub></Card>
          <Card><Label>{t('wind')}</Label><Value>{cur.wind} {cur.windUnit}</Value><Sub>Wind speed</Sub></Card>
          <Card><Label>{t('pressure')}</Label><Value>{cur.pressure} hPa</Value><Sub>{t('sea_level')}</Sub></Card>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="col-span-12 xl:col-span-8">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-semibold">{wx?.locationName || t('map')}</div>
              {hourlyInfo && (
                <div className="text-xs opacity-80">
                  {hourlyInfo.time.toLocaleString(locale, dtFmt)} • T: {hourlyInfo.temp}{cur?.tempUnit} • {t('rain')}: {hourlyInfo.precip} mm
                </div>
              )}
            </div>

            {/* timeline */}
            {wx?.hourly?.time && (
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="range"
                  min={0}
                  max={wx.hourly.time.length - 1}
                  value={hourIdx}
                  onChange={(e) => setHourIdx(Number(e.target.value))}
                  className="w-full"
                  aria-label="Timeline"
                />
                <div className="flex justify-between text-xs opacity-60 mt-1">
                  <span>{new Date(wx.hourly.time[0]).toLocaleString(locale, dtFmt)}</span>
                  <span>{new Date(wx.hourly.time.at(-1)).toLocaleString(locale, dtFmt)}</span>
                </div>
              </div>
            )}

            {/* Radar controls */}
            {radarOn && (
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => setRadarPlaying((p) => !p)}
                  className="px-3 py-1.5 rounded-xl border border-[#ac94d8] text-[#ac94d8] bg-white hover:bg-[#ac94d8]/10 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                  aria-pressed={radarPlaying}
                >
                  {radarPlaying ? "Pause" : "Play"}
                </button>
                <input type="range" min={0} max={Math.max(0, radarFrames - 1)} value={radarIndex} onChange={(e) => setRadarIndex(Number(e.target.value))} className="flex-1" aria-label="Radar frame" />
                <label className="text-xs opacity-70">{t('opacity')}</label>
                <input type="range" min={0.1} max={1} step={0.1} value={radarOpacity} onChange={(e) => setRadarOpacity(Number(e.target.value))} aria-label="Radar opacity" />
              </div>
            )}

            <div className="h-[50vh] sm:h-[55vh] md:h-[60vh] xl:h-[70vh]">
              <MapView
                center={center}
                zoom={zoom}
                onMove={(c, z) => { setCenter(c); setZoom(z); }}
                popupContent={
                  hourlyInfo ? (
                    <>
                      {t('lat')}: {center[0].toFixed(4)}, {t('lon')}: {center[1].toFixed(4)}<br />
                      T: {hourlyInfo.temp}{cur?.tempUnit} • {t('rain')}: {hourlyInfo.precip} mm
                    </>
                  ) : (
                    <>
                      {t('lat')}: {center[0].toFixed(4)}, {t('lon')}: {center[1].toFixed(4)}
                    </>
                  )
                }
                onClickMap={({ lat, lon }) => { setCenter([lat, lon]); onFetchWeather(lat, lon); }}
                radar={{
                  enabled: radarOn,
                  frameIndex: radarIndex,
                  playing: radarPlaying,
                  opacity: radarOpacity,
                  onReady: (n) => { setRadarFrames(n); setRadarIndex(Math.max(0, n - 1)); },
                }}
                wind={{ enabled: windFlag, fetchFn: async (lat, lon) => (await getWeather(lat, lon)).current || {} }}
                clusterPoints={[{ lat: center[0], lon: center[1], name: wx?.locationName || "Current" }]}
                // Optional bonus props if your MapView implements them:
                // measure={{ enabled: false, mode: 'distance' }}
                // onExportPng={(url)=>{ const a = document.createElement('a'); a.href=url; a.download='impact-weather-map.png'; a.click(); }}
              />
            </div>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">{t('location_panel')}</div>
                <div className="text-lg font-semibold">{wx?.locationName || t('pick_pin')}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  {center[0].toFixed(2)}, {center[1].toFixed(2)}
                </div>
                <button
                  onClick={toggleFav}
                  className={`px-2 py-1 rounded-lg border text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    inFav ? "bg-[#ac94d8] text-white border-[#ac94d8]" : "bg-white text-[#ac94d8] border-[#ac94d8] hover:bg-[#ac94d8]/10"
                  }`}
                  title={inFav ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={inFav}
                >
                  {inFav ? "★" : "☆"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <InfoRow label={t('t_max_today')} value={`${daily7[0]?.max ?? "-"}${cur?.tempUnit || "°C"}`} />
              <InfoRow label={t('t_min_today')} value={`${daily7[0]?.min ?? "-"}${cur?.tempUnit || "°C"}`} />
              <InfoRow label={t('wind_today')} value={`${wx?.daily?.wind_speed_10m_max?.[0] ?? "-"} m/s`} />
              <InfoRow label={t('rain_today')} value={`${wx?.daily?.precipitation_sum?.[0] ?? "-"} mm`} />
            </div>
          </Card>

          {/* 7-Day Forecast */}
          <Card className="mt-4">
            <div className="font-semibold mb-2">{t('forecast7')}</div>
            <div className="grid grid-cols-1 gap-2">
              {daily7.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="opacity-80 w-36">{d.date.toLocaleDateString(locale, { year:'numeric', month:'numeric', day:'numeric' })}</div>
                  <div className="flex items-center gap-4">
                    <span>{t('max')}: <b>{d.max}{cur?.tempUnit}</b></span>
                    <span>{t('min')}: <b>{d.min}{cur?.tempUnit}</b></span>
                    <span>{t('rain')}: <b>{d.rain} mm</b></span>
                  </div>
                </div>
              ))}
            </div>

            {/* animasi kecil berbasis suhu & angin lokasi terpilih */}
            <div className="mt-3" aria-hidden="true">
              <ThermoTicker
                tempC={wx?.current?.temperature_2m ?? 0}
                wind={wx?.current?.wind_speed_10m ?? 0}
              />
            </div>
          </Card>

          {/* Alerts di dashboard dimatikan */}
          {false && (
            <Card className="mt-4">
              <AlertsPanel
                alerts={alerts}
                notifPref={notifPref}
                setNotifPref={setNotifPref}
                onTest={() => notify("Impact Weather", "Tes notifikasi berhasil")}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==== Topbar & small UI bits ==== */
function Topbar({ route, lang, setLang, dark, setDark, unitT, setUnitT, unitW, setUnitW, useMyLocation, children, extraRight, t }) {
  const isDashboard = route === "dashboard";

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 h-16 flex items-center gap-3 justify-between">
        <div className="hidden md:flex items-center gap-2 text-sm opacity-60">
          <span className="px-2 py-0.5 rounded-md bg-[#ac94d8] text-white dark:bg-white dark:text-[#ac94d8]">
            {route}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="flex items-center gap-2 w-full max-w-2xl">
            {isDashboard && children}
            {isDashboard && (
              <button
                onClick={useMyLocation}
                className="rounded-2xl border border-[#ac94d8] bg-white text-[#ac94d8] hover:bg-[#ac94d8] hover:text-white transition text-sm px-5 py-2 w-44 sm:w-56 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                aria-label={t('use_my_location')}
                title={t('use_my_location')}
              >
                {t('use_my_location')}
              </button>
            )}
          </div>
        </div>
        {/* controls kanan */}
        <div className="flex items-center gap-4 shrink-0">
          <ControlGroup label={t('degree')}>
            <Segmented options={[{k:"C",label:"°C"},{k:"F",label:"°F"}]} value={unitT} onChange={setUnitT}/>
          </ControlGroup>
          <ControlGroup label={t('wind_unit')}>
            <Segmented options={[{k:"mps",label:"m/s"},{k:"kmh",label:"km/h"}]} value={unitW} onChange={setUnitW}/>
          </ControlGroup>
          <ControlGroup label={t('theme')}>
            <Segmented options={[{k:"light",label:"Light"},{k:"dark",label:"Dark"}]} value={dark?"dark":"light"} onChange={v=>setDark(v==="dark")}/>
          </ControlGroup>
          <ControlGroup label={t('language')}>
            <Segmented options={[{k:"id",label:"ID"},{k:"en",label:"EN"}]} value={lang} onChange={setLang}/>
          </ControlGroup>
          {extraRight}
        </div>
      </div>
    </header>
  );
}

function ControlGroup({ label, children }) {
  return (
    <div className="flex flex-col items-start gap-1" aria-label={label}>
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      {children}
    </div>
  );
}
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-2xl overflow-hidden border border-[#ac94d8] bg-white dark:bg-slate-900">
      {options.map((opt, idx) => {
        const active = String(value) === String(opt.k);
        return (
          <button
            key={String(opt.k)}
            onClick={() => onChange(opt.k)}
            className={[
              "px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8]",
              active ? "bg-[#ac94d8] text-white" : "text-[#ac94d8] hover:bg-[#ac94d8]/10",
            ].join(" ")}
            style={idx === 0 ? { borderRight: "1px solid #ac94d8" } : undefined}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
function ToggleMini({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`px-3 py-1.5 rounded-xl border text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
        value ? "bg-[#ac94d8] text-white border-[#ac94d8]" : "bg-white text-[#ac94d8] border-[#ac94d8] hover:bg-[#ac94d8]/10"
      }`}
      title={label}
      aria-pressed={value}
    >
      {label}
    </button>
  );
}
function SidebarLink({ label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-2 text-left px-3 py-2 rounded-xl text-sm transition border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ac94d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
        active ? "bg-[#ac94d8] text-white border-[#ac94d8]" : "hover:bg-[#ac94d8]/10 text-[#ac94d8] border-transparent"
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span>{label}</span>
      {badge > 0 && <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#ac94d8] text-white">{badge}</span>}
    </button>
  );
}
function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 ${className}`}>{children}</div>;
}
const Label = ({ children }) => <div className="text-sm opacity-70">{children}</div>;
const Value = ({ children }) => <div className="mt-1 text-2xl font-semibold">{children}</div>;
const Sub = ({ children }) => <div className="mt-1 text-xs opacity-60">{children}</div>;
function InfoRow({ label, value }) { return (<div className="flex flex-col"><span className="text-xs opacity-60">{label}</span><span className="mt-0.5 font-medium">{value}</span></div>); }
