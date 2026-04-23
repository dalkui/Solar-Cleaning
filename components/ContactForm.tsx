"use client";
import { useState } from "react";
import { GlowCard } from "@/components/ui/spotlight-card";

const plans = ["Plan A — Elite ($110/mo)", "Plan B — Standard ($49.99/mo)", "Plan C — Basic ($24.99/mo)", "Not sure yet"];

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", suburb: "", panels: "", plan: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to API route / email / ServiceM8
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section id="contact" style={{ background: "var(--bg-alt)", padding: "64px 40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        <div style={{ marginBottom: "28px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>Get In Touch</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)", marginBottom: "16px" }}>
            Book a clean or<br />
            <em className="g-text">ask us anything.</em>
          </h2>
          <p style={{ fontSize: "17px", color: "var(--text-sub)", lineHeight: 1.75 }}>
            Fill in the form below and Dallas will get back to you within a few hours.
            Or call direct: <a href="tel:0415099300" style={{ color: "var(--gold)", fontWeight: 600 }}>0415 099 300</a>
          </p>
        </div>

        {submitted ? (
          <GlowCard glowColor="orange" style={{ background: "rgba(245,197,24,0.06)", padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✓</div>
            <h3 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "10px", fontFamily: "var(--body)" }}>Thanks, {form.name.split(" ")[0]}!</h3>
            <p style={{ color: "var(--text-sub)", fontSize: "16px" }}>We'll be in touch within a few hours.</p>
          </GlowCard>
        ) : (
          <GlowCard glowColor="orange" style={{ background: "var(--bg-card)", padding: "40px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Name + Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="form-row">
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input required value={form.name} onChange={set("name")} placeholder="John Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input required value={form.phone} onChange={set("phone")} placeholder="0400 000 000" style={inputStyle} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email *</label>
                <input required type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" style={inputStyle} />
              </div>

              {/* Address + Suburb */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }} className="form-row">
                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input value={form.address} onChange={set("address")} placeholder="123 Example St" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suburb *</label>
                  <input required value={form.suburb} onChange={set("suburb")} placeholder="Frankston" style={inputStyle} />
                </div>
              </div>

              {/* Panels + Plan */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="form-row">
                <div>
                  <label style={labelStyle}>Number of Panels</label>
                  <input value={form.panels} onChange={set("panels")} placeholder="e.g. 24" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Interested In</label>
                  <select value={form.plan} onChange={set("plan")} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select a plan...</option>
                    {plans.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>Message (optional)</label>
                <textarea value={form.message} onChange={set("message")} placeholder="Any questions, access notes, or details about your system..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <button type="submit" className="btn btn-gold" disabled={loading} style={{ fontSize: "15px", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending..." : "Send Enquiry →"}
              </button>

              <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                We'll reply within a few hours · No spam, ever
              </p>
            </form>
          </GlowCard>
        )}
      </div>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "8px",
  fontFamily: "var(--body)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "15px",
  color: "var(--text)",
  fontFamily: "var(--body)",
  outline: "none",
  transition: "border-color 0.2s",
};
