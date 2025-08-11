// src/lib/cache.js
// Tiny key-value cache with memory + IndexedDB, with TTL and SWR helpers.

const DB_NAME = 'iwm-cache';
const STORE = 'kv';
let dbPromise = null;

const mem = new Map(); // key -> { value, exp }

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const st = tx.objectStore(STORE);
      const rq = st.get(key);
      rq.onsuccess = () => resolve(rq.result ?? null);
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    return null;
  }
}
async function idbSet(key, val) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      const rq = st.put(val, key);
      rq.onsuccess = () => resolve();
      rq.onerror = () => reject(rq.error);
    });
  } catch {}
}

export async function cacheGet(key) {
  const m = mem.get(key);
  const now = Date.now();
  if (m && m.exp > now) return m.value;
  const v = await idbGet(key);
  if (v && v.exp > now) {
    mem.set(key, v); // rehydrate memory
    return v.value;
  }
  return null;
}

export async function cacheSet(key, value, ttlMs) {
  const exp = Date.now() + ttlMs;
  const obj = { value, exp };
  mem.set(key, obj);
  await idbSet(key, obj);
}

/** Build a stable key for forecast: round lat/lon + hour bucket */
export function buildForecastKey(lat, lon) {
  const r = (n, d = 2) => Number(n).toFixed(d);     // ~0.01° bucket
  const hourBucket = Math.floor(Date.now() / 3600000); // change key each hour
  return `forecast:${r(lat,2)},${r(lon,2)}:h${hourBucket}`;
}
