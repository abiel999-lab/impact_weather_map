// src/lib/net.js
// Small fetch wrapper with queue rate-limit + exponential backoff retry.
// Default: max 4 concurrent, min 200ms spacing, 3 retries on 429/5xx or network error.

const MAX_CONCURRENT = 4;
const MIN_SPACING_MS = 200;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

let active = 0;
const q = [];
let lastStart = 0;

function schedule(task) {
  return new Promise((resolve, reject) => {
    q.push({ task, resolve, reject });
    pump();
  });
}

function pump() {
  if (!q.length) return;
  const now = Date.now();
  if (active >= MAX_CONCURRENT) return;
  if (now - lastStart < MIN_SPACING_MS) {
    setTimeout(pump, MIN_SPACING_MS - (now - lastStart));
    return;
  }
  const { task, resolve, reject } = q.shift();
  active++;
  lastStart = Date.now();
  task().then(resolve, reject).finally(() => {
    active--;
    pump();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function withJitter(ms) {
  const jitter = Math.random() * 0.4 + 0.8; // 0.8x–1.2x
  return Math.round(ms * jitter);
}

/**
 * smartFetch(url, { method, headers, body, signal })
 * Retries on 429/5xx/network up to MAX_RETRIES with exp backoff.
 * Uses a global queue for rate-limiting.
 */
export async function smartFetch(url, opts = {}) {
  return schedule(async () => {
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(url, opts);
        if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
          if (attempt < MAX_RETRIES) {
            const backoff = withJitter(BASE_BACKOFF_MS * 2 ** attempt);
            attempt++;
            await sleep(backoff);
            continue;
          }
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${text.slice(0,120)}`);
        }
        return res;
      } catch (err) {
        // Only retry network errors
        if (attempt < MAX_RETRIES) {
          const backoff = withJitter(BASE_BACKOFF_MS * 2 ** attempt);
          attempt++;
          await sleep(backoff);
          continue;
        }
        throw err;
      }
    }
  });
}
