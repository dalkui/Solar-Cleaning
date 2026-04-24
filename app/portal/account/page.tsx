"use client";
import { useEffect, useRef, useState } from "react";

interface Customer {
  id: string; name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; auto_schedule: boolean; preferred_time_of_day: string; sms_opt_out?: boolean;
}

export default function PortalAccount() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLoad = useRef(false);

  useEffect(() => {
    fetch("/api/portal/me").then(r => r.json()).then(d => {
      setCustomer(d.customer);
      setLoading(false);
      didLoad.current = true;
    });
  }, []);

  useEffect(() => {
    if (!didLoad.current || !customer) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/portal/update-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          street: customer.street,
          suburb: customer.suburb,
          state: customer.state,
          postcode: customer.postcode,
          auto_schedule: customer.auto_schedule,
          preferred_time_of_day: customer.preferred_time_of_day,
          sms_opt_out: customer.sms_opt_out,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 700);
  }, [customer]);

  const openBillingPortal = async () => {
    const r = await fetch("/api/portal/stripe-session", { method: "POST" });
    const d = await r.json();
    if (d.url) window.location.href = d.url;
  };

  if (loading || !customer) return <p style={{ padding: "40px", color: "#7A95B0" }}>Loading…</p>;

  const update = (patch: Partial<Customer>) => setCustomer(c => c ? { ...c, ...patch } : c);

  const field = (label: string, value: string, key: keyof Customer, type = "text") => (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={e => update({ [key]: e.target.value } as any)}
        style={{ width: "100%", padding: "12px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "15px" }}
      />
    </div>
  );

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Account</h1>
        {saved && <span style={{ fontSize: "12px", color: "#4ade80" }}>Saved ✓</span>}
      </div>

      {/* Scheduling preferences */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Scheduling</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "14px" }}>
            <input
              type="checkbox"
              checked={customer.auto_schedule}
              onChange={e => update({ auto_schedule: e.target.checked })}
              style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#F5C518" }}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>Auto-schedule my cleans</p>
              <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>We pick the time, you get notified.</p>
            </div>
          </label>

          <p style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Preferred time</p>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { value: "any", label: "Any" },
              { value: "morning", label: "Morning" },
              { value: "afternoon", label: "Afternoon" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ preferred_time_of_day: opt.value })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: customer.preferred_time_of_day === opt.value ? "rgba(245,197,24,0.15)" : "#08101C",
                  color: customer.preferred_time_of_day === opt.value ? "#F5C518" : "#EFF4FF",
                  border: `1px solid ${customer.preferred_time_of_day === opt.value ? "#F5C518" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Contact</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>Email</label>
            <p style={{ fontSize: "14px", color: "#EFF4FF" }}>{customer.email}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "4px" }}>To change email, contact us</p>
          </div>
          {field("Phone", customer.phone, "phone", "tel")}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginTop: "8px" }}>
            <input
              type="checkbox"
              checked={customer.sms_opt_out || false}
              onChange={e => update({ sms_opt_out: e.target.checked })}
              style={{ width: "16px", height: "16px", accentColor: "#F5C518" }}
            />
            <span style={{ fontSize: "13px", color: "#EFF4FF" }}>Don't send me SMS (email only)</span>
          </label>
        </div>
      </section>

      {/* Address */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Address</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          {field("Street", customer.street, "street")}
          {field("Suburb", customer.suburb, "suburb")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {field("State", customer.state, "state")}
            {field("Postcode", customer.postcode, "postcode")}
          </div>
        </div>
      </section>

      {/* Billing */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Billing</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          <button onClick={openBillingPortal} style={{ width: "100%", padding: "14px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", marginBottom: "10px" }}>
            Manage billing & subscription →
          </button>
          <p style={{ fontSize: "12px", color: "#7A95B0", lineHeight: 1.5 }}>
            Update your payment method, view invoices, or cancel your subscription.
          </p>
        </div>
      </section>
    </div>
  );
}
