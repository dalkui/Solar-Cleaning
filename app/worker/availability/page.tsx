"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, Plus, X as XIcon, Calendar, Copy } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";
import { formatRangeLabel, rangeLength } from "@/lib/dateRange";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REASONS = ["Holiday", "Sick", "Personal", "Other"];

interface AvailabilityRow { day_of_week: number; is_active: boolean; start_time: string; end_time: string; }
interface UnavailableDate { id: string; date: string; end_date?: string | null; reason?: string; }

function timeStrToMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

export default function WorkerAvailability() {
  const toast = useToast();
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newReasonKey, setNewReasonKey] = useState("Holiday");
  const [newReasonCustom, setNewReasonCustom] = useState("");
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

  useEffect(() => {
    if (!didLoad.current || loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/worker/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: availability }),
      });
      toast("Saved");
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [availability]);

  const addDayOff = async () => {
    if (!newStart) return;
    const reason = newReasonKey === "Other" ? (newReasonCustom || "Other") : newReasonKey;
    const res = await fetch("/api/worker/unavailable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: newStart, end_date: newEnd || newStart, reason }),
    });
    if (res.ok) {
      toast("Time off added");
      setNewStart(""); setNewEnd(""); setNewReasonKey("Holiday"); setNewReasonCustom("");
      setShowAddModal(false);
      load();
    } else {
      toast("Couldn't add. Try again.", "error");
    }
  };

  const removeDayOff = async (id: string) => {
    await fetch(`/api/worker/unavailable?id=${id}`, { method: "DELETE" });
    toast("Time off removed");
    load();
  };

  const setAllWeekdays = () => {
    setAvailability(prev => prev.map(p => ({ ...p, is_active: p.day_of_week >= 1 && p.day_of_week <= 5, start_time: "08:00", end_time: "16:00" })));
    toast("Weekdays set to 8am–4pm");
  };

  const copyMondayToActive = () => {
    const mon = availability.find(a => a.day_of_week === 1);
    if (!mon || !mon.is_active) { toast("Set Monday first", "error"); return; }
    setAvailability(prev => prev.map(p => p.is_active ? { ...p, start_time: mon.start_time, end_time: mon.end_time } : p));
    toast("Copied Monday to all active days");
  };

  const totalHours = availability.reduce((sum, a) => {
    if (!a.is_active) return sum;
    return sum + (timeStrToMins(a.end_time) - timeStrToMins(a.start_time)) / 60;
  }, 0);

  const upcoming = unavailable
    .filter(u => {
      const end = u.end_date || u.date;
      return new Date(end + "T23:59:59") >= new Date(new Date().toDateString());
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (loading) {
    return (
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <SkeletonCard height={60} />
        <SkeletonCard height={280} />
        <SkeletonCard height={120} />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <Clock size={22} color="#F5C518" />
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>Availability</h1>
      </div>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Set when you're available for jobs</p>

      {/* Weekly hours */}
      <section style={{ marginBottom: "24px" }}>
        <SectionHeader action={
          <span style={{ fontSize: "11px", color: "#F5C518", fontWeight: 700 }} className="tabular-nums">{totalHours} hrs/week</span>
        }>Weekly Hours</SectionHeader>
        <Card padding="4px 0">
          {availability.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "68px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={a.is_active}
                  onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: e.target.checked } : p))}
                  style={{ width: "18px", height: "18px", accentColor: "#F5C518" }}
                />
                <span style={{ fontSize: "14px", fontWeight: a.is_active ? 600 : 400, color: a.is_active ? "#EFF4FF" : "#7A95B0" }}>{DAY_NAMES[a.day_of_week]}</span>
              </label>
              <input type="time" value={a.start_time} disabled={!a.is_active}
                onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, start_time: e.target.value } : p))}
                className="portal-focus"
                style={{ flex: 1, padding: "8px", background: "#08101C", color: a.is_active ? "#EFF4FF" : "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", opacity: a.is_active ? 1 : 0.4 }}
              />
              <span style={{ color: "#7A95B0", fontSize: "13px" }}>–</span>
              <input type="time" value={a.end_time} disabled={!a.is_active}
                onChange={e => setAvailability(prev => prev.map((p, idx) => idx === i ? { ...p, end_time: e.target.value } : p))}
                className="portal-focus"
                style={{ flex: 1, padding: "8px", background: "#08101C", color: a.is_active ? "#EFF4FF" : "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", opacity: a.is_active ? 1 : 0.4 }}
              />
            </div>
          ))}
        </Card>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
          <button onClick={setAllWeekdays} className="portal-btn" style={{ flex: 1, minWidth: "140px", padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Calendar size={12} /> Weekdays 8–4
          </button>
          <button onClick={copyMondayToActive} className="portal-btn" style={{ flex: 1, minWidth: "140px", padding: "8px 12px", background: "rgba(255,255,255,0.04)", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Copy size={12} /> Copy Monday to all
          </button>
        </div>
      </section>

      {/* Days off */}
      <section>
        <SectionHeader action={
          <button onClick={() => setShowAddModal(true)} className="portal-btn" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "rgba(245,197,24,0.1)", color: "#F5C518", border: "1px solid rgba(245,197,24,0.25)", borderRadius: "999px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
            <Plus size={11} /> Add time off
          </button>
        }>Time Off</SectionHeader>

        {upcoming.length === 0 ? (
          <Card padding="20px">
            <p style={{ fontSize: "13px", color: "#7A95B0", textAlign: "center" }}>No time off scheduled</p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {upcoming.map(u => {
              const days = rangeLength(u.date, u.end_date);
              return (
                <Card key={u.id} padding="12px 14px">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700 }}>{formatRangeLabel(u.date, u.end_date)}</p>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#F5C518", background: "rgba(245,197,24,0.12)", padding: "2px 8px", borderRadius: "999px" }}>{days} {days === 1 ? "day" : "days"}</span>
                      </div>
                      {u.reason && <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>{u.reason}</p>}
                    </div>
                    <button onClick={() => removeDayOff(u.id)} aria-label="Remove" className="portal-btn" style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <XIcon size={16} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Add modal */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
          <div onClick={e => e.stopPropagation()} className="portal-pop-in" style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(245,197,24,0.12)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={16} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Add time off</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>From</label>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>To</label>
                <input type="date" value={newEnd || newStart} onChange={e => setNewEnd(e.target.value)} min={newStart} className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px" }} />
              </div>
            </div>

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Reason</label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => setNewReasonKey(r)} className="portal-btn" style={{
                  flex: 1, minWidth: "70px", padding: "8px",
                  background: newReasonKey === r ? "rgba(245,197,24,0.15)" : "#08101C",
                  color: newReasonKey === r ? "#F5C518" : "#EFF4FF",
                  border: `1px solid ${newReasonKey === r ? "#F5C518" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                }}>{r}</button>
              ))}
            </div>
            {newReasonKey === "Other" && (
              <input type="text" value={newReasonCustom} onChange={e => setNewReasonCustom(e.target.value)} placeholder="Describe the reason" className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", marginBottom: "14px" }} />
            )}

            {newStart && (
              <p style={{ fontSize: "12px", color: "#7A95B0", marginBottom: "16px", marginTop: "6px" }}>
                Blocking <strong style={{ color: "#F5C518" }} className="tabular-nums">{rangeLength(newStart, newEnd || newStart)}</strong> {rangeLength(newStart, newEnd || newStart) === 1 ? "day" : "days"}
              </p>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowAddModal(false)} className="portal-btn" style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={addDayOff} disabled={!newStart} className="portal-btn" style={{ flex: 1, padding: "12px", background: newStart ? "#F5C518" : "rgba(245,197,24,0.2)", color: newStart ? "#08101C" : "#7A95B0", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: newStart ? "pointer" : "default" }}>Add time off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
