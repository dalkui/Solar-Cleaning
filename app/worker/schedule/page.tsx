"use client";
import { useEffect, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, MapPin, Phone } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { SkeletonCard } from "@/components/shared/Skeleton";

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

  const groups: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    const key = new Date(b.scheduled_at).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  const sortedDates = Object.keys(groups).sort();

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <Calendar size={22} color="#F5C518" />
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>Upcoming</h1>
      </div>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Next 14 days</p>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "60px" }}>
          <Calendar size={40} color="#F5C518" style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ color: "#EFF4FF", fontSize: "15px", fontWeight: 600 }}>Your schedule is clear</p>
          <p style={{ color: "#7A95B0", fontSize: "13px", marginTop: "4px" }}>No jobs in the next 14 days</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {sortedDates.map(dateKey => {
            const date = new Date(dateKey + "T00:00:00");
            return (
              <div key={dateKey}>
                <h3 style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                  {dateLabel(date)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {groups[dateKey].map(b => {
                    const c = b.customers;
                    const isExpanded = expanded === b.id;
                    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${c.street}, ${c.suburb} ${c.postcode} ${c.state}`)}`;
                    return (
                      <Card key={b.id} accent="#F5C518" padding="0">
                        <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#F5C518" }} className="tabular-nums">{formatTime(b.scheduled_at)}</span>
                              <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{c.name}</p>
                              <p style={{ fontSize: "12px", color: "#7A95B0" }}>{c.suburb}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={14} color="#7A95B0" /> : <ChevronDown size={14} color="#7A95B0" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "8px", padding: "10px 12px", textDecoration: "none", color: "#F5C518", fontSize: "13px" }}>
                              <MapPin size={13} /> {c.street}, {c.suburb} {c.postcode}
                            </a>
                            <a href={`tel:${c.phone}`} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px", textDecoration: "none", color: "#EFF4FF", fontSize: "13px" }}>
                              <Phone size={13} /> {c.phone}
                            </a>
                            <p style={{ fontSize: "12px", color: "#7A95B0", padding: "0 4px" }}>{c.panels} panels · {c.stories} · {planLabel[c.plan] || c.plan}</p>
                            {c.notes && <p style={{ fontSize: "12px", color: "#EFF4FF", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", lineHeight: 1.5 }}>{c.notes}</p>}
                          </div>
                        )}
                      </Card>
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
