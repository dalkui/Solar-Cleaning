"use client";
import { useEffect, useState } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  customers: {
    name: string; phone: string; email: string;
    street: string; suburb: string; state: string; postcode: string;
    plan: string; panels: string; stories: string;
    notes?: string;
  };
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const statusColor: Record<string, string> = { confirmed: "#F5C518", completed: "#4ade80", cancelled: "#f87171" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dateLabel(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}

export default function SchedulePage() {
  const [dayOffset, setDayOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + dayOffset);
  selectedDate.setHours(0, 0, 0, 0);

  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/bookings?from=${selectedDate.toISOString()}&to=${dayEnd.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setBookings(Array.isArray(d) ? d.filter((b: Booking) => b.status !== "cancelled") : []);
        setLoading(false);
      });
  }, [dayOffset]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1A", color: "#EFF4FF", fontFamily: "var(--body, sans-serif)" }}>
      {/* Header */}
      <div style={{ background: "#0C1828", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "600px", margin: "0 auto" }}>
          <button
            onClick={() => setDayOffset(d => d - 1)}
            style={{ background: "none", border: "none", color: "#7A95B0", fontSize: "22px", cursor: "pointer", padding: "4px 8px" }}
          >←</button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "18px", fontWeight: 700 }}>{dateLabel(selectedDate)}</p>
            <p style={{ fontSize: "13px", color: "#7A95B0" }}>
              {selectedDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            style={{ background: "none", border: "none", color: "#7A95B0", fontSize: "22px", cursor: "pointer", padding: "4px 8px" }}
          >→</button>
        </div>
        {dayOffset !== 0 && (
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <button onClick={() => setDayOffset(0)} style={{ background: "none", border: "none", color: "#F5C518", fontSize: "13px", cursor: "pointer" }}>
              Back to Today
            </button>
          </div>
        )}
      </div>

      {/* Jobs list */}
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 16px" }}>
        {loading ? (
          <p style={{ color: "#7A95B0", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>🌞</p>
            <p style={{ color: "#7A95B0", fontSize: "16px" }}>No jobs scheduled for this day.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {bookings.map((b, i) => {
              const c = b.customers;
              const isExpanded = expanded === b.id;
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${c.street}, ${c.suburb} ${c.postcode} ${c.state}`)}`;
              return (
                <div
                  key={b.id}
                  style={{
                    background: "#0F1E30",
                    border: `1px solid ${statusColor[b.status] ? statusColor[b.status] + "33" : "rgba(255,255,255,0.07)"}`,
                    borderLeft: `3px solid ${statusColor[b.status] || "#F5C518"}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  {/* Main row */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : b.id)}
                    style={{ padding: "16px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: statusColor[b.status] || "#F5C518" }}>
                          {formatTime(b.scheduled_at)}
                        </span>
                        <span style={{ fontSize: "12px", color: "#7A95B0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px" }}>
                          Job {i + 1}
                        </span>
                      </div>
                      <p style={{ fontSize: "18px", fontWeight: 700, marginBottom: "2px" }}>{c.name}</p>
                      <p style={{ fontSize: "14px", color: "#7A95B0" }}>{c.street}, {c.suburb}</p>
                    </div>
                    <span style={{ color: "#7A95B0", fontSize: "18px", marginLeft: "12px" }}>{isExpanded ? "↑" : "↓"}</span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {/* Quick stats */}
                      <div style={{ display: "flex", gap: "10px" }}>
                        {[
                          [`${c.panels} panels`, "☀️"],
                          [`${c.stories} storey`, "🏠"],
                          [planLabel[c.plan] || c.plan, "📋"],
                        ].map(([label, icon]) => (
                          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                            <p style={{ fontSize: "16px", marginBottom: "2px" }}>{icon}</p>
                            <p style={{ fontSize: "12px", color: "#7A95B0" }}>{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Address - tap to open maps */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "8px", padding: "12px 14px", textDecoration: "none", color: "#F5C518" }}
                      >
                        <span style={{ fontSize: "18px" }}>📍</span>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 600 }}>{c.street}</p>
                          <p style={{ fontSize: "13px", opacity: 0.8 }}>{c.suburb} {c.postcode}, {c.state}</p>
                        </div>
                        <span style={{ marginLeft: "auto", fontSize: "14px" }}>→</span>
                      </a>

                      {/* Phone */}
                      <a
                        href={`tel:${c.phone}`}
                        style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px 14px", textDecoration: "none", color: "#EFF4FF" }}
                      >
                        <span style={{ fontSize: "18px" }}>📞</span>
                        <span style={{ fontSize: "14px" }}>{c.phone}</span>
                      </a>

                      {/* Notes */}
                      {c.notes && (
                        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px 14px" }}>
                          <p style={{ fontSize: "11px", color: "#7A95B0", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Notes</p>
                          <p style={{ fontSize: "14px", lineHeight: 1.6 }}>{c.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
