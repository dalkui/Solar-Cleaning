"use client";
import { useEffect, useRef, useState } from "react";

interface Worker { id: string; name: string; color: string; }
interface JobUpdate { type: string; note?: string; created_at: string; }
interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  worker_id: string | null;
  customers: { name: string; suburb: string; phone: string };
  job_updates: JobUpdate[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

export default function LivePage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const r = await fetch("/api/admin/live");
    const d = await r.json();
    setWorkers(d.workers || []);
    setBookings(d.bookings || []);
    setUpdatedAt(d.updated_at);
    setLoading(false);
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 45000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });

  const statusOf = (b: Booking) => {
    if (b.status === "completed") return "completed";
    if (b.status === "in_progress") return "in_progress";
    return "not_started";
  };

  const totals = {
    total: bookings.length,
    notStarted: bookings.filter(b => statusOf(b) === "not_started").length,
    inProgress: bookings.filter(b => statusOf(b) === "in_progress").length,
    completed: bookings.filter(b => statusOf(b) === "completed").length,
  };

  const unassigned = bookings.filter(b => !b.worker_id);
  const workersWithJobs = workers.filter(w => bookings.some(b => b.worker_id === w.id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="display" style={{ fontSize: "28px" }}>Live View</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{dateStr}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })}` : ""}
          </span>
          <button onClick={load} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          ["Total", totals.total, "var(--text)"],
          ["Not Started", totals.notStarted, "#94a3b8"],
          ["In Progress", totals.inProgress, "#60a5fa"],
          ["Completed", totals.completed, "#4ade80"],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            <p style={{ fontSize: "28px", fontWeight: 800, color: color as string, marginTop: "4px" }}>{val}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : workersWithJobs.length === 0 && unassigned.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: "12px" }}>
          <p style={{ fontSize: "40px", marginBottom: "8px" }}>🌞</p>
          <p style={{ color: "var(--text-muted)" }}>No jobs scheduled today</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {workersWithJobs.map(w => {
            const jobs = bookings.filter(b => b.worker_id === w.id);
            const done = jobs.filter(b => statusOf(b) === "completed").length;
            return (
              <div key={w.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${w.color}`, borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: w.color }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 700 }}>{w.name}</h3>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{done}/{jobs.length} complete</span>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {jobs.map(b => {
                    const status = statusOf(b);
                    const arrived = b.job_updates.find(u => u.type === "arrived");
                    const completed = b.job_updates.find(u => u.type === "completed");
                    const issues = b.job_updates.filter(u => u.type === "issue");
                    const pillColor = status === "completed" ? "#4ade80" : status === "in_progress" ? "#60a5fa" : "#94a3b8";
                    const pillBg = status === "completed" ? "rgba(74,222,128,0.12)" : status === "in_progress" ? "rgba(96,165,250,0.12)" : "rgba(148,163,184,0.1)";
                    const pillLabel = status === "completed" ? `Completed ${completed ? "– " + formatTime(completed.created_at) : ""}` : status === "in_progress" ? `In Progress${arrived ? " – arrived " + formatTime(arrived.created_at) : ""}` : "Not Started";
                    return (
                      <div key={b.id} style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{formatTime(b.scheduled_at)}</span>
                            <span style={{ fontSize: "13px" }}>{b.customers.name}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{b.customers.suburb}</span>
                          </div>
                          {issues.length > 0 && (
                            <p style={{ fontSize: "12px", color: "#f87171", marginTop: "4px", paddingLeft: "8px", borderLeft: "2px solid #f87171" }}>🚩 {issues[issues.length - 1].note}</p>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: pillColor, background: pillBg, padding: "4px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                          {pillLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {unassigned.length > 0 && (
            <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#F5C518", marginBottom: "10px" }}>⚠️ Unassigned ({unassigned.length})</h3>
              {unassigned.map(b => (
                <div key={b.id} style={{ display: "flex", gap: "12px", padding: "6px 0", fontSize: "13px" }}>
                  <span style={{ fontWeight: 600 }}>{formatTime(b.scheduled_at)}</span>
                  <span>{b.customers.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{b.customers.suburb}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
