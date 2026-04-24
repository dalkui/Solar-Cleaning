"use client";
import { useEffect, useState } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  customers: {
    name: string; phone: string; street: string; suburb: string; state: string; postcode: string;
    plan: string; panels: string; stories: string; notes?: string;
  };
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

function dateLabel(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = (target.getTime() - today.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" });
}

export default function WorkerSchedule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/worker/schedule")
      .then(r => r.json())
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  // Group by date
  const groups: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    const key = new Date(b.scheduled_at).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  const sortedDates = Object.keys(groups).sort();

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>Upcoming</h1>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Your next 14 days</p>

      {loading ? (
        <p style={{ color: "#7A95B0", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "60px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📅</div>
          <p style={{ color: "#EFF4FF", fontSize: "15px" }}>No upcoming jobs</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {sortedDates.map(dateKey => {
            const date = new Date(dateKey + "T00:00:00");
            return (
              <div key={dateKey}>
                <h3 style={{ fontSize: "12px", color: "#7A95B0", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                  {dateLabel(date)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {groups[dateKey].map(b => {
                    const c = b.customers;
                    const isExpanded = expanded === b.id;
                    return (
                      <div key={b.id} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #F5C518", borderRadius: "10px" }}>
                        <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#F5C518" }}>{formatTime(b.scheduled_at)}</span>
                              <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{c.name}</p>
                              <p style={{ fontSize: "12px", color: "#7A95B0" }}>{c.suburb}</p>
                            </div>
                            <span style={{ color: "#7A95B0", fontSize: "14px" }}>{isExpanded ? "↑" : "↓"}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", fontSize: "13px", color: "#7A95B0", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <p>{c.street}, {c.suburb} {c.postcode}</p>
                            <p>📞 {c.phone}</p>
                            <p>{c.panels} panels · {c.stories} · {planLabel[c.plan] || c.plan}</p>
                            {c.notes && <p style={{ marginTop: "6px" }}>{c.notes}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
