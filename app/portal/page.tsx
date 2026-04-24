"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Customer { id: string; name: string; email: string; phone: string; plan: string; auto_schedule: boolean; payment_status?: string; }
interface Booking {
  id: string; scheduled_at: string | null; status: string; due_month?: string | null;
  workers?: { id: string; name: string; color: string } | null;
}
interface Message { id: string; subject?: string; body: string; purpose: string; channel: string; created_at: string; }

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });
}

export default function PortalHome() {
  const router = useRouter();
  const [data, setData] = useState<{ customer: Customer; bookings: Booking[]; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reschedOpen, setReschedOpen] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedNote, setReschedNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const load = async () => {
    const r = await fetch("/api/portal/me");
    if (r.status === 401) { router.push("/portal/login"); return; }
    const d = await r.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  };

  if (loading || !data) return <p style={{ padding: "40px", color: "#7A95B0" }}>Loading…</p>;

  const { customer, bookings, messages } = data;
  const nextBooking = bookings
    .filter(b => (b.status === "confirmed" || b.status === "in_progress") && b.scheduled_at && new Date(b.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  const pendingBooking = bookings.find(b => b.status === "pending" && !b.scheduled_at);

  const submitReschedule = async (bookingId: string) => {
    setSubmitting(true);
    await fetch("/api/portal/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, preferred_date: reschedDate, note: reschedNote }),
    });
    setSubmitting(false);
    setReschedOpen(null); setReschedDate(""); setReschedNote("");
    setConfirmation("Reschedule request sent. We'll get back to you within a day.");
    setTimeout(() => setConfirmation(""), 4000);
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this upcoming clean? We'll schedule a replacement for a later date.")) return;
    await fetch("/api/portal/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    load();
    setConfirmation("Booking cancelled.");
    setTimeout(() => setConfirmation(""), 4000);
  };

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "#7A95B0" }}>Hi</p>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>{customer.name || "there"}</h1>
        </div>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7A95B0", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>Sign Out</button>
      </div>

      {customer.payment_status === "past_due" && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", color: "#f87171", fontWeight: 700, marginBottom: "6px" }}>⚠️ Payment issue</p>
          <p style={{ fontSize: "13px", color: "#EFF4FF", lineHeight: 1.5 }}>Your last payment didn't go through. Update your card from the Account tab to keep your cleans running.</p>
        </div>
      )}

      {confirmation && (
        <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", color: "#4ade80", fontSize: "13px" }}>
          {confirmation}
        </div>
      )}

      {/* Next clean */}
      <section style={{ marginBottom: "22px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Next Clean</h3>
        {nextBooking ? (
          <div style={{ background: "#0F1E30", border: "1px solid rgba(245,197,24,0.3)", borderLeft: "4px solid #F5C518", borderRadius: "14px", padding: "20px" }}>
            <p style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>{formatDateTime(nextBooking.scheduled_at!)}</p>
            {nextBooking.workers && (
              <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "14px" }}>
                Your worker: <strong style={{ color: "#EFF4FF" }}>{nextBooking.workers.name}</strong>
              </p>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setReschedOpen(nextBooking.id)} style={{ flex: 1, padding: "12px", background: "rgba(245,197,24,0.1)", color: "#F5C518", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Reschedule
              </button>
              <button onClick={() => cancelBooking(nextBooking.id)} style={{ flex: 1, padding: "12px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : pendingBooking ? (
          <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
            <p style={{ fontSize: "14px", color: "#EFF4FF", fontWeight: 600, marginBottom: "4px" }}>Coming up soon</p>
            <p style={{ fontSize: "13px", color: "#7A95B0", lineHeight: 1.5 }}>
              Your next clean is due around <strong style={{ color: "#EFF4FF" }}>{pendingBooking.due_month ? new Date(pendingBooking.due_month + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : "soon"}</strong>.
              {customer.auto_schedule ? " We'll pick a time and let you know closer to the date." : " Watch for an email with a link to pick your time."}
            </p>
          </div>
        ) : (
          <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#7A95B0", fontSize: "14px" }}>No upcoming clean scheduled yet</p>
          </div>
        )}
      </section>

      {/* Reschedule modal */}
      {reschedOpen && (
        <div onClick={() => setReschedOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Request reschedule</h3>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "14px" }}>We'll get in touch to confirm a new time that suits you.</p>

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Preferred date (optional)</label>
            <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)} style={{ width: "100%", padding: "10px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", marginBottom: "14px" }} />

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Note (optional)</label>
            <textarea value={reschedNote} onChange={e => setReschedNote(e.target.value)} placeholder="e.g. I'd prefer mornings" rows={3} style={{ width: "100%", padding: "10px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", marginBottom: "16px" }} />

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setReschedOpen(null)} style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => submitReschedule(reschedOpen)} disabled={submitting} style={{ flex: 1, padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>{submitting ? "Sending…" : "Request"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <section style={{ marginBottom: "22px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Your plan</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "18px" }}>
          <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{planLabel[customer.plan] || customer.plan}</p>
          <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "14px" }}>
            {customer.auto_schedule ? "Cleans are scheduled automatically" : "You pick when we clean"}
          </p>
          <a href="/portal/account" style={{ fontSize: "13px", color: "#F5C518", textDecoration: "none" }}>
            Manage billing and preferences →
          </a>
        </div>
      </section>

      {/* Recent messages */}
      {messages.length > 0 && (
        <section>
          <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Recent notifications</h3>
          <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
            {messages.slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{m.subject || m.purpose}</span>
                  <span style={{ fontSize: "11px", color: "#7A95B0" }}>{new Date(m.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#7A95B0", lineHeight: 1.4 }}>{m.body.slice(0, 100)}{m.body.length > 100 ? "…" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
