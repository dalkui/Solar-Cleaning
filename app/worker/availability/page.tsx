"use client";
import { useEffect, useRef, useState } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailabilityRow { day_of_week: number; is_active: boolean; start_time: string; end_time: string; }
interface UnavailableDate { id: string; date: string; reason?: string; }

export default function WorkerAvailability() {
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLoad = useRef(false);

  const load = async () => {
    const r = await fetch("/api/worker/availability");
    const d = await r.json();
    const full: AvailabilityRow[] = [];
    for (let i = 0; i < 7; i++) {
      const existing = (d.availability || []).find((a: any) => a.day_of_week === i);
      full.push(existing || { day_of_week: i, is_active: false, start_time: "08:00", end_time: "16:00" });
    }
    setAvailability(full);
    setUnavailable(d.unavailable_dates || []);
    setLoading(false);
    didLoad.current = true;
  };

  useEffect(() => { load(); }, []);

  // Debounced auto-save of weekly availability
  useEffect(() => {
    if (!didLoad.current || loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/worker/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: availability }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [availability]);

  const addDayOff = async () => {
    if (!newDate) return;
    await fetch("/api/worker/unavailable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: newReason }),
    });
    setNewDate(""); setNewReason("");
    load();
  };

  const removeDayOff = async (id: string) => {
    await fetch(`/api/worker/unavailable?id=${id}`, { method: "DELETE" });
    load();
  };

  const upcoming = unavailable.filter(u => new Date(u.date) >= new Date(new Date().toDateString()));

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Availability</h1>
        {saved && <span style={{ fontSize: "12px", color: "#4ade80" }}>Saved ✓</span>}
      </div>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Set when you're available for jobs</p>

      {loading ? (
        <p style={{ color: "#7A95B0", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
      ) : (
        <>
          {/* Weekly hours */}
          <section style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Weekly Hours</h3>
            <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "8px 0" }}>
              {availability.map((a, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "66px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={a.is_active}
                      onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: e.target.checked } : p))}
                      style={{ width: "18px", height: "18px", accentColor: "#F5C518" }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: a.is_active ? 600 : 400, color: a.is_active ? "#EFF4FF" : "#7A95B0" }}>{DAY_NAMES[a.day_of_week]}</span>
                  </label>
                  <input
                    type="time"
                    value={a.start_time}
                    disabled={!a.is_active}
                    onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, start_time: e.target.value } : p))}
                    style={{ flex: 1, padding: "8px", background: "#08101C", color: a.is_active ? "#EFF4FF" : "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "14px", opacity: a.is_active ? 1 : 0.4 }}
                  />
                  <span style={{ color: "#7A95B0", fontSize: "13px" }}>–</span>
                  <input
                    type="time"
                    value={a.end_time}
                    disabled={!a.is_active}
                    onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, end_time: e.target.value } : p))}
                    style={{ flex: 1, padding: "8px", background: "#08101C", color: a.is_active ? "#EFF4FF" : "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "14px", opacity: a.is_active ? 1 : 0.4 }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Days off */}
          <section>
            <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Days Off</h3>
            <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1, minWidth: "140px", padding: "10px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px" }} />
                <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" style={{ flex: 2, minWidth: "140px", padding: "10px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px" }} />
                <button onClick={addDayOff} disabled={!newDate} style={{ padding: "10px 16px", background: newDate ? "#F5C518" : "rgba(245,197,24,0.2)", color: newDate ? "#08101C" : "#7A95B0", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: newDate ? "pointer" : "default" }}>Add</button>
              </div>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#7A95B0", textAlign: "center", padding: "8px 0" }}>No days off scheduled</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {upcoming.map(u => (
                    <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#08101C", borderRadius: "8px" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600 }}>{new Date(u.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                        {u.reason && <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>{u.reason}</p>}
                      </div>
                      <button onClick={() => removeDayOff(u.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
