import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * RainViewer public radar overlay (free):
 *   Frames list: https://api.rainviewer.com/public/weather-maps.json
 *   Tile URL:    https://tilecache.rainviewer.com/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png
 */
export default function RadarLayer({
  enabled = false,
  frameIndex = 0,
  playing = false,
  speedMs = 600,
  opacity = 0.6,
  onReady,
}) {
  const map = useMap();
  const layerRef = useRef(null);
  const framesRef = useRef([]);
  const timerRef = useRef(null);

  // fetch frames when enabled
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      const data = await res.json();
      const past = (data?.radar?.past || []).slice(-8); // last ~8 frames
      const ts = past.map((f) => f.time);
      if (!alive) return;
      framesRef.current = ts;
      onReady?.(ts.length, ts);
      if (!layerRef.current) {
        layerRef.current = L.tileLayer(tileUrl(ts[Math.max(0, ts.length - 1)]), { opacity });
        layerRef.current.addTo(map);
      }
    })();
    return () => { alive = false; };
  }, [enabled, map, onReady]);

  // enable/disable
  useEffect(() => {
    const layer = layerRef.current;
    if (!map) return;
    if (enabled) {
      if (layer) layer.addTo(map);
    } else {
      if (layer) map.removeLayer(layer);
      framesRef.current = [];
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [enabled, map]);

  // external frame index control
  useEffect(() => {
    const ts = framesRef.current;
    if (!enabled || !ts.length || !layerRef.current) return;
    const i = Math.max(0, Math.min(frameIndex, ts.length - 1));
    layerRef.current.setUrl(tileUrl(ts[i]));
  }, [frameIndex, enabled]);

  // autoplay
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!enabled || !playing || framesRef.current.length === 0) return;
    let i = Math.max(0, Math.min(frameIndex, framesRef.current.length - 1));
    timerRef.current = setInterval(() => {
      i = (i + 1) % framesRef.current.length;
      layerRef.current?.setUrl(tileUrl(framesRef.current[i]));
    }, speedMs);
    return () => clearInterval(timerRef.current);
  }, [playing, speedMs, enabled, frameIndex]);

  // opacity
  useEffect(() => { layerRef.current?.setOpacity(opacity); }, [opacity]);

  return null;
}

function tileUrl(ts) {
  // color scheme 2, smoothing 1_1
  return `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/2/1_1.png`;
}