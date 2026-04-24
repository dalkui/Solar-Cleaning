"use client";
import { useEffect, useState, use } from "react";
import { planMonths } from "@/lib/clean-dates";
import { formatDateTime } from "@/lib/slots";

interface Customer {
  id: string; name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; stories: string; panels: string; status: string;
  subscribed_at: string; cancelled_at?: string; notes?: string;
  stripe_subscription_id: string;
}

interface Booking {
  id: string; scheduled_at: string | null; status: string; created_at: string; worker_id?: string | null; due_month?: string | null;
  workers?: { id: string; name: string; color: string } | null;
}

interface Worker { id: string; name: string; color: string; }
interface Availability { worker_id: string; day_of_week: number; is_active: boolean; start_time: string; end_time: string; }
interface UnavailableDate { worker_id: string; date: string; }

function timeStrToMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function buildSlots(start: string, end: string): string[] {
  const out: string[] = [];
  let mins = timeStrToMins(start);
  const endMins = timeStrToMins(end);
  while (mins < endMins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    mins += 30;
  }
  return out;
}

function formatTimeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hh}:${m.toString().padStart(2, "0")} ${period}`;
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

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableDate[]>([]);
  const [schDate, setSchDate] = useState("");
  const [schWorker, setSchWorker] = useState("");
  const [schTime, setSchTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const loadData = () => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then(({ customer: c, jobs: j }) => {
        setCustomer(c);
        setNotes(c?.notes || "");
        setBookings(j || []);
      });
  };

  const loadSchedulingData = () => {
    fetch("/api/admin/calendar").then(r => r.json()).then(d => {
      setWorkers(d.workers || []);
      setAvailability(d.availability || []);
      setUnavailable(d.unavailable_dates || []);
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

  const openSchedule = () => {
    loadSchedulingData();
    setScheduleOpen(true);
  };

  const pendingBooking = bookings.find(b => b.status === "pending");

  const availableWorkersForDate = (() => {
    if (!schDate) return workers;
    const d = new Date(schDate + "T00:00:00");
    const dow = d.getDay();
    const dateStr = schDate;
    return workers.filter(w => {
      if (unavailable.some(u => u.worker_id === w.id && u.date === dateStr)) return false;
      const a = availability.find(av => av.worker_id === w.id && av.day_of_week === dow);
      return a && a.is_active;
    });
  })();

  const availableSlotsForWorker = (() => {
    if (!schDate || !schWorker) return [];
    const d = new Date(schDate + "T00:00:00");
    const a = availability.find(av => av.worker_id === schWorker && av.day_of_week === d.getDay());
    if (!a || !a.is_active) return [];
    return buildSlots(a.start_time, a.end_time);
  })();

  const submitSchedule = async () => {
    if (!schDate || !schTime) return;
    setScheduling(true);
    const [h, m] = schTime.split(":").map(Number);
    const dt = new Date(schDate + "T00:00:00");
    dt.setHours(h, m, 0, 0);

    await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: id,
        scheduled_at: dt.toISOString(),
        worker_id: schWorker || null,
        pending_booking_id: pendingBooking?.id || null,
      }),
    });
    setScheduling(false);
    setScheduleOpen(false);
    setSchDate(""); setSchWorker(""); setSchTime("");
    loadData();
  };

  if (!customer) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${customer.street}, ${customer.suburb} ${customer.postcode} ${customer.state}`)}`;

  const confirmedBookings = bookings.filter((b) => (b.status === "confirmed" || b.status === "in_progress") && b.scheduled_at);
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Build forecast timeline dots
  interface ForecastDot {
    key: string;
    date: Date;
    type: "completed" | "scheduled" | "pending" | "projected";
    label: string;
    workerName?: string;
    bookingId?: string;
  }

  const dots: ForecastDot[] = [];
  const takenMonths = new Set<string>();
  const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  bookings.forEach(b => {
    if (b.status === "cancelled") return;
    if (b.status === "completed" && b.scheduled_at) {
      const d = new Date(b.scheduled_at);
      takenMonths.add(monthOf(d));
      dots.push({ key: b.id, date: d, type: "completed", label: d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }), workerName: b.workers?.name, bookingId: b.id });
    } else if ((b.status === "confirmed" || b.status === "in_progress") && b.scheduled_at) {
      const d = new Date(b.scheduled_at);
      takenMonths.add(monthOf(d));
      dots.push({ key: b.id, date: d, type: "scheduled", label: d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }), workerName: b.workers?.name, bookingId: b.id });
    } else if (b.status === "pending" && b.due_month) {
      const d = new Date(b.due_month + "T00:00:00");
      takenMonths.add(monthOf(d));
      dots.push({ key: b.id, date: d, type: "pending", label: `Due ${d.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`, bookingId: b.id });
    }
  });

  // Projected: extend from latest known booking by plan interval
  const latestBookingDate = dots.length > 0
    ? dots.reduce((max, d) => d.date > max ? d.date : max, dots[0].date)
    : new Date(customer.subscribed_at);
  const interval = planMonths(customer.plan);
  const cursor = new Date(latestBookingDate);
  cursor.setMonth(cursor.getMonth() + interval);
  while (dots.length < 8) {
    const key = monthOf(cursor);
    if (!takenMonths.has(key)) {
      dots.push({
        key: `proj-${key}`,
        date: new Date(cursor),
        type: "projected",
        label: cursor.toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
      });
      takenMonths.add(key);
    }
    cursor.setMonth(cursor.getMonth() + interval);
    if (dots.length > 50) break; // safety
  }

  dots.sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();
  const dotColor = (type: ForecastDot["type"]) => ({
    completed: "#4ade80",
    scheduled: "#F5C518",
    pending: "#94a3b8",
    projected: "transparent",
  }[type]);
  const dotBorder = (type: ForecastDot["type"]) => ({
    completed: "#4ade80",
    scheduled: "#F5C518",
    pending: "#94a3b8",
    projected: "rgba(255,255,255,0.2)",
  }[type]);

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
          <button
            onClick={openSchedule}
            disabled={customer.status !== "active"}
            className="btn btn-gold"
            style={{ fontSize: "14px", opacity: customer.status !== "active" ? 0.4 : 1 }}
          >
            Schedule Next Clean
          </button>
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
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "14px" }}>
            Open in Maps →
          </a>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
        <p className="label" style={{ marginBottom: "16px" }}>Details</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 32px" }}>
          {[
            ["Email", customer.email],
            ["Phone", customer.phone],
            ["Address", `${customer.street}, ${customer.suburb} ${customer.postcode}, ${customer.state}`],
            ["Plan", planLabel[customer.plan] || customer.plan],
            ["Home", `${customer.stories} storey`],
            ["Panels", customer.panels],
            ["Subscribed", new Date(customer.subscribed_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "6px 0" }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cleaning Forecast timeline */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <p className="label" style={{ marginBottom: "4px" }}>Cleaning Forecast</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Past cleans and projected future cleans based on {planLabel[customer.plan] || customer.plan} plan ({interval}-month interval)</p>
          </div>
          <div style={{ display: "flex", gap: "10px", fontSize: "11px", flexWrap: "wrap" }}>
            {[["Completed","#4ade80","solid"],["Scheduled","#F5C518","solid"],["Pending","#94a3b8","solid"],["Projected","transparent","outline"]].map(([label, color, kind]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color as string, border: kind === "outline" ? "1px dashed rgba(255,255,255,0.3)" : "none" }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative", overflowX: "auto", padding: "20px 0 10px" }}>
          {/* Connecting line */}
          <div style={{ position: "absolute", top: "42px", left: "20px", right: "20px", height: "2px", background: "rgba(255,255,255,0.07)" }} />

          <div style={{ display: "flex", gap: "0", position: "relative", minWidth: `${dots.length * 110}px` }}>
            {dots.map(dot => {
              const isFuture = dot.date > now;
              const isToday = dot.date.toDateString() === now.toDateString();
              return (
                <div
                  key={dot.key}
                  title={dot.type === "projected" ? "Projected from plan" : (dot.workerName ? `Worker: ${dot.workerName}` : "")}
                  style={{ flex: 1, minWidth: "110px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative" }}
                >
                  <p style={{ fontSize: "11px", color: isFuture ? "var(--text-muted)" : "var(--text)", fontWeight: 600, height: "14px" }}>
                    {dot.type === "pending" ? "Pending" : dot.type === "projected" ? "" : ""}
                  </p>
                  <div style={{
                    width: dot.type === "projected" ? "14px" : "18px",
                    height: dot.type === "projected" ? "14px" : "18px",
                    borderRadius: "50%",
                    background: dotColor(dot.type),
                    border: dot.type === "projected" ? `2px dashed ${dotBorder(dot.type)}` : `2px solid ${dotBorder(dot.type)}`,
                    boxShadow: isToday ? "0 0 0 4px rgba(245,197,24,0.2)" : "none",
                    zIndex: 2,
                    cursor: dot.bookingId ? "pointer" : "default",
                  }} />
                  <p style={{ fontSize: "11px", color: "var(--text)", fontWeight: 600, marginTop: "2px" }}>{dot.label}</p>
                  {dot.workerName && (
                    <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{dot.workerName}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today marker */}
          <div style={{ position: "absolute", top: "0", bottom: "0", left: `${(() => {
            // Find closest dot position to today
            let beforeIdx = -1;
            dots.forEach((d, i) => { if (d.date <= now) beforeIdx = i; });
            const pct = dots.length > 0 ? ((beforeIdx + 0.5) / dots.length) * 100 : 0;
            return Math.max(0, Math.min(100, pct));
          })()}%`, width: "1px", background: "rgba(245,197,24,0.3)", pointerEvents: "none" }}>
            <span style={{ position: "absolute", top: 0, left: "4px", fontSize: "9px", color: "var(--gold)", whiteSpace: "nowrap", fontWeight: 600 }}>Today</span>
          </div>
        </div>
      </div>

      {/* Confirmed bookings */}
      {confirmedBookings.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
          <p className="label" style={{ marginBottom: "16px" }}>Upcoming Bookings</p>
          {confirmedBookings.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <span style={{ color: statusColor[b.status], fontWeight: 600 }}>{b.scheduled_at ? formatDateTime(b.scheduled_at) : "—"}</span>
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

      {/* Schedule modal */}
      {scheduleOpen && (
        <div onClick={() => setScheduleOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", maxWidth: "460px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Schedule Next Clean</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Date</label>
                <input
                  type="date"
                  value={schDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setSchDate(e.target.value); setSchWorker(""); setSchTime(""); }}
                  style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
                />
              </div>

              {schDate && (
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Worker</label>
                  {availableWorkersForDate.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#f87171", padding: "10px", background: "rgba(248,113,113,0.08)", borderRadius: "8px" }}>No workers available on this date</p>
                  ) : (
                    <select
                      value={schWorker}
                      onChange={e => { setSchWorker(e.target.value); setSchTime(""); }}
                      style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
                    >
                      <option value="">Select worker…</option>
                      {availableWorkersForDate.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {schWorker && availableSlotsForWorker.length > 0 && (
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Time</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {availableSlotsForWorker.map(t => (
                      <button
                        key={t}
                        onClick={() => setSchTime(t)}
                        style={{
                          padding: "8px",
                          background: schTime === t ? "rgba(245,197,24,0.15)" : "var(--bg)",
                          color: schTime === t ? "var(--gold)" : "var(--text)",
                          border: `1px solid ${schTime === t ? "var(--gold)" : "var(--border)"}`,
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: schTime === t ? 700 : 500,
                        }}
                      >{formatTimeLabel(t)}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => setScheduleOpen(false)} style={{ flex: 1, padding: "12px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={submitSchedule}
                  disabled={!schDate || !schWorker || !schTime || scheduling}
                  className="btn btn-gold"
                  style={{ flex: 1, opacity: (!schDate || !schWorker || !schTime) ? 0.4 : 1 }}
                >{scheduling ? "Booking…" : "Confirm Booking"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean history */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
        <p className="label" style={{ marginBottom: "16px" }}>Clean History</p>
        {completedBookings.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No completed cleans yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completedBookings.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)" }}>{b.scheduled_at ? formatDateTime(b.scheduled_at) : "—"}</span>
                <span style={{ color: "#4ade80", fontSize: "12px", fontWeight: 600 }}>Completed ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
