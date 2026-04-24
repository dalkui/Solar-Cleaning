"use client";
import { useEffect, useState, use } from "react";
import { getNextCleanDates } from "@/lib/clean-dates";
import { formatDateTime } from "@/lib/slots";

interface Customer {
  id: string; name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; stories: string; panels: string; status: string;
  subscribed_at: string; cancelled_at?: string; notes?: string;
  stripe_subscription_id: string;
}

interface Booking {
  id: string; scheduled_at: string; status: string; created_at: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const statusColor: Record<string, string> = { confirmed: "#F5C518", completed: "#4ade80", cancelled: "#f87171", pending: "#94a3b8" };

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const loadData = () => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then(({ customer: c, jobs: j }) => {
        setCustomer(c);
        setNotes(c?.notes || "");
        setBookings(j || []);
      });
  };

  useEffect(() => { loadData(); }, [id]);

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

  const sendBookingLink = async () => {
    setSendingLink(true);
    await fetch("/api/admin/send-booking-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: id }),
    });
    setSendingLink(false);
    setLinkSent(true);
    setTimeout(() => setLinkSent(false), 3000);
  };

  const markComplete = async (bookingId: string) => {
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    loadData();
  };

  if (!customer) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const nextDates = getNextCleanDates(new Date(customer.subscribed_at), customer.plan, 4);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${customer.street}, ${customer.suburb} ${customer.postcode} ${customer.state}`)}`;

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const completedBookings = bookings.filter((b) => b.status === "completed");

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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={sendBookingLink}
              disabled={sendingLink || customer.status !== "active"}
              className="btn btn-outline"
              style={{ fontSize: "14px", opacity: customer.status !== "active" ? 0.4 : 1 }}
            >
              {sendingLink ? "Sending…" : "Send Booking Link"}
            </button>
            {linkSent && <span style={{ fontSize: "13px", color: "#4ade80" }}>Sent ✓</span>}
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: "14px" }}>
            Open in Maps →
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
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

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
          <p className="label" style={{ marginBottom: "16px" }}>Next Due Cleans</p>
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

      {/* Confirmed bookings */}
      {confirmedBookings.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
          <p className="label" style={{ marginBottom: "16px" }}>Upcoming Bookings</p>
          {confirmedBookings.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <span style={{ color: statusColor[b.status], fontWeight: 600 }}>{formatDateTime(b.scheduled_at)}</span>
                <span style={{ marginLeft: "10px", fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>{b.status}</span>
              </div>
              <button
                onClick={() => markComplete(b.id)}
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "6px", padding: "6px 12px", color: "#4ade80", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
              >
                Mark Complete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <p className="label" style={{ marginBottom: "12px" }}>Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Access issues, dogs, special instructions, roof type…"
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
        {completedBookings.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No completed cleans yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completedBookings.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)" }}>{formatDateTime(b.scheduled_at)}</span>
                <span style={{ color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>Completed ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
