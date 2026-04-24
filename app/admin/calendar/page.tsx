"use client";
import { useEffect, useState } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  customers: {
    name: string;
    street: string;
    suburb: string;
    postcode: string;
    plan: string;
    stories: string;
    panels: string;
  };
}

const statusColors: Record<string, string> = {
  confirmed: "rgba(245,197,24,0.15)",
  completed: "rgba(74,222,128,0.15)",
  cancelled: "rgba(248,113,113,0.15)",
  pending: "rgba(148,163,184,0.1)",
};
const statusBorder: Record<string, string> = {
  confirmed: "rgba(245,197,24,0.5)",
  completed: "rgba(74,222,128,0.5)",
  cancelled: "rgba(248,113,113,0.5)",
  pending: "rgba(148,163,184,0.3)",
};
const statusText: Record<string, string> = {
  confirmed: "#F5C518",
  completed: "#4ade80",
  cancelled: "#f87171",
  pending: "#94a3b8",
};

function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);

  const days = getWeekDays(weekOffset);
  const from = days[0].toISOString();
  const to = new Date(days[6].getTime() + 86400000).toISOString();

  useEffect(() => {
    fetch(`/api/admin/bookings?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setBookings(Array.isArray(d) ? d : []));
  }, [weekOffset]);

  const bookingsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return bookings.filter((b) => b.scheduled_at.startsWith(dateStr));
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="display" style={{ fontSize: "32px" }}>Calendar</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text)", cursor: "pointer" }}>←</button>
          <span style={{ fontSize: "14px", color: "var(--text-muted)", minWidth: "160px", textAlign: "center" }}>
            {days[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {days[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text)", cursor: "pointer" }}>→</button>
          <button onClick={() => setWeekOffset(0)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>Today</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        {Object.entries(statusText).map(([status, color]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        ))}
      </div>

      {/* Week grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayBookings = bookingsForDay(day);
          return (
            <div key={i}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px" }}>{dayNames[i]}</p>
                <p style={{ fontSize: "18px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--gold)" : "var(--text)" }}>{day.getDate()}</p>
              </div>
              <div style={{ background: "var(--bg-card)", border: `1px solid ${isToday ? "rgba(245,197,24,0.3)" : "var(--border)"}`, borderRadius: "10px", minHeight: "120px", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {dayBookings.length === 0 ? (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "16px" }}>—</p>
                ) : (
                  dayBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      style={{
                        background: statusColors[b.status],
                        border: `1px solid ${statusBorder[b.status]}`,
                        borderRadius: "6px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <p style={{ fontSize: "11px", fontWeight: 600, color: statusText[b.status] }}>
                        {new Date(b.scheduled_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.customers?.name || "Unknown"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking detail panel */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setSelected(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px", maxWidth: "440px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{selected.customers?.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            {[
              ["Time", new Date(selected.scheduled_at).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true })],
              ["Address", `${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`],
              ["Plan", selected.customers?.plan],
              ["Storey", selected.customers?.stories],
              ["Panels", selected.customers?.panels],
              ["Status", selected.status],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "65%", color: label === "Status" ? statusText[selected.status] : "var(--text)" }}>{value}</span>
              </div>
            ))}
            <a href={`/admin/customers/${selected.id}`} style={{ display: "block", marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--gold)", textDecoration: "none" }}>View full profile →</a>
          </div>
        </div>
      )}
    </div>
  );
}
