"use client";

const plans = [
  {
    id: "elite",
    tier: "A",
    name: "Elite",
    tag: "Premium",
    price: "$110",
    period: "/month",
    intro: "First clean half price — only $150",
    cleans: "4 cleans per year — Quarterly",
    highlight: false,
    lockIn: null,
    features: [
      "Quarterly scheduled cleans",
      "First clean half price — only $150",
      "Then $110/month ongoing",
      "Priority same-week booking",
      "Free annual gutter inspection",
      "Dedicated account manager",
      "Email & SMS reminders",
      "Satisfaction guarantee",
    ],
    cta: "Go Elite",
  },
  {
    id: "standard",
    tier: "B",
    name: "Standard",
    tag: "Most Popular",
    price: "$49.99",
    period: "/month",
    intro: "First clean only $150 — half price",
    cleans: "2 cleans per year — Bi-Annual",
    highlight: true,
    lockIn: "12-month minimum term. If cancelled within the first year, the $150 intro discount is recovered, bringing your first clean to the full $300 rate.",
    features: [
      "Bi-annual scheduled cleans",
      "First clean half price — only $150",
      "Then $49.99/month ongoing",
      "Email & SMS reminders",
      "Cancel after 12 months, anytime",
    ],
    cta: "Start for $150",
  },
  {
    id: "basic",
    tier: "C",
    name: "Basic",
    tag: null,
    price: "$24.99",
    period: "/month",
    intro: "First clean $300",
    cleans: "1 clean per year — Annual",
    highlight: false,
    lockIn: null,
    features: [
      "1 annual scheduled clean",
      "First clean $300",
      "Standard booking",
      "Email reminders",
      "Cancel anytime with 14 days notice",
    ],
    cta: "Get Started",
  },
];

export default function PricingTable() {
  return (
    <section id="pricing" style={{ background: "var(--bg)", padding: "64px 40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>Subscription Plans</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)", marginBottom: "12px" }}>
            Choose your plan.
          </h2>
          <p style={{ fontSize: "16px", color: "var(--text-sub)" }}>
            All plans are monthly subscriptions. Cancel anytime after your minimum term.
          </p>
        </div>

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "start" }}>
          {plans.map((plan) => (
            <div key={plan.tier} style={{
              background: plan.highlight ? "rgba(245,197,24,0.06)" : "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              minWidth: "260px",
              position: "relative",
            }}>
              {plan.tag && (
                <div style={{ position: "absolute", top: "-13px", left: "50%", transform: "translateX(-50%)", background: plan.highlight ? "var(--gold)" : "var(--bg-card)", border: plan.highlight ? "none" : "1px solid var(--border)", color: plan.highlight ? "#08101C" : "var(--text-sub)", padding: "3px 14px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: "var(--body)" }}>
                  {plan.tag}
                </div>
              )}

              <div className="display g-text pricing-card-tier" style={{ fontSize: "52px", lineHeight: 1, marginBottom: "4px", opacity: plan.highlight ? 1 : 0.5 }}>{plan.tier}</div>
              <h3 className="pricing-card-name" style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", fontFamily: "var(--body)" }}>{plan.name}</h3>
              <p className="pricing-card-cleans" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>{plan.cleans}</p>

              {plan.intro && (
                <div className="pricing-card-intro" style={{ background: "rgba(245,197,24,0.1)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "13px", color: "var(--gold)", fontWeight: 600 }}>
                  {plan.intro}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "24px" }}>
                <span className="display pricing-card-price" style={{ fontSize: "44px" }}>{plan.price}</span>
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>{plan.period} after</span>
              </div>

              <hr className="hr" style={{ marginBottom: "20px" }} />

              <ul className="pricing-card-features" style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, marginBottom: "24px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: "10px", fontSize: "14px", color: "var(--text-sub)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <a href={`/book?plan=${plan.id}`} className={`btn pricing-card-btn ${plan.highlight ? "btn-gold" : "btn-outline"}`} style={{ width: "100%", fontSize: "14px" }}>
                {plan.cta}
              </a>

              {plan.lockIn && (
                <p className="pricing-card-lockin" style={{ marginTop: "14px", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic" }}>
                  ⚠️ {plan.lockIn}
                </p>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: "32px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>
          All prices AUD · GST inclusive · A-Grade Electrician on every visit
        </p>
      </div>
    </section>
  );
}
