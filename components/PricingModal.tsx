"use client";
import { useState } from "react";

const plans = [
  {
    id: "basic",
    tier: "A",
    name: "Basic",
    tag: null,
    price: "$24.99",
    period: "/month",
    firstClean: "$300",
    cleans: "1 clean/year · Annual",
    highlight: false,
    lockIn: null,
    features: [
      "1 annual scheduled clean",
      "First clean $300",
      "Standard booking",
      "Email reminders",
      "Serviced by A-Grade Electrician",
      "Cancel anytime with 14 days notice",
    ],
  },
  {
    id: "standard",
    tier: "B",
    name: "Standard",
    tag: "Most Popular",
    price: "$49.99",
    period: "/month",
    firstClean: "$150",
    cleans: "2 cleans/year · Bi-Annual",
    highlight: true,
    lockIn: "12-month minimum. Early cancellation recovers the $150 intro discount (full $300 applies).",
    features: [
      "Bi-annual scheduled cleans",
      "First clean half price — $150",
      "Email & SMS reminders",
      "Serviced by A-Grade Electrician",
      "Cancel after 12 months, anytime",
    ],
  },
  {
    id: "elite",
    tier: "C",
    name: "Elite",
    tag: "Premium",
    price: "$110",
    period: "/month",
    firstClean: "$150",
    cleans: "4 cleans/year · Quarterly",
    highlight: false,
    lockIn: "12-month minimum. Early cancellation recovers the $150 intro discount (full $300 applies).",
    features: [
      "Quarterly scheduled cleans",
      "First clean half price — $150",
      "Priority same-week booking",
      "Free annual gutter inspection",
      "Dedicated account manager",
      "Email & SMS reminders",
      "Satisfaction guarantee",
    ],
  },
];

export default function PricingModal() {
  const [selected, setSelected] = useState("standard");
  const active = plans.find((p) => p.id === selected)!;

  return (
    <section
      id="pricing"
      style={{
        background: "var(--bg)",
        padding: "64px 40px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>
            Subscription Plans
          </span>
          <h2
            className="display"
            style={{ fontSize: "clamp(34px, 4.5vw, 54px)", marginBottom: "12px" }}
          >
            Choose your plan.
          </h2>
          <p style={{ fontSize: "16px", color: "var(--text-sub)" }}>
            All plans are monthly subscriptions. Cancel anytime after your minimum term.
          </p>
        </div>

        {/* Plan selector cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "3px",
            marginBottom: "24px",
            alignItems: "stretch",
          }}
          className="pricing-selector-grid"
        >
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              style={{
                background:
                  selected === plan.id
                    ? plan.highlight
                      ? "rgba(245,197,24,0.12)"
                      : "var(--bg-card)"
                    : "rgba(255,255,255,0.02)",
                border: `1.5px solid ${
                  selected === plan.id
                    ? plan.highlight
                      ? "var(--gold)"
                      : "rgba(255,255,255,0.18)"
                    : "var(--border)"
                }`,
                borderRadius: "12px",
                padding: "16px 12px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                position: "relative",
                width: "100%",
                minWidth: 0,
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: "-11px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--gold)",
                    color: "#08101C",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "normal",
                    textAlign: "center",
                    lineHeight: 1.3,
                    fontFamily: "var(--body)",
                  }}
                >
                  Most<br />Popular
                </div>
              )}
              {(plan.id === "basic" || plan.id === "elite") && (
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--body)", marginBottom: "2px" }}>
                  {plan.id === "basic" ? "Minimum" : "Premium"}
                </div>
              )}
              <div
                className="display g-text"
                style={{
                  fontSize: "28px",
                  lineHeight: 1,
                  marginBottom: "2px",
                  opacity: selected === plan.id ? 1 : 0.4,
                }}
              >
                {plan.tier}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: selected === plan.id ? "var(--text)" : "var(--text-muted)",
                  fontFamily: "var(--body)",
                  marginBottom: "2px",
                }}
              >
                {plan.name}
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontFamily: "var(--display)",
                  color: selected === plan.id ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {plan.price}
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--body)",
                    fontWeight: 400,
                  }}
                >
                  {plan.period}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Active plan detail panel */}
        <div
          style={{
            background: active.highlight ? "rgba(245,197,24,0.06)" : "var(--bg-card)",
            border: `1px solid ${active.highlight ? "rgba(245,197,24,0.25)" : "var(--border)"}`,
            borderRadius: "16px",
            padding: "28px",
          }}
        >
          {/* Plan top row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                <span
                  className="display g-text"
                  style={{ fontSize: "40px", lineHeight: 1 }}
                >
                  {active.tier}
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    fontFamily: "var(--body)",
                    color: "var(--text)",
                  }}
                >
                  {active.name}
                </span>
                {active.tag && (
                  <span
                    style={{
                      background: active.highlight ? "var(--gold)" : "rgba(255,255,255,0.08)",
                      color: active.highlight ? "#08101C" : "var(--text-sub)",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontFamily: "var(--body)",
                    }}
                  >
                    {active.tag}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{active.cleans}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: "flex-end" }}>
                <span className="display" style={{ fontSize: "40px" }}>{active.price}</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{active.period}</span>
              </div>
              <div
                style={{
                  background: "rgba(245,197,24,0.1)",
                  border: "1px solid rgba(245,197,24,0.2)",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  color: "var(--gold)",
                  fontWeight: 600,
                  marginTop: "6px",
                }}
              >
                First clean {active.firstClean}
                {(active.highlight || active.id === "elite") ? " — half price" : ""}
              </div>
            </div>
          </div>

          <hr className="hr" style={{ marginBottom: "20px" }} />

          {/* Features */}
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            {active.features.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  gap: "10px",
                  fontSize: "14px",
                  color: "var(--text-sub)",
                  lineHeight: 1.5,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    color: "var(--gold)",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href="/contact"
            className={`btn ${active.highlight ? "btn-gold" : "btn-outline"}`}
            style={{ display: "inline-block", minWidth: "180px" }}
          >
            {active.highlight ? "Start for $150 →" : active.id === "elite" ? "Go Elite →" : "Get Started →"}
          </a>

          {active.lockIn && (
            <p
              style={{
                marginTop: "14px",
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              ⚠️ {active.lockIn}
            </p>
          )}
        </div>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          All prices AUD · GST inclusive · A-Grade Electrician on every visit
        </p>
      </div>
    </section>
  );
}
