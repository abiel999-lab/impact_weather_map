// src/components/MapView.jsx
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// <- penting untuk Vite: jangan biarkan Leaflet menebak path sendiri
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});


export default function MapView({
  center = [-6.2, 106.816],
  zoom = 6,
  onMove, // (center[], zoom) setiap pan/zoom
  onClickMap,
  popupContent,
  radar, // biarkan kompatibel
  wind, // biarkan kompatibel
  clusterPoints = [],
  measure = { enabled: false, mode: "distance" }, // NEW
  onExportPng, // NEW
  provider = { type: "osm" }, // NEW
}) {
  const mapRef = useRef(null);
  const [ctr, setCtr] = useState(center);
  const [zm, setZm] = useState(zoom);

  useEffect(() => {
    setCtr(center);
  }, [center[0], center[1]]);
  useEffect(() => {
    setZm(zoom);
  }, [zoom]);

  function ClickHandler() {
    useMapEvents({
      click(e) {
        onClickMap?.({ lat: e.latlng.lat, lon: e.latlng.lng });
      },
      moveend() {
        const m = mapRef.current;
        if (m) {
          const c = m.getCenter();
          const z = m.getZoom();
          onMove?.([c.lat, c.lng], z);
        }
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={ctr}
      zoom={zm}
      className="h-full w-full"
      scrollWheelZoom
      whenCreated={(m) => (mapRef.current = m)}
    >
      <BaseTiles provider={provider} />
      <ClickHandler />

      {/* Marker pusat (opsional) */}
      <Marker position={ctr}>
        <Popup>
          {popupContent || (
            <>
              Lat: {ctr[0].toFixed(4)}, Lon: {ctr[1].toFixed(4)}
            </>
          )}
        </Popup>
      </Marker>

      {/* Tools */}
      {measure?.enabled && <MeasureTool mode={measure.mode} />}
      {onExportPng && <ExportControl onExport={() => exportPng(mapRef.current, onExportPng)} />}

      {/* Placeholder overlay (radar/wind) tetap kompatibel */}
    </MapContainer>
  );
}

/* ====== Tiles ====== */
function BaseTiles({ provider }) {
  if (provider?.type === "mapbox" && provider.token && provider.styleId) {
    // styleId: "username/styleid"
    const url = `https://api.mapbox.com/styles/v1/${provider.styleId}/tiles/{z}/{x}/{y}?access_token=${provider.token}`;
    return (
      <TileLayer
        url={url}
        tileSize={512}
        zoomOffset={-1}
        attribution="© Mapbox © OpenStreetMap"
        crossOrigin
      />
    );
  }
  // default OSM
  return (
    <TileLayer
      attribution="&copy; OpenStreetMap"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      crossOrigin
    />
  );
}

/* ====== Measure Tool ====== */
function MeasureTool({ mode = "distance" }) {
  const map = useMap();
  const [points, setPoints] = useState([]);
  const [shape, setShape] = useState(null); // L.Polyline / L.Polygon
  const [label, setLabel] = useState("");

  useEffect(() => {
    function onClick(e) {
      setPoints((p) => [...p, [e.latlng.lat, e.latlng.lng]]);
    }
    function onDblClick() {
      finish();
    }
    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
    };
    // eslint-disable-next-line
  }, [map, mode]);

  useEffect(() => {
    if (!points.length) return;
    if (shape) {
      map.removeLayer(shape);
      setShape(null);
    }
    const layer =
      mode === "area" ? L.polygon(points, { color: "#ac94d8" }) : L.polyline(points, { color: "#ac94d8" });
    layer.addTo(map);
    setShape(layer);

    const txt = mode === "area" ? fmtArea(calcArea(points)) : fmtDist(calcDistance(points));
    setLabel(`${mode === "area" ? "Area" : "Distance"}: ${txt}`);
    // eslint-disable-next-line
  }, [points, mode]);

  function finish() {
    if (!points.length) return;
    if (mode === "area" && points.length >= 3) {
      // tutup polygon
      setPoints((p) => [...p, p[0]]);
    }
  }
  function clear() {
    if (shape) map.removeLayer(shape);
    setPoints([]);
    setShape(null);
    setLabel("");
  }

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar" style={{ background: "white", padding: 8, minWidth: 160 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          <b>Measure: {mode}</b>
          <div style={{ marginTop: 4, opacity: 0.8 }}>
            {label || "Click untuk menambah titik • Double-click untuk selesai"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={finish} className="px-2 py-1" title="Finish">
            Finish
          </button>
          <button onClick={clear} className="px-2 py-1" title="Clear">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// Haversine total (meter)
function calcDistance(points) {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += haversine(points[i - 1], points[i]);
  return m;
}
function haversine(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]),
    lat2 = toRad(b[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Spherical polygon area approx (m²)
function calcArea(points) {
  if (points.length < 3) return 0;
  const R = 6378137;
  const toRad = (x) => (x * Math.PI) / 180;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((area * R * R) / 2);
}
function fmtDist(m) {
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
function fmtArea(m2) {
  if (m2 < 1e6) return `${m2.toFixed(0)} m²`;
  return `${(m2 / 1e6).toFixed(2)} km²`;
}

/* ====== Export PNG ====== */
function ExportControl({ onExport }) {
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 56 }}>
      <div className="leaflet-control leaflet-bar" style={{ background: "white" }}>
        <button onClick={onExport} style={{ padding: "6px 10px" }} title="Export PNG">
          PNG
        </button>
      </div>
    </div>
  );
}

async function exportPng(map, cb) {
  if (!map) return;
  try {
    // coba pakai html-to-image
    const { toPng } = await import("html-to-image");
    const node = map.getContainer();
    const dataUrl = await toPng(node, {
      cacheBust: true,
      useCORS: true,
      pixelRatio: window.devicePixelRatio || 1,
    });
    cb?.(dataUrl, null);
  } catch (e1) {
    console.warn("html-to-image failed, trying dom-to-image-more", e1);
    try {
      // fallback opsional (install jika diperlukan): npm i dom-to-image-more
      const dom = await import("dom-to-image-more");
      const node = map.getContainer();
      const dataUrl = await dom.toPng(node, { cacheBust: true, imagePlaceholder: "" });
      cb?.(dataUrl, null);
    } catch (e2) {
      console.error("Export PNG failed", e2);
      cb?.(null, e2);
    }
  }
}

export { exportPng };
