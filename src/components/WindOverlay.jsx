import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Simple wind arrows overlay drawn as markers on a small grid inside viewport.
 * Pass fetchFn(lat, lon) that returns { wind_direction_10m, wind_speed_10m }.
 */
export default function WindOverlay({ enabled = false, fetchFn, color = "#ac94d8" }) {
  const map = useMap();
  const groupRef = useRef(L.layerGroup());

  useEffect(() => {
    if (!map) return;
    if (enabled) {
      groupRef.current.addTo(map);
      draw();
      map.on("moveend", draw);
    } else {
      map.off("moveend", draw);
      groupRef.current.clearLayers();
      map.removeLayer(groupRef.current);
    }
    return () => { map?.off("moveend", draw); };
    // eslint-disable-next-line
  }, [enabled, map]);

  async function draw() {
    if (!enabled) return;
    groupRef.current.clearLayers();
    const b = map.getBounds();
    const nx = 5, ny = 4; // grid density
    const latStep = (b.getNorth() - b.getSouth()) / (ny + 1);
    const lonStep = (b.getEast() - b.getWest()) / (nx + 1);

    const tasks = [];
    for (let iy = 1; iy <= ny; iy++) {
      for (let ix = 1; ix <= nx; ix++) {
        const lat = b.getSouth() + iy * latStep;
        const lon = b.getWest() + ix * lonStep;
        tasks.push(fetchFn(lat, lon).then((cur) => ({ lat, lon, cur })).catch(() => null));
      }
    }
    const pts = (await Promise.all(tasks)).filter(Boolean);

    pts.forEach(({ lat, lon, cur }) => {
      const dir = cur?.wind_direction_10m ?? 0; // degrees
      const spd = cur?.wind_speed_10m ?? 0;
      const icon = L.divIcon({
        className: "",
        html: `<div class="iwm-wind" style="transform: rotate(${dir}deg); color:${color}">↑</div>
               <div class="iwm-wind-spd" style="color:${color}">${Math.round(spd)}</div>`,
        iconSize: [1, 1],
      });
      L.marker([lat, lon], { icon }).addTo(groupRef.current);
    });
  }

  return null;
}