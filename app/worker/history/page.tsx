"use client";
import { useEffect, useState } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  customers: { name: string; suburb: string; plan: string; panels: string };
  job_updates: any[];
  job_photos: any[];
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

export default function WorkerHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/worker/history")
      .then(r => r.json())
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = bookings.filter(b => new Date(b.scheduled_at) >= weekStart).length;
  const thisMonth = bookings.filter(b => new Date(b.scheduled_at) >= monthStart).length;

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>History</h1>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px" }}>Completed jobs</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
        {[["This Week", thisWeek], ["This Month", thisMonth], ["All Time", bookings.length]].map(([label, value]) => (
          <div key={label as string} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontSize: "24px", fontWeight: 800, color: "#F5C518" }}>{value}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#7A95B0", textAlign: "center", paddingTop: "40px" }}>Loading…</p>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <p style={{ color: "#EFF4FF", fontSize: "15px" }}>No completed jobs yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {bookings.map(b => {
            const c = b.customers;
            const isExpanded = expanded === b.id;
            const arr = (b.job_updates || []).find((u: any) => u.type === "arrived");
            const com = (b.job_updates || []).find((u: any) => u.type === "completed");
            const duration = arr && com ? (new Date(com.created_at).getTime() - new Date(arr.created_at).getTime()) / 60000 : null;
            const notes = (b.job_updates || []).filter((u: any) => u.type === "note" || u.type === "issue");
            return (
              <div key={b.id} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #4ade80", borderRadius: "10px" }}>
                <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: 600 }}>✓ {formatDate(b.scheduled_at)}</p>
                      <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{c.name}</p>
                      <p style={{ fontSize: "12px", color: "#7A95B0" }}>{c.suburb} · {c.panels} panels · {planLabel[c.plan] || c.plan}</p>
                    </div>
                    <span style={{ color: "#7A95B0", fontSize: "14px" }}>{isExpanded ? "↑" : "↓"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    {arr && <p style={{ color: "#7A95B0" }}>Arrived: <span style={{ color: "#EFF4FF" }}>{formatTime(arr.created_at)}</span></p>}
                    {com && <p style={{ color: "#7A95B0" }}>Completed: <span style={{ color: "#EFF4FF" }}>{formatTime(com.created_at)}</span></p>}
                    {duration !== null && <p style={{ color: "#7A95B0" }}>Duration: <span style={{ color: "#EFF4FF" }}>{Math.round(duration)} min</span></p>}

                    {notes.length > 0 && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {notes.map((n: any) => (
                          <div key={n.id} style={{ background: n.type === "issue" ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.04)", padding: "8px 10px", borderRadius: "6px" }}>
                            <p style={{ fontSize: "10px", color: n.type === "issue" ? "#f87171" : "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{n.type}</p>
                            <p style={{ fontSize: "13px" }}>{n.note}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {b.job_photos && b.job_photos.length > 0 && (
                      <div>
                        <p style={{ fontSize: "11px", color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "6px", marginBottom: "6px" }}>Photos ({b.job_photos.length})</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                          {b.job_photos.map((p: any) => (
                            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                              <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px" }} />
                            </a>
                          ))}
                        </div>
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
  );
}
