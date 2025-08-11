// src/components/ComparePage.jsx
import { useMemo, useState } from "react";
import SearchAutocomplete from "./SearchAutocomplete";

export default function ComparePage({ t, unitT, unitW, getWeather }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");

  const toF = (c) => Math.round((c ?? 0) * 9 / 5 + 32);
  const toKmh = (m) => Math.round((m ?? 0) * 3.6);

  const normalize = (x) => {
    if (!x) return null;
    const tTemp = (c) => (unitT === "C" ? Math.round(c ?? 0) : toF(c ?? 0));
    const tWind = (m) => (unitW === "mps" ? Math.round(m ?? 0) : toKmh(m ?? 0));
    return {
      now: tTemp(x.current?.temperature_2m),
      max: tTemp(x.daily?.temperature_2m_max?.[0]),
      min: tTemp(x.daily?.temperature_2m_min?.[0]),
      wind: tWind(x.current?.wind_speed_10m),
      rain: Number(x.daily?.precipitation_sum?.[0] ?? 0).toFixed(1),
    };
  };

  const viewA = useMemo(() => normalize(a), [a, unitT, unitW]);
  const viewB = useMemo(() => normalize(b), [b, unitT, unitW]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <CompareCard
        title={t?.("location_a") || "Location A"}
        name={nameA}
        setName={setNameA}
        placeholder={t?.("search_placeholder") || "Search city (e.g. New York / Bandung)"}
        onPick={async (p) => {
          setNameA(p.display);
          const d = await getWeather(p.lat, p.lon);
          setA(d);
        }}
        view={viewA}
        unitT={unitT}
        unitW={unitW}
        t={t}
      />
      <CompareCard
        title={t?.("location_b") || "Location B"}
        name={nameB}
        setName={setNameB}
        placeholder={t?.("search_placeholder") || "Search city (e.g. New York / Bandung)"}
        onPick={async (p) => {
          setNameB(p.display);
          const d = await getWeather(p.lat, p.lon);
          setB(d);
        }}
        view={viewB}
        unitT={unitT}
        unitW={unitW}
        t={t}
      />
    </div>
  );
}

function CompareCard({ title, name, setName, onPick, view, unitT, unitW, placeholder, t }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="font-semibold mb-2">{title}</div>

      <SearchAutocomplete
        value={name}
        onChange={setName}
        onPick={onPick}
        placeholder={placeholder}
      />

      {view && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Info label={t?.("now") || "Now"} value={`${view.now}°${unitT}`} />
          <Info label={t?.("wind") || "Wind"} value={`${view.wind} ${unitW}`} />
          <Info label={t?.("t_max_today") || "Max today"} value={`${view.max}°${unitT}`} />
          <Info label={t?.("t_min_today") || "Min today"} value={`${view.min}°${unitT}`} />
          <Info label={t?.("rain_today") || "Rain (today)"} value={`${view.rain} mm`} />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs opacity-60">{label}</span>
      <span className="mt-0.5 font-medium">{value}</span>
    </div>
  );
}
