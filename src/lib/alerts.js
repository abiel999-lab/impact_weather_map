// Build alert list from Open-Meteo response
export function buildAlerts(wx, opts = {}) {
  const {
    rainLookaheadHours = 3,
    rainSoonMinMm = 0.2,
    heavyRainDailyMm = 20,
    strongWindMs = 15,
    highTempC = 35,
    lowTempC = 5,
  } = opts;

  const out = [];
  const h = wx?.hourly || {};
  const d = wx?.daily || {};

  // nearest hour index
  let nowIdx = 0;
  if (Array.isArray(h.time) && h.time.length) {
    const now = Date.now();
    for (let i = 0; i < h.time.length; i++) {
      const t = new Date(h.time[i]).getTime();
      if (t <= now) nowIdx = i; else break;
    }
  }

  // Rain soon (next N hours)
  if (h.precipitation && h.time) {
    const maxIdx = Math.min(h.time.length - 1, nowIdx + Math.max(1, rainLookaheadHours));
    for (let i = nowIdx; i <= maxIdx; i++) {
      const mm = Number(h.precipitation[i] || 0);
      if (mm >= rainSoonMinMm) {
        out.push({
          id: `rainsoon-${i}`,
          type: "rain_soon",
          severity: mm >= 5 ? "warning" : "advisory",
          title: "Rain expected soon",
          message: `≈ ${mm.toFixed(1)} mm around ${new Date(h.time[i]).toLocaleTimeString()}`,
          startsAt: new Date(h.time[i]).toISOString(),
        });
        break;
      }
    }
  }

  // Heavy rain today
  if (Array.isArray(d.precipitation_sum)) {
    const mm = Number(d.precipitation_sum[0] || 0);
    if (mm >= heavyRainDailyMm) {
      out.push({ id: "heavy-rain", type: "heavy_rain", severity: "watch", title: "Heavy rain today", message: `${mm.toFixed(1)} mm total (forecast)` });
    }
  }

  // Strong wind today
  if (Array.isArray(d.wind_speed_10m_max)) {
    const ms = Number(d.wind_speed_10m_max[0] || 0);
    if (ms >= strongWindMs) {
      out.push({ id: "strong-wind", type: "strong_wind", severity: "watch", title: "Strong wind today", message: `${ms.toFixed(1)} m/s (max)` });
    }
  }

  // Temperature extremes
  if (Array.isArray(d.temperature_2m_max)) {
    const t = Number(d.temperature_2m_max[0] || 0);
    if (t >= highTempC) out.push({ id: "very-hot", type: "hot", severity: "advisory", title: "Very hot today", message: `${Math.round(t)}°C max` });
  }
  if (Array.isArray(d.temperature_2m_min)) {
    const t = Number(d.temperature_2m_min[0] || 0);
    if (t <= lowTempC) out.push({ id: "very-cold", type: "cold", severity: "advisory", title: "Very cold today", message: `${Math.round(t)}°C min` });
  }

  // Thunderstorm code (95,96,99)
  if (Array.isArray(d.weather_code)) {
    const code = Number(d.weather_code[0] || 0);
    if ([95, 96, 99].includes(code)) {
      out.push({ id: "thunder", type: "thunder", severity: "warning", title: "Thunderstorm risk", message: `Weather code ${code}` });
    }
  }

  return out;
}
