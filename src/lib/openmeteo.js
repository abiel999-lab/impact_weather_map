// src/lib/openmeteo.js
import { smartFetch } from './net';
import { cacheGet, cacheSet, buildForecastKey } from './cache';

const FORECAST_TTL_MS = 5 * 60 * 1000; // 5 menit (stale-while-revalidate window)

// NOTE: Kita fetch METRIC saja; konversi unit dilakukan di UI.
const BASE = 'https://api.open-meteo.com/v1/forecast';
const HOURLY = [
  'temperature_2m',
  'precipitation',
].join(',');
const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
].join(',');
const CURRENT = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'pressure_msl',
].join(',');

/** Stale-While-Revalidate:
 *  - kalau ada cache valid: return cepat dari cache dan revalidate di background
 *  - kalau tidak ada cache: fetch langsung dan simpan
 */
export async function getWeather(lat, lon) {
  const key = buildForecastKey(lat, lon);
  const cached = await cacheGet(key);
  if (cached) {
    // revalidate in background (no await)
    revalidate(lat, lon, key);
    return cached;
  }
  // no cache → fetch fresh
  const fresh = await fetchWeather(lat, lon);
  await cacheSet(key, fresh, FORECAST_TTL_MS);
  return fresh;
}

async function revalidate(lat, lon, key) {
  try {
    const fresh = await fetchWeather(lat, lon);
    await cacheSet(key, fresh, FORECAST_TTL_MS);
  } catch {
    // diam saja; akan tercatch di fetch berikutnya
  }
}

async function fetchWeather(lat, lon) {
  const url =
    `${BASE}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    `&hourly=${HOURLY}&daily=${DAILY}&current=${CURRENT}&timezone=auto`;

  const res = await smartFetch(url);
  const data = await res.json();

  // (opsional) rapikan struktur agar konsisten dengan kodemu sekarang
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    current: data.current,
    hourly: data.hourly,
    daily: data.daily,
  };
}

/* ---- (opsional) Geocoding yang sudah kamu pakai sebelumnya ---- */
export async function searchCity(q, hint) {
  // pakai Nominatim bebas rate-limit juga oleh smartFetch
  const base = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '0',
    limit: '10',
  });
  if (hint?.country) params.set('countrycodes', hint.country.toLowerCase());

  const res = await smartFetch(`${base}?${params.toString()}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'impact-weather-map/1.0' },
  });
  const arr = await res.json();
  return arr.map((x, i) => ({
    id: x.place_id ?? i,
    display: x.display_name,
    lat: Number(x.lat),
    lon: Number(x.lon),
  }));
}
