import { useEffect, useRef } from "react";

// cute, low-cost canvas animation driven by temp (°C) & wind (m/s)
export default function ThermoTicker({ tempC = 0, wind = 3 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let raf = 0;

    function fit() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || 600;
      const cssH = canvas.clientHeight || 48;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener("resize", fit);

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // === color & motion mapping ===
    const t = Number(tempC) || 0; // °C

    // map  -5°C → hue 210 (biru)  ...  40°C → hue 0 (merah)
    // ≥ 40°C dipaksa hue=0 (merah).
    const tMin = -5;
    const tRed = 40; // threshold merah
    const tNorm = clamp((t - tMin) / (tRed - tMin), 0, 1);
    const hue = t >= tRed ? 0 : Math.round(210 - tNorm * 210);

    const amp = clamp((t - 5) * 1.2, 6, 18);                 // amplitudo gelombang
    const speed = clamp(60 + (Number(wind) || 0) * 30, 40, 180); // px/detik
    const period = 90; // px per gelombang

    let t0 = performance.now();

    function draw(now) {
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 48;
      const dt = (now - t0) / 1000;
      t0 = now;

      // clear
      ctx.clearRect(0, 0, w, h);

      // subtle bg strip
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `hsla(${hue}, 80%, 20%, .25)`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 12%, .25)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // travelling dot progress
      ThermoTicker._x = (ThermoTicker._x ?? 0) + speed * dt;
      if (ThermoTicker._x > w + 20) ThermoTicker._x = -20;

      const midY = Math.round(h / 2);

      // wave
      ctx.lineWidth = 2;
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, .85)`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = midY + Math.sin((x / period) * Math.PI * 2) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // glowing dot
      const x = ThermoTicker._x;
      const y = midY + Math.sin((x / period) * Math.PI * 2) * amp;
      const r = 5;

      const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
      g.addColorStop(0, `hsla(${hue}, 95%, 70%, .7)`);
      g.addColorStop(1, `hsla(${hue}, 95%, 70%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsl(${hue}, 95%, 65%)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [tempC, wind]);

  return <canvas ref={ref} className="block w-full h-12 rounded-xl" aria-hidden="true" />;
}
