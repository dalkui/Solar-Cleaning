"use client";
import { useEffect, useState, useRef } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  worker_id: string | null;
  customers: {
    id?: string;
    name: string; phone: string; email: string;
    street: string; suburb: string; postcode: string;
    plan: string; stories: string; panels: string;
  };
  workers?: { id: string; name: string; color: string } | null;
}

interface Worker {
  id: string; name: string; color: string;
}

interface Availability {
  worker_id: string; day_of_week: number; is_active: boolean; start_time: string; end_time: string;
}

interface UnavailableDate {
  worker_id: string; date: string;
}

interface UnscheduledCustomer {
  id: string; name: string; suburb: string;
  plan: string; panels: string; stories: string;
}

const statusColors: Record<string, string> = {
  confirmed: "#F5C518",
  in_progress: "#60a5fa",
  completed: "#4ade80",
  cancelled: "#f87171",
  pending: "#94a3b8",
};

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const START_HOUR = 7;
const END_HOUR = 17;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
const ROW_HEIGHT = 90;

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

function getLeftPercent(scheduledAt: string): number {
  const d = new Date(scheduledAt);
  const mins = d.getHours() * 60 + d.getMinutes();
  return Math.max(0, Math.min(95, ((mins - START_HOUR * 60) / TOTAL_MINS) * 100));
}

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  return Math.max(0, Math.min(100, ((mins - START_HOUR * 60) / TOTAL_MINS) * 100));
}

function snapToTime(x: number, containerWidth: number, date: Date): string {
  const ratio = Math.max(0, Math.min(1, x / containerWidth));
  const snappedMins = Math.round((ratio * TOTAL_MINS) / 30) * 30;
  const totalMins = START_HOUR * 60 + snappedMins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

export default function CalendarPage() {
  const now = new Date();
  const [view, setView] = useState<"day" | "month">("day");
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledCustomer[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedDay = new Date(now);
  selectedDay.setDate(now.getDate() + dayOffset);
  selectedDay.setHours(0, 0, 0, 0);

  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  const loadWorkers = async () => {
    const [wRes, aRes, uRes] = await Promise.all([
      fetch("/api/admin/workers").then(r => r.json()),
      fetch("/api/admin/workers").then(r => r.json()).then(async (workerList) => {
        const all: Availability[] = [];
        await Promise.all((workerList || []).filter((w: any) => w.status === "active").map(async (w: any) => {
          const r = await fetch(`/api/admin/workers/${w.id}/availability`).then(r => r.json());
          (r || []).forEach((a: any) => all.push(a));
        }));
        return all;
      }),
      fetch("/api/admin/workers").then(r => r.json()).then(async (workerList) => {
        const all: UnavailableDate[] = [];
        await Promise.all((workerList || []).filter((w: any) => w.status === "active").map(async (w: any) => {
          const r = await fetch(`/api/admin/workers/${w.id}/unavailable`).then(r => r.json());
          (r || []).forEach((u: any) => all.push(u));
        }));
        return all;
      }),
    ]);
    setWorkers((wRes || []).filter((w: any) => w.status === "active"));
    setAvailability(aRes);
    setUnavailableDates(uRes);
  };

  const loadBookings = () => {
    if (view === "day") {
      const from = new Date(selectedDay);
      const to = new Date(selectedDay); to.setHours(23, 59, 59, 999);
      fetch(`/api/admin/bookings?from=${from.toISOString()}&to=${to.toISOString()}`)
        .then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []));
    } else {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 1);
      fetch(`/api/admin/bookings?from=${from.toISOString()}&to=${to.toISOString()}`)
        .then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []));
    }
    fetch("/api/admin/unscheduled").then(r => r.json()).then(d => setUnscheduled(Array.isArray(d) ? d : []));
  };

  useEffect(() => { loadWorkers(); }, []);
  useEffect(() => { loadBookings(); }, [view, dayOffset, monthOffset]);

  const reassign = async (bookingId: string, workerId: string | null, newTime?: string) => {
    const body: any = { worker_id: workerId };
    if (newTime) body.scheduled_at = newTime;
    await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    loadBookings();
  };

  const handleDropToRow = async (e: React.DragEvent, workerId: string | null) => {
    e.preventDefault();
    setDragOverRow(null);
    const rowEl = rowRefs.current[workerId || "unassigned"];
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = snapToTime(x, rect.width, selectedDay);

    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");

    if (type === "booking") {
      await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId, scheduled_at: newTime }),
      });
    } else if (type === "unscheduled") {
      await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, scheduled_at: newTime, worker_id: workerId }),
      });
    }
    loadBookings();
  };

  const dayLabel = () => {
    if (dayOffset === 0) return "Today";
    if (dayOffset === 1) return "Tomorrow";
    if (dayOffset === -1) return "Yesterday";
    return selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Get availability overlay for a worker on the selected day
  const getAvailabilityOverlay = (workerId: string) => {
    const dow = selectedDay.getDay();
    const dateStr = selectedDay.toLocaleDateString("en-CA");
    const isOff = unavailableDates.some(u => u.worker_id === workerId && u.date === dateStr);
    if (isOff) return { type: "off" as const };
    const avail = availability.find(a => a.worker_id === workerId && a.day_of_week === dow);
    if (!avail || !avail.is_active) return { type: "unavailable" as const };
    return { type: "available" as const, start: timeToPercent(avail.start_time), end: timeToPercent(avail.end_time) };
  };

  // Render a swim lane row
  const renderLane = (workerId: string | null, workerName: string, workerColor: string) => {
    const rowBookings = bookings.filter(b => (workerId ? b.worker_id === workerId : !b.worker_id));
    const overlay = workerId ? getAvailabilityOverlay(workerId) : { type: "available" as const, start: 0, end: 100 };
    const isDragOver = dragOverRow === (workerId || "unassigned");

    return (
      <div key={workerId || "unassigned"} style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {/* Worker label */}
        <div style={{ width: "140px", flexShrink: 0, padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", borderRight: "1px solid var(--border)", background: "var(--bg-alt)" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: workerColor }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: workerId ? "var(--text)" : "var(--text-muted)" }}>{workerName}</span>
        </div>

        {/* Timeline row */}
        <div
          ref={el => { rowRefs.current[workerId || "unassigned"] = el; }}
          onDragOver={e => { e.preventDefault(); setDragOverRow(workerId || "unassigned"); }}
          onDragLeave={() => setDragOverRow(null)}
          onDrop={e => handleDropToRow(e, workerId)}
          style={{
            flex: 1,
            position: "relative",
            minHeight: `${ROW_HEIGHT}px`,
            background: isDragOver ? "rgba(245,197,24,0.04)" : "transparent",
            transition: "background 0.15s",
          }}
        >
          {/* Unavailable/day-off overlay */}
          {overlay.type === "off" && (
            <div style={{
              position: "absolute", inset: 0,
              background: "repeating-linear-gradient(45deg, rgba(248,113,113,0.05), rgba(248,113,113,0.05) 10px, rgba(248,113,113,0.1) 10px, rgba(248,113,113,0.1) 20px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Day Off</span>
            </div>
          )}
          {overlay.type === "unavailable" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", pointerEvents: "none" }} />
          )}
          {overlay.type === "available" && (
            <>
              {overlay.start > 0 && (
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${overlay.start}%`, background: "rgba(0,0,0,0.25)", pointerEvents: "none" }} />
              )}
              {overlay.end < 100 && (
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${100 - overlay.end}%`, background: "rgba(0,0,0,0.25)", pointerEvents: "none" }} />
              )}
            </>
          )}

          {/* Hour grid lines */}
          {hours.map((h, i) => (
            <div key={h} style={{
              position: "absolute",
              left: `${(i / (hours.length - 1)) * 100}%`,
              top: 0, bottom: 0,
              borderLeft: "1px solid rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }} />
          ))}

          {/* Job cards */}
          {rowBookings.map(b => {
            const color = b.workers?.color || statusColors[b.status] || "#F5C518";
            const statusBorder = statusColors[b.status] || color;
            return (
              <div
                key={b.id}
                draggable
                onDragStart={e => { e.dataTransfer.setData("type", "booking"); e.dataTransfer.setData("id", b.id); }}
                onClick={() => setSelected(b)}
                style={{
                  position: "absolute",
                  left: `${getLeftPercent(b.scheduled_at)}%`,
                  top: "8px",
                  width: "140px",
                  background: `${color}22`,
                  border: `1px solid ${color}`,
                  borderLeft: `3px solid ${statusBorder}`,
                  borderRadius: "6px",
                  padding: "6px 8px",
                  cursor: "grab",
                  zIndex: 2,
                  userSelect: "none",
                }}
              >
                <p style={{ fontSize: "10px", fontWeight: 700, color, marginBottom: "2px" }}>{formatTime(b.scheduled_at)}</p>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.name?.split(" ")[0]}</p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.suburb}</p>
              </div>
            );
          })}

          {/* Empty lane hint */}
          {rowBookings.length === 0 && !isDragOver && (
            <p style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", color: "rgba(122,149,176,0.3)", fontSize: "11px", pointerEvents: "none" }}>
              Drop jobs here
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="display" style={{ fontSize: "28px" }}>
            {view === "day" ? dayLabel() : `${MONTH_NAMES[month]} ${year}`}
          </h1>
          {view === "day" && (
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              {selectedDay.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {(["day", "month"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", background: view === v ? "rgba(245,197,24,0.15)" : "transparent", color: view === v ? "var(--gold)" : "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: view === v ? 700 : 400 }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => view === "day" ? setDayOffset(d => d - 1) : setMonthOffset(m => m - 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer" }}>←</button>
          <button onClick={() => { setDayOffset(0); setMonthOffset(0); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>Today</button>
          <button onClick={() => view === "day" ? setDayOffset(d => d + 1) : setMonthOffset(m => m + 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer" }}>→</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
        {[["Confirmed", "#F5C518"], ["In Progress", "#60a5fa"], ["Completed", "#4ade80"]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
            {label}
          </div>
        ))}
      </div>

      {view === "day" && (
        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* Swim lanes */}
          <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Hour header */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: "140px", flexShrink: 0, padding: "10px 14px", background: "var(--bg-alt)", borderRight: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Worker</span>
              </div>
              <div style={{ flex: 1, position: "relative", padding: "10px 0" }}>
                {hours.map((h, i) => (
                  <span key={h} style={{
                    position: "absolute",
                    left: `${(i / (hours.length - 1)) * 100}%`,
                    top: "10px",
                    transform: "translateX(4px)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}>
                    {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                  </span>
                ))}
              </div>
            </div>

            {/* Unassigned lane */}
            {renderLane(null, "Unassigned", "#94a3b8")}

            {/* Worker lanes */}
            {workers.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", marginBottom: "8px" }}>No workers yet</p>
                <a href="/admin/workers" className="btn btn-gold" style={{ fontSize: "13px" }}>Add Workers</a>
              </div>
            ) : (
              workers.map(w => renderLane(w.id, w.name, w.color))
            )}
          </div>

          {/* Unscheduled panel */}
          <div style={{ width: "220px", flexShrink: 0 }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
              Unscheduled ({unscheduled.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "600px", overflowY: "auto" }}>
              {unscheduled.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>All scheduled ✓</p>
              ) : (
                unscheduled.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("type", "unscheduled"); e.dataTransfer.setData("id", c.id); }}
                    style={{ background: "var(--bg-card)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 12px", cursor: "grab", userSelect: "none" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{c.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.suburb}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{planLabel[c.plan]} · {c.panels} panels</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {view === "month" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", padding: "8px 0", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {getMonthDays(year, month).map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const isToday = day.toDateString() === now.toDateString();
              const dateStr = day.toLocaleDateString("en-CA");
              const dayBookings = bookings.filter(b => b.scheduled_at.startsWith(dateStr));
              const byWorker: Record<string, { color: string; count: number }> = {};
              dayBookings.forEach(b => {
                const key = b.worker_id || "unassigned";
                const color = b.workers?.color || "#94a3b8";
                if (!byWorker[key]) byWorker[key] = { color, count: 0 };
                byWorker[key].count++;
              });
              return (
                <div
                  key={i}
                  onClick={() => { setView("day"); setDayOffset(Math.round((day.getTime() - now.setHours(0,0,0,0)) / 86400000)); }}
                  style={{ background: "var(--bg-card)", border: `1px solid ${isToday ? "rgba(245,197,24,0.4)" : "var(--border)"}`, borderRadius: "8px", minHeight: "90px", padding: "8px", cursor: "pointer" }}
                >
                  <p style={{ fontSize: "13px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--gold)" : "var(--text-muted)", textAlign: "right", marginBottom: "6px" }}>{day.getDate()}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                    {Object.entries(byWorker).map(([key, { color, count }]) => (
                      Array.from({ length: count }).map((_, j) => (
                        <div key={`${key}-${j}`} style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                      ))
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setSelected(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", maxWidth: "480px", width: "90%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{selected.customers?.name}</h3>
                <span style={{ fontSize: "12px", fontWeight: 600, color: statusColors[selected.status], textTransform: "capitalize" }}>{selected.status.replace("_", " ")}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>

            {[
              ["Time", formatTime(selected.scheduled_at)],
              ["Phone", selected.customers?.phone],
              ["Address", `${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`],
              ["Plan", planLabel[selected.customers?.plan] || selected.customers?.plan],
              ["Storey", selected.customers?.stories],
              ["Panels", selected.customers?.panels],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>{value || "—"}</span>
              </div>
            ))}

            {/* Assign worker */}
            <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid var(--border)" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Assigned Worker</label>
              <select
                value={selected.worker_id || ""}
                onChange={e => {
                  const newWorkerId = e.target.value || null;
                  reassign(selected.id, newWorkerId);
                  setSelected({ ...selected, worker_id: newWorkerId });
                }}
                style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">— Unassigned —</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ flex: 1, fontSize: "13px", textAlign: "center" }}>
                Open in Maps →
              </a>
              {selected.customers?.id && (
                <a href={`/admin/customers/${selected.customers.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "var(--gold)", textDecoration: "none", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px" }}>
                  Full Profile →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
