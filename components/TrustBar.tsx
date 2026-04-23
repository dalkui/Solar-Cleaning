const stats = [
  { value: "10–30%", label: "Energy lost to dirty panels" },
  { value: "A-Grade", label: "Electrical licence held" },
  { value: "100%", label: "Warranty-safe cleaning method" },
  { value: "Zero", label: "Things you need to remember" },
];

export default function TrustBar() {
  return (
    <section style={{ background: "var(--bg-alt)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="trust-grid" style={{ maxWidth: "960px", margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ padding: "40px 20px", textAlign: "center", borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
            <div className="display g-text" style={{ fontSize: "32px", marginBottom: "8px" }}>{s.value}</div>
            <div style={{ fontSize: "13px", color: "var(--text-sub)", lineHeight: 1.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
