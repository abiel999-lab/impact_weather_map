export default function MiniCard({ name, cur, daily }) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", background: "white", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, width: 320 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 40, fontWeight: 700 }}>{cur?.temp ?? "-"}</div>
        <div style={{ opacity: .7 }}>{cur?.tempUnit || "°C"}</div>
      </div>
      <div style={{ opacity: .8, fontSize: 12, marginTop: 4 }}>
        Humidity {cur?.humidity}% • Wind {cur?.wind} {cur?.windUnit}
      </div>
      <div style={{ borderTop: "1px dashed #e2e8f0", margin: "10px 0" }} />
      <div style={{ fontSize: 12 }}>
        Today: Max <b>{daily?.[0]?.max ?? "-"}</b>{cur?.tempUnit} • Min <b>{daily?.[0]?.min ?? "-"}</b>{cur?.tempUnit}
      </div>
    </div>
  );
}
