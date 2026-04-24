"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const planNames: Record<string, { name: string; price: string; firstClean: string }> = {
  basic:    { name: "Basic Plan",    price: "$24.99/mo", firstClean: "$300" },
  standard: { name: "Standard Plan", price: "$49.99/mo", firstClean: "$150" },
  elite:    { name: "Elite Plan",    price: "$110/mo",   firstClean: "$150" },
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "var(--text-muted)",
  marginBottom: "6px",
  fontFamily: "var(--body)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0C1828",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "8px",
  padding: "12px 14px",
  color: "var(--text)",
  fontSize: "15px",
  fontFamily: "var(--body)",
  outline: "none",
};

function BookInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan") || "standard";
  const details = planNames[plan] || planNames.standard;

  const [form, setForm] = useState({
    name: "", phone: "", street: "", suburb: "",
    state: "", postcode: "", stories: "", panels: "",
    auto_schedule: true,
    preferred_time_of_day: "any",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm({ ...form, [target.name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("bookingDetails", JSON.stringify({ ...form, plan }));
    router.push(`/checkout?plan=${plan}`);
  };

  const isDouble = form.stories === "double";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 40px" }} className="checkout-page">
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <a href="/#pricing" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", display: "block", marginBottom: "32px" }}>
          ← Back to plans
        </a>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="label" style={{ display: "block", marginBottom: "2px" }}>Selected Plan</span>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>{details.name}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="g-text display" style={{ fontSize: "22px" }}>{details.firstClean}</span>
            <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)" }}>first clean · then {details.price}</span>
          </div>
        </div>

        <span className="label" style={{ display: "block", marginBottom: "20px" }}>Your Details</span>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input name="name" required value={form.name} onChange={handleChange} placeholder="John Smith" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input name="phone" required type="tel" value={form.phone} onChange={handleChange} placeholder="04XX XXX XXX" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Street Address</label>
            <input name="street" required value={form.street} onChange={handleChange} placeholder="123 Example St" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Suburb</label>
              <input name="suburb" required value={form.suburb} onChange={handleChange} placeholder="Suburb" style={inputStyle} />
            </div>
            <div style={{ width: "100px" }}>
              <label style={labelStyle}>Postcode</label>
              <input name="postcode" required value={form.postcode} onChange={handleChange} placeholder="3000" style={inputStyle} maxLength={4} />
            </div>
          </div>

          <div style={{ width: "120px" }}>
            <label style={labelStyle}>State</label>
            <input name="state" required value={form.state} onChange={handleChange} placeholder="VIC" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Home Type</label>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {[
                { value: "single", label: "Single storey" },
                { value: "double", label: "Double storey" },
              ].map((opt) => (
                <label key={opt.value} style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: form.stories === opt.value ? "rgba(245,197,24,0.08)" : "var(--bg-card)",
                  border: `1px solid ${form.stories === opt.value ? "rgba(245,197,24,0.4)" : "var(--border)"}`,
                  borderRadius: "8px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "var(--text)",
                  transition: "all 0.15s",
                }}>
                  <input
                    type="radio"
                    name="stories"
                    value={opt.value}
                    checked={form.stories === opt.value}
                    onChange={handleChange}
                    required
                    style={{ accentColor: "#F5C518", flexShrink: 0 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {isDouble && (
              <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--text-muted)", background: "rgba(245,197,24,0.05)", border: "1px solid rgba(245,197,24,0.15)", borderRadius: "8px", padding: "12px 14px", lineHeight: 1.6 }}>
                ⚠️ Double-storey homes with rooftop solar access may incur a safety fee, assessed on your first clean. We'll contact you before charging anything extra.
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Approximate Number of Panels</label>
            <input
              name="panels"
              required
              type="number"
              min="1"
              value={form.panels}
              onChange={handleChange}
              placeholder="e.g. 20"
              style={inputStyle}
            />
            <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Systems with an unusually large number of panels may require a custom quote. We'll reach out if this applies to you.
            </p>
          </div>

          {/* Auto-schedule toggle */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="auto_schedule"
                checked={form.auto_schedule}
                onChange={handleChange}
                style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#F5C518", flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "var(--text)" }}>Schedule my cleans automatically</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>We'll pick the best time in your due month and let you know. You can always reschedule.</p>
              </div>
            </label>

            {!form.auto_schedule && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Preferred time of day:</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { value: "any", label: "Any time" },
                    { value: "morning", label: "Morning (8am–12pm)" },
                    { value: "afternoon", label: "Afternoon (12pm–5pm)" },
                  ].map(opt => (
                    <label key={opt.value} style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 10px",
                      background: form.preferred_time_of_day === opt.value ? "rgba(245,197,24,0.08)" : "var(--bg)",
                      border: `1px solid ${form.preferred_time_of_day === opt.value ? "rgba(245,197,24,0.4)" : "var(--border)"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      textAlign: "center",
                    }}>
                      <input
                        type="radio"
                        name="preferred_time_of_day"
                        value={opt.value}
                        checked={form.preferred_time_of_day === opt.value}
                        onChange={handleChange}
                        style={{ display: "none" }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: "8px" }}>
            Continue to Payment →
          </button>
        </form>
      </div>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input::placeholder { color: var(--text-muted); }
      `}</style>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookInner />
    </Suspense>
  );
}
