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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

export default function CalendarPage() {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);

  const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const days = getMonthDays(year, month);

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 1).toISOString();

  useEffect(() => {
    fetch(`/api/admin/bookings?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setBookings(Array.isArray(d) ? d : []));
  }, [monthOffset]);

  const bookingsForDay = (date: Date) => {
    const dateStr = date.toLocaleDateString("en-CA");
    return bookings.filter((b) => b.scheduled_at.startsWith(dateStr));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="display" style={{ fontSize: "32px" }}>
          {MONTH_NAMES[month]} {year}
        </h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text)", cursor: "pointer" }}>←</button>
          <button onClick={() => setMonthOffset(0)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>Today</button>
          <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 16px", color: "var(--text)", cursor: "pointer" }}>→</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        {Object.entries(statusText).map(([status, color]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", padding: "8px 0", letterSpacing: "0.05em" }}>{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isToday = day.toDateString() === now.toDateString();
          const dayBookings = bookingsForDay(day);
          return (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${isToday ? "rgba(245,197,24,0.4)" : "var(--border)"}`,
                borderRadius: "8px",
                minHeight: "90px",
                padding: "6px",
              }}
            >
              <p style={{
                fontSize: "13px",
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "var(--gold)" : "var(--text-muted)",
                marginBottom: "4px",
                textAlign: "right",
              }}>
                {day.getDate()}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{
                      background: statusColors[b.status],
                      border: `1px solid ${statusBorder[b.status]}`,
                      borderRadius: "4px",
                      padding: "3px 6px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <p style={{ fontSize: "10px", fontWeight: 600, color: statusText[b.status], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {new Date(b.scheduled_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })} {b.customers?.name?.split(" ")[0]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking detail modal */}
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
