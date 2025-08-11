// src/components/AlertsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { buildAlerts } from "../lib/alerts";
import { notify } from "../lib/notif";

export default function AlertsPage({
  favs = [],
  notifPref,
  setNotifPref,
  getWeather,
  t, // <-- i18n function (opsional)
}) {
  const [rows, setRows] = useState([]); // [{name, alerts}]
  const [loading, setLoading] = useState(false);

  // helper i18n dgn fallback ID
  const T = (k, fallback) => (typeof t === "function" ? t(k) ?? fallback : fallback);

  // Gunakan hanya favorites + dedup (berdasar id atau lat,lon dibulatkan)
  const favList = useMemo(() => {
    const map = new Map();
    for (const f of favs) {
      const key = f.id || `${Number(f.lat).toFixed(4)},${Number(f.lon).toFixed(4)}`;
      if (!map.has(key)) map.set(key, f);
    }
    return [...map.values()];
  }, [favs]);

  async function refreshAll() {
    if (!favList.length) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const out = [];
      for (const f of favList) {
        const d = await getWeather(f.lat, f.lon);
        out.push({ name: f.name, alerts: buildAlerts(d, notifPref) });
      }
      setRows(out);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // refresh saat daftar favorit / preferensi berubah
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    favList,
    notifPref.rainLookaheadHours,
    notifPref.rainSoonMinMm,
    notifPref.highTempC,
    notifPref.lowTempC,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="font-semibold">
            {T("Alerts By Locations", "Peringatan per lokasi")}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={loading}
              className={`text-sm px-3 py-1.5 rounded-xl border border-[#ac94d8] ${
                loading
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-[#ac94d8] hover:bg-[#ac94d8]/10"
              }`}
              aria-busy={loading}
            >
              {loading ? T("refreshing", "Menyegarkan…") : T("refresh", "Segarkan")}
            </button>
            <button
              onClick={() => notify("Impact Weather", T("test_notification_msg", "Tes notifikasi berhasil"))}
              className="text-sm px-3 py-1.5 rounded-xl border border-[#ac94d8] text-[#ac94d8] hover:bg-[#ac94d8]/10"
            >
              {T("test_notification", "Tes Notifikasi")}
            </button>
          </div>
        </div>

        {/* Tidak ada favorit */}
        {!favList.length && (
          <div className="mt-3 text-sm opacity-70">
            {T(
              "no_favorites_alerts",
              "Belum ada lokasi favorit. Tambahkan favorit dari Dashboard untuk melihat alert di sini."
            )}
          </div>
        )}

        {/* Daftar alert per favorit */}
        {!!favList.length && (
          <div className="mt-3 space-y-3">
            {rows.map((r, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"
              >
                <div className="font-medium mb-2">{r.name}</div>
                {r.alerts.length === 0 ? (
                  <div className="text-sm opacity-70">
                    {T("no_alerts", "Tidak ada alert.")}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {r.alerts.map((a) => (
                      <li
                        key={a.id || a.title + (a.message || "")}
                        className={`text-sm px-3 py-2 rounded-lg border ${sev(a.severity)}`}
                      >
                        <div className="font-medium">{a.title}</div>
                        {a.message && (
                          <div className="opacity-80">{a.message}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification preferences global */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
        <div className="font-semibold mb-2">
          {T("notif_prefs", "Preferensi Notifikasi")}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!notifPref.enabled}
              onChange={(e) => setNotifPref((v) => ({ ...v, enabled: e.target.checked }))}
            />
            {T("enable", "Aktifkan")}
          </label>

          <span className="opacity-70">{T("rain_soon_lte", "Hujan segera ≤")}</span>
          <input
            type="number"
            min="1"
            max="6"
            value={notifPref.rainLookaheadHours}
            onChange={(e) =>
              setNotifPref((v) => ({ ...v, rainLookaheadHours: Number(e.target.value) }))
            }
            className="w-14 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            aria-label={T("rain_soon_hours", "Jam lihat ke depan")}
          />
          <span className="opacity-70">{T("hours_gte", "jam, ≥")}</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={notifPref.rainSoonMinMm}
            onChange={(e) =>
              setNotifPref((v) => ({ ...v, rainSoonMinMm: Number(e.target.value) }))
            }
            className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            aria-label={T("rain_soon_mm", "Ambang hujan (mm)")}
          />
          <span className="opacity-70">{T("mm", "mm")}</span>

          <span className="opacity-70 ml-3">{T("high_temp_gte", "Suhu tinggi ≥")}</span>
          <input
            type="number"
            value={notifPref.highTempC}
            onChange={(e) =>
              setNotifPref((v) => ({ ...v, highTempC: Number(e.target.value) }))
            }
            className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            aria-label={T("high_temp_threshold", "Ambang suhu tinggi (°C)")}
          />
          °C

          <span className="opacity-70 ml-3">{T("daily_summary_at", "Ringkasan harian pukul")}</span>
          <input
            type="time"
            value={notifPref.summaryTime}
            onChange={(e) => setNotifPref((v) => ({ ...v, summaryTime: e.target.value }))}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
            aria-label={T("daily_summary_time", "Waktu ringkasan harian")}
          />
        </div>
      </div>
    </div>
  );
}

function sev(s) {
  // dukung beberapa naming: danger|warn|info atau warning|watch|advisory
  if (s === "danger" || s === "warning") {
    return "bg-rose-500/10 text-rose-300 border-rose-500/30";
    }
  if (s === "warn" || s === "watch") {
    return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  }
  if (s === "advisory") {
    return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
  }
  return "bg-blue-500/10 text-blue-300 border-blue-500/30";
}
