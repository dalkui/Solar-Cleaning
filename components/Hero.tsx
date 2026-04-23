export default function Hero() {
  return (
    <section style={{ position: "relative", minHeight: "60vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "860px", margin: "0 auto", padding: "90px 40px 40px", width: "100%", position: "relative", zIndex: 2 }}>

<h1 className="display fade-up delay-1" style={{ fontSize: "clamp(44px, 6vw, 82px)", marginBottom: "16px", color: "var(--text)", fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.0 }}>
          Dirty Panels Are<br />
          <em className="g-text">Costing You Money.</em><br />
          We Fix That.
        </h1>

        <p className="fade-up delay-2" style={{ fontSize: "19px", color: "#C8D8E8", lineHeight: 1.75, maxWidth: "560px", marginBottom: "24px", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
          Dirty panels silently drain <strong style={{ color: "var(--text)" }}>10–30% of your output</strong>. Subscribe once — we handle everything else, automatically.
        </p>

        <div className="fade-up delay-3" style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
          <a href="#pricing" className="btn btn-gold">See Subscription Plans →</a>
          <a href="#why-us" className="btn btn-outline">Why an Electrician?</a>
        </div>

      </div>

      {/* Bottom strip */}
      <div style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "14px 40px", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "8px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--body)", position: "relative", zIndex: 2 }}>
        <span>Subscription-Based · Set &amp; Forget</span>
      </div>
    </section>
  );
}
