import { useEffect, useState } from "react";
import { buildAlerts } from "../lib/alerts";
import { notify } from "../lib/notif";

export default function AlertsPage({ center, currentName, favs, notifPref, setNotifPref, getWeather }) {
  const [rows, setRows] = useState([]); // [{name, alerts}]

  async function refreshAll() {
    const out = [];
    // current
    const cur = await getWeather(center[0], center[1]);
    out.push({ name: currentName, alerts: buildAlerts(cur, notifPref) });
    // favorites
    for (const f of favs) {
      const d = await getWeather(f.lat, f.lon);
      out.push({ name: f.name, alerts: buildAlerts(d, notifPref) });
    }
    setRows(out);
  }

  useEffect(() => { refreshAll(); /* eslint-disable-next-line */ }, [center, favs, notifPref.rainLookaheadHours, notifPref.rainSoonMinMm, notifPref.highTempC, notifPref.lowTempC]);

  return (
    <div className="grid grid-cols-1 gap-4 ">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Alerts by location</div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} className="text-sm px-3 py-1.5 rounded-xl border border-[#ac94d8] text-[#ac94d8] hover:bg-[#ac94d8]/10">Refresh</button>
            <button onClick={() => notify("Impact Weather", "Tes notifikasi berhasil")} className="text-sm px-3 py-1.5 rounded-xl border border-[#ac94d8] text-[#ac94d8] hover:bg-[#ac94d8]/10">Test Notification</button>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="font-medium mb-2">{r.name}</div>
              {r.alerts.length === 0 ? (
                <div className="text-sm opacity-70">Tidak ada alert.</div>
              ) : (
                <ul className="space-y-2">
                  {r.alerts.map(a => (
                    <li key={a.id} className={`text-sm px-3 py-2 rounded-lg border ${sev(a.severity)}`}>
                      <div className="font-medium">{a.title}</div>
                      <div className="opacity-80">{a.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notification preferences global */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
        <div className="font-semibold mb-2">Notification Preferences</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!notifPref.enabled} onChange={e => setNotifPref(v => ({...v, enabled: e.target.checked}))} /> Enable
          </label>
          <span className="opacity-70">Rain soon ≤</span>
          <input type="number" min="1" max="6" value={notifPref.rainLookaheadHours} onChange={e => setNotifPref(v => ({...v, rainLookaheadHours: Number(e.target.value)}))} className="w-14 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent" />
          <span className="opacity-70">hours, ≥</span>
          <input type="number" min="0" step="0.1" value={notifPref.rainSoonMinMm} onChange={e => setNotifPref(v => ({...v, rainSoonMinMm: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent" />
          <span className="opacity-70">mm</span>
          <span className="opacity-70 ml-3">High temp ≥</span>
          <input type="number" value={notifPref.highTempC} onChange={e => setNotifPref(v => ({...v, highTempC: Number(e.target.value)}))} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent" />°C
          <span className="opacity-70 ml-3">Daily summary at</span>
          <input type="time" value={notifPref.summaryTime} onChange={e => setNotifPref(v => ({...v, summaryTime: e.target.value}))} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent" />
        </div>
      </div>
    </div>
  );
}

function sev(s) {
  if (s === "warning") return "bg-red-500/10 text-red-300 border-red-500/30";
  if (s === "watch") return "bg-orange-500/10 text-orange-300 border-orange-500/30";
  if (s === "advisory") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
  return "bg-blue-500/10 text-blue-300 border-blue-500/30";
}
