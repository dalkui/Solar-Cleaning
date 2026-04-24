"use client";
import { useEffect, useState, useRef } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  customers: {
    id?: string;
    name: string; phone: string; email: string;
    street: string; suburb: string; postcode: string;
    plan: string; stories: string; panels: string;
  };
}

interface UnscheduledCustomer {
  id: string; name: string; suburb: string;
  plan: string; panels: string; stories: string;
}

const statusColors: Record<string, string> = {
  confirmed: "rgba(245,197,24,0.2)",
  completed: "rgba(74,222,128,0.2)",
  cancelled: "rgba(248,113,113,0.2)",
  pending: "rgba(148,163,184,0.1)",
};
const statusBorder: Record<string, string> = {
  confirmed: "#F5C518",
  completed: "#4ade80",
  cancelled: "#f87171",
  pending: "#94a3b8",
};
const statusText: Record<string, string> = {
  confirmed: "#F5C518",
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
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function CalendarPage() {
  const now = new Date();
  const [view, setView] = useState<"day" | "month">("day");
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledCustomer[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const selectedDay = new Date(now);
  selectedDay.setDate(now.getDate() + dayOffset);
  selectedDay.setHours(0, 0, 0, 0);

  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

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

  useEffect(() => { loadBookings(); }, [view, dayOffset, monthOffset]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const newTime = snapToTime(x, rect.width, selectedDay);

    const type = e.dataTransfer.getData("type");
    if (type === "booking") {
      const bookingId = e.dataTransfer.getData("id");
      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: newTime }),
      });
    } else if (type === "unscheduled") {
      const customerId = e.dataTransfer.getData("id");
      await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, scheduled_at: newTime }),
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

  // Row assignments to prevent overlap
  const getRow = (() => {
    const rows: number[] = [];
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const left = getLeftPercent(b.scheduled_at);
      let row = 0;
      while (rows[row] !== undefined && rows[row] > left) row++;
      rows[row] = left + 16;
      map[b.id] = row;
    });
    return (id: string) => map[id] || 0;
  })();

  const maxRow = bookings.length > 0 ? Math.max(...bookings.map(b => getRow(b.id))) : 0;
  const timelineHeight = Math.max(120, (maxRow + 1) * 100 + 20);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
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
          {/* View toggle */}
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
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        {Object.entries(statusText).map(([s, color]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {/* ── DAY VIEW ── */}
      {view === "day" && (
        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* Timeline */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Hour headers */}
            <div style={{ display: "flex", marginLeft: "0", marginBottom: "4px" }}>
              {hours.map(h => (
                <div key={h} style={{ flex: 1, fontSize: "11px", color: "var(--text-muted)", textAlign: "left", paddingLeft: "4px" }}>
                  {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                </div>
              ))}
            </div>

            {/* Timeline drop zone */}
            <div
              ref={timelineRef}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                position: "relative",
                background: dragOver ? "rgba(245,197,24,0.04)" : "var(--bg-card)",
                border: `1px solid ${dragOver ? "rgba(245,197,24,0.3)" : "var(--border)"}`,
                borderRadius: "10px",
                minHeight: `${timelineHeight}px`,
                transition: "all 0.15s",
              }}
            >
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

              {/* Empty state */}
              {bookings.length === 0 && (
                <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px", pointerEvents: "none" }}>
                  Drag jobs here or no bookings for this day
                </p>
              )}

              {/* Job cards */}
              {bookings.map(b => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData("type", "booking"); e.dataTransfer.setData("id", b.id); }}
                  onClick={() => setSelected(b)}
                  style={{
                    position: "absolute",
                    left: `${getLeftPercent(b.scheduled_at)}%`,
                    top: `${getRow(b.id) * 100 + 8}px`,
                    width: "150px",
                    background: statusColors[b.status],
                    border: `1px solid ${statusBorder[b.status]}`,
                    borderLeft: `3px solid ${statusBorder[b.status]}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: "grab",
                    zIndex: 2,
                    userSelect: "none",
                  }}
                >
                  <p style={{ fontSize: "11px", fontWeight: 700, color: statusText[b.status], marginBottom: "2px" }}>{formatTime(b.scheduled_at)}</p>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.name?.split(" ")[0]}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.suburb}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{b.customers?.panels} panels</p>
                </div>
              ))}
            </div>

            {dragOver && (
              <p style={{ fontSize: "12px", color: "var(--gold)", marginTop: "8px", textAlign: "center" }}>
                Drop to schedule at this time
              </p>
            )}
          </div>

          {/* Unscheduled panel */}
          <div style={{ width: "220px", flexShrink: 0 }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
              Unscheduled ({unscheduled.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "600px", overflowY: "auto" }}>
              {unscheduled.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>All customers scheduled ✓</p>
              ) : (
                unscheduled.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("type", "unscheduled"); e.dataTransfer.setData("id", c.id); }}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      cursor: "grab",
                      userSelect: "none",
                    }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{c.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{c.suburb}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{planLabel[c.plan]} · {c.panels} panels</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
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
              return (
                <div
                  key={i}
                  onClick={() => { setView("day"); setDayOffset(Math.round((day.getTime() - now.setHours(0,0,0,0)) / 86400000)); }}
                  style={{ background: "var(--bg-card)", border: `1px solid ${isToday ? "rgba(245,197,24,0.4)" : "var(--border)"}`, borderRadius: "8px", minHeight: "90px", padding: "6px", cursor: "pointer" }}
                >
                  <p style={{ fontSize: "13px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--gold)" : "var(--text-muted)", textAlign: "right", marginBottom: "4px" }}>{day.getDate()}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {dayBookings.map(b => (
                      <div key={b.id} style={{ background: statusColors[b.status], border: `1px solid ${statusBorder[b.status]}`, borderRadius: "4px", padding: "3px 6px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 600, color: statusText[b.status], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {formatTime(b.scheduled_at)} {b.customers?.name?.split(" ")[0]}
                        </p>
                      </div>
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
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px", maxWidth: "440px", width: "90%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{selected.customers?.name}</h3>
                <span style={{ fontSize: "12px", fontWeight: 600, color: statusText[selected.status], textTransform: "capitalize" }}>{selected.status}</span>
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
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(`${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-gold"
                style={{ flex: 1, fontSize: "13px", textAlign: "center" }}
              >
                Open in Maps →
              </a>
              <a href={`/admin/customers/${selected.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "var(--gold)", textDecoration: "none", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px" }}>
                Full Profile →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
