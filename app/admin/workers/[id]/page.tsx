"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Availability { id?: string; day_of_week: number; is_active: boolean; start_time: string; end_time: string; }

export default function WorkerProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [resetPin, setResetPin] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/workers/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        // Build 7-day availability grid
        const full: Availability[] = [];
        for (let i = 0; i < 7; i++) {
          const existing = (d.availability || []).find((a: any) => a.day_of_week === i);
          full.push(existing || { day_of_week: i, is_active: false, start_time: "08:00", end_time: "16:00" });
        }
        setAvailability(full);
        setLoading(false);
      });
  };

  useEffect(() => { if (id) load(); }, [id]);

  const saveAvailability = async () => {
    await fetch(`/api/admin/workers/${id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: availability }),
    });
    alert("Availability saved");
  };

  const addUnavailable = async () => {
    if (!newDate) return;
    await fetch(`/api/admin/workers/${id}/unavailable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: newReason }),
    });
    setNewDate(""); setNewReason("");
    load();
  };

  const delUnavailable = async (dateId: string) => {
    await fetch(`/api/admin/workers/${id}/unavailable?date_id=${dateId}`, { method: "DELETE" });
    load();
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(resetPin)) return alert("PIN must be 4 digits");
    await fetch(`/api/admin/workers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: resetPin }),
    });
    setResetPin("");
    alert("PIN updated");
  };

  if (loading || !data) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const w = data.worker;

  return (
    <div>
      <a href="/admin/workers" style={{ color: "var(--text-muted)", fontSize: "13px", textDecoration: "none" }}>← All Workers</a>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "16px 0 28px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: w.color }} />
          <div>
            <h1 className="display" style={{ fontSize: "28px" }}>{w.name}</h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{w.phone || "—"} · {w.email || "no email"}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
        {[
          ["This Week", data.stats.this_week],
          ["This Month", data.stats.this_month],
          ["All Time", data.stats.total],
          ["Avg / Day", data.timesheet.length > 0 ? (data.stats.total / data.timesheet.length).toFixed(1) : "0"],
        ].map(([label, val]) => (
          <div key={label as string} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--gold)", marginTop: "4px" }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Reset PIN */}
      <section style={{ marginBottom: "32px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Reset PIN</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={resetPin}
            onChange={e => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="New 4-digit PIN"
            style={{ flex: 1, maxWidth: "200px", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
          />
          <button onClick={savePin} className="btn btn-gold" style={{ padding: "10px 20px", fontSize: "13px" }}>Update</button>
        </div>
      </section>

      {/* Availability */}
      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", letterSpacing: "0.02em" }}>Weekly Availability</h3>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {availability.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "90px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={a.is_active}
                  onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: e.target.checked } : p))}
                />
                <span style={{ fontSize: "13px" }}>{DAY_NAMES[a.day_of_week]}</span>
              </label>
              <input
                type="time"
                value={a.start_time}
                disabled={!a.is_active}
                onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, start_time: e.target.value } : p))}
                style={{ padding: "6px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", opacity: a.is_active ? 1 : 0.4 }}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>to</span>
              <input
                type="time"
                value={a.end_time}
                disabled={!a.is_active}
                onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, end_time: e.target.value } : p))}
                style={{ padding: "6px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", opacity: a.is_active ? 1 : 0.4 }}
              />
            </div>
          ))}
          <button onClick={saveAvailability} className="btn btn-gold" style={{ marginTop: "8px", alignSelf: "flex-start", fontSize: "13px" }}>Save Availability</button>
        </div>
      </section>

      {/* Unavailable dates */}
      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Days Off</h3>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ padding: "8px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px" }} />
            <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" style={{ flex: 1, padding: "8px 10px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px" }} />
            <button onClick={addUnavailable} className="btn btn-gold" style={{ fontSize: "13px" }}>Add</button>
          </div>
          {data.unavailable_dates.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No days off scheduled</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.unavailable_dates.map((d: any) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg)", borderRadius: "6px" }}>
                  <div>
                    <span style={{ fontSize: "13px" }}>{new Date(d.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    {d.reason && <span style={{ marginLeft: "10px", fontSize: "12px", color: "var(--text-muted)" }}>— {d.reason}</span>}
                  </div>
                  <button onClick={() => delUnavailable(d.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Timesheet */}
      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Timesheet (last 30 days)</h3>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          {data.timesheet.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px" }}>No arrived/completed timestamps yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(245,197,24,0.06)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Date</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Started</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Finished</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hours</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Jobs</th>
                </tr>
              </thead>
              <tbody>
                {data.timesheet.map((t: any) => (
                  <tr key={t.date} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px", fontSize: "13px" }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", color: "var(--text-muted)" }}>{t.first_arrived ? new Date(t.first_arrived).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" }) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", color: "var(--text-muted)" }}>{t.last_completed ? new Date(t.last_completed).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" }) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", textAlign: "right", fontWeight: 600 }}>{t.hours.toFixed(1)}h</td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", textAlign: "right" }}>{t.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Photos */}
      {data.photos.length > 0 && (
        <section style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Recent Photos</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
            {data.photos.map((p: any) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }} />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
