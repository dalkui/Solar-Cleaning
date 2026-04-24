"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, ClipboardList, Sparkles, Flame, X as XIcon } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkeletonCard } from "@/components/shared/Skeleton";

interface Booking {
  id: string;
  scheduled_at: string;
  customers: { name: string; suburb: string; plan: string; panels: string };
  job_updates: any[];
  job_photos: any[];
}

type Filter = "all" | "week" | "month" | "last_month";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/worker/history")
      .then(r => r.json())
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = bookings.filter(b => new Date(b.scheduled_at) >= weekStart).length;
  const thisMonth = bookings.filter(b => new Date(b.scheduled_at) >= monthStart).length;

  // Calculate streak — consecutive days with at least 1 completion
  const completionDates = new Set<string>();
  bookings.forEach(b => completionDates.add(new Date(b.scheduled_at).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 30; i++) {
    const key = cursor.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    if (completionDates.has(key)) streak++;
    else if (streak > 0 || i > 0) break;
    cursor.setDate(cursor.getDate() - 1);
  }

  const filtered = bookings.filter(b => {
    const d = new Date(b.scheduled_at);
    if (filter === "week") return d >= weekStart;
    if (filter === "month") return d >= monthStart;
    if (filter === "last_month") return d >= lastMonthStart && d < monthStart;
    return true;
  });

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <CheckCircle size={22} color="#F5C518" />
        <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>History</h1>
      </div>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px" }}>Your completed cleans</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        <Card padding="14px">
          <Sparkles size={15} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{thisWeek}</p>
          <p style={{ fontSize: "10px", color: "#7A95B0", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>This Week</p>
        </Card>
        <Card padding="14px">
          <Clock size={15} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{thisMonth}</p>
          <p style={{ fontSize: "10px", color: "#7A95B0", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>This Month</p>
        </Card>
        <Card padding="14px">
          <CheckCircle size={15} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1 }} className="tabular-nums">{bookings.length}</p>
          <p style={{ fontSize: "10px", color: "#7A95B0", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>All Time</p>
        </Card>
      </div>

      {/* Streak */}
      {streak >= 2 && (
        <Card padding="12px 14px" style={{ marginBottom: "16px", background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Flame size={18} color="#fb923c" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#fb923c" }} className="tabular-nums">{streak}-day streak</p>
              <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "1px" }}>Keep it going</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", overflowX: "auto", paddingBottom: "2px" }}>
        {([
          ["all", "All time"],
          ["week", "This week"],
          ["month", "This month"],
          ["last_month", "Last month"],
        ] as [Filter, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className="portal-btn" style={{
            padding: "7px 14px",
            background: filter === v ? "rgba(245,197,24,0.15)" : "rgba(255,255,255,0.04)",
            color: filter === v ? "#F5C518" : "#7A95B0",
            border: `1px solid ${filter === v ? "rgba(245,197,24,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="40px 20px">
          <div style={{ textAlign: "center" }}>
            <ClipboardList size={40} color="#F5C518" style={{ marginBottom: "10px", opacity: 0.5 }} />
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#EFF4FF" }}>No completed cleans yet</p>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginTop: "4px" }}>Your first is coming up</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(b => {
            const c = b.customers;
            const isExpanded = expanded === b.id;
            const arr = (b.job_updates || []).find((u: any) => u.type === "arrived");
            const com = (b.job_updates || []).find((u: any) => u.type === "completed");
            const duration = arr && com ? Math.round((new Date(com.created_at).getTime() - new Date(arr.created_at).getTime()) / 60000) : null;
            const notes = (b.job_updates || []).filter((u: any) => u.type === "note" || u.type === "issue");
            const photos = b.job_photos || [];
            return (
              <Card key={b.id} accent="#4ade80" padding="0">
                <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 600 }} className="tabular-nums">{formatDate(b.scheduled_at)}</span>
                        <Badge tone="completed" label="Done" />
                      </div>
                      <p style={{ fontSize: "15px", fontWeight: 600, marginTop: "2px" }}>{c.name}</p>
                      <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>
                        {c.suburb} · {c.panels} panels · {planLabel[c.plan] || c.plan}
                        {duration !== null && <span style={{ marginLeft: "8px" }}>· {duration} min</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photo pile (collapsed view) */}
                {!isExpanded && photos.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", padding: "0 14px 12px", overflowX: "auto" }}>
                    {photos.slice(0, 6).map((p: any) => (
                      <button key={p.id} onClick={e => { e.stopPropagation(); setLightbox(p.url); }} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", display: "block" }} />
                      </button>
                    ))}
                    {photos.length > 6 && (
                      <div style={{ width: "48px", height: "48px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#7A95B0", fontWeight: 600 }}>+{photos.length - 6}</div>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    {arr && <p style={{ color: "#7A95B0" }}>Arrived: <span style={{ color: "#EFF4FF" }} className="tabular-nums">{formatTime(arr.created_at)}</span></p>}
                    {com && <p style={{ color: "#7A95B0" }}>Completed: <span style={{ color: "#EFF4FF" }} className="tabular-nums">{formatTime(com.created_at)}</span></p>}

                    {notes.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                        {notes.map((n: any) => (
                          <div key={n.id} style={{ background: n.type === "issue" ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.04)", padding: "8px 10px", borderRadius: "6px" }}>
                            <p style={{ fontSize: "10px", color: n.type === "issue" ? "#f87171" : "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px", fontWeight: 700 }}>{n.type}</p>
                            <p style={{ fontSize: "13px" }}>{n.note}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {photos.length > 0 && (
                      <div>
                        <p style={{ fontSize: "11px", color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "6px", marginBottom: "6px" }}>Photos ({photos.length})</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                          {photos.map((p: any) => (
                            <button key={p.id} onClick={() => setLightbox(p.url)} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px", display: "block" }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.15s ease-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "8px" }} />
          <button onClick={() => setLightbox(null)} aria-label="Close" style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top))", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#EFF4FF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
