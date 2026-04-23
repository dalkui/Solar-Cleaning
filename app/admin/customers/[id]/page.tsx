"use client";
import { useEffect, useState, use } from "react";
import { getNextCleanDates, getAllCleanDates } from "@/lib/clean-dates";

interface Customer {
  id: string; name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; stories: string; panels: string; status: string;
  subscribed_at: string; cancelled_at?: string; notes?: string;
  stripe_subscription_id: string;
}

interface JobNote {
  id: string; scheduled_date: string; completed_date?: string;
  status: string; notes?: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobNote[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then(({ customer: c, jobs: j }) => {
        setCustomer(c);
        setNotes(c?.notes || "");
        setJobs(j || []);
      });
  }, [id]);

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!customer) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const nextDates = getNextCleanDates(new Date(customer.subscribed_at), customer.plan, 4);
  const pastDates = getAllCleanDates(new Date(customer.subscribed_at), customer.plan);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${customer.street}, ${customer.suburb} ${customer.postcode} ${customer.state}`)}`;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <a href="/admin/customers" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>← Customers</a>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="display" style={{ fontSize: "32px", marginBottom: "4px" }}>{customer.name || "Unknown"}</h1>
          <span style={{ fontSize: "12px", fontWeight: 600, color: customer.status === "active" ? "#4ade80" : "#f87171", textTransform: "capitalize" }}>{customer.status}</span>
        </div>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: "14px" }}>
          Open in Google Maps →
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Details */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
          <p className="label" style={{ marginBottom: "16px" }}>Details</p>
          {[
            ["Email", customer.email],
            ["Phone", customer.phone],
            ["Address", `${customer.street}, ${customer.suburb} ${customer.postcode}, ${customer.state}`],
            ["Plan", planLabel[customer.plan] || customer.plan],
            ["Home", `${customer.stories} storey`],
            ["Panels", customer.panels],
            ["Subscribed", new Date(customer.subscribed_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value || "—"}</span>
            </div>
          ))}
        </div>

        {/* Next cleans */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
          <p className="label" style={{ marginBottom: "16px" }}>Upcoming Cleans</p>
          {nextDates.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)" }}>Clean {i + 1}</span>
              <span style={{ color: "var(--gold)", fontWeight: 600 }}>
                {d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <p className="label" style={{ marginBottom: "12px" }}>Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this customer — access issues, dogs, special instructions…"
          rows={4}
          style={{ width: "100%", background: "#0C1828", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "var(--body)", lineHeight: 1.6 }}
        />
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={saveNotes} disabled={saving} className="btn btn-gold" style={{ fontSize: "14px", padding: "10px 24px" }}>
            {saving ? "Saving…" : "Save Notes"}
          </button>
          {saved && <span style={{ fontSize: "13px", color: "#4ade80" }}>Saved ✓</span>}
        </div>
      </div>

      {/* Clean history */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
        <p className="label" style={{ marginBottom: "16px" }}>Clean History</p>
        {pastDates.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No past cleans yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pastDates.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  {d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span style={{ color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>Scheduled</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
