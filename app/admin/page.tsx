"use client";
import { useEffect, useState } from "react";

interface Customer {
  id: string; name: string; plan: string; status: string; subscribed_at: string;
}

interface Job {
  customerName: string; address: string; plan: string; date: string;
}

interface WorkloadMonth {
  month: string;
  overdue: number; unscheduled: number; scheduled: number; completed: number; projected: number; total: number;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return MONTH_SHORT[parseInt(m, 10) - 1];
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workload, setWorkload] = useState<WorkloadMonth[]>([]);
  const [capacity, setCapacity] = useState<number>(0);
  const [overdue, setOverdue] = useState(0);
  const [dueSoon, setDueSoon] = useState(0);
  const [hoverMonth, setHoverMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/customers").then(r => r.json()),
      fetch("/api/admin/jobs").then(r => r.json()),
      fetch("/api/admin/workload").then(r => r.json()),
      fetch("/api/admin/overdue-count").then(r => r.json()),
    ]).then(([c, j, w, o]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setJobs(Array.isArray(j) ? j : []);
      setWorkload(w.months || []);
      setCapacity(w.capacity || 0);
      setOverdue(o.overdue || 0);
      setDueSoon(o.due_soon || 0);
      setLoading(false);
    });
  }, []);

  const active = customers.filter(c => c.status === "active");
  const thisWeek = jobs.filter(j => {
    const d = new Date(j.date);
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);
    return d >= now && d <= weekAhead;
  });

  const maxTotal = workload.reduce((m, x) => Math.max(m, x.total), 1);
  const currentMonthDemand = workload[0]?.total || 0;
  const capacityStatus = capacity === 0 ? "none" : currentMonthDemand > capacity ? "over" : currentMonthDemand > capacity * 0.9 ? "near" : "ok";

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  return (
    <div>
      <h1 className="display" style={{ fontSize: "32px", marginBottom: "24px" }}>Dashboard</h1>

      {/* Overdue banner */}
      {overdue > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#f87171" }}>{overdue} customer{overdue === 1 ? "" : "s"} overdue</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Haven't been cleaned on schedule</p>
            </div>
          </div>
          <a href="/admin/calendar?filter=overdue" style={{ padding: "8px 16px", background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            Book them now →
          </a>
        </div>
      )}

      {overdue === 0 && dueSoon > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "8px", marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", color: "#f59e0b" }}>
            ⏰ <strong>{dueSoon}</strong> customer{dueSoon === 1 ? " is" : "s are"} due this month — don't leave it to last minute
          </p>
          <a href="/admin/calendar?filter=this_month" style={{ fontSize: "12px", color: "#f59e0b", textDecoration: "underline" }}>View</a>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Active Subscribers", value: active.length },
          { label: "Cleans This Week", value: thisWeek.length },
          { label: "Total Customers", value: customers.length },
        ].map(stat => (
          <div key={stat.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>{stat.label}</p>
            <p className="display g-text" style={{ fontSize: "40px" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Workload Forecast */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Workload Forecast</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Next 12 months — scheduled, pending, and projected cleans</p>
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", flexWrap: "wrap" }}>
            {[["Overdue","#f87171"],["Unscheduled","#F5C518"],["Scheduled","#60a5fa"],["Completed","#4ade80"],["Projected","#64748b"]].map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "180px", paddingBottom: "28px", position: "relative" }}>
          {workload.map((m, i) => {
            const barHeight = Math.max(4, (m.total / maxTotal) * 140);
            const isHovered = hoverMonth === m.month;
            return (
              <div
                key={m.month}
                onMouseEnter={() => setHoverMonth(m.month)}
                onMouseLeave={() => setHoverMonth(null)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative", cursor: "pointer" }}
              >
                {/* Total count above bar */}
                <p style={{ fontSize: "11px", color: isHovered ? "var(--gold)" : "var(--text-muted)", fontWeight: 600 }}>{m.total || ""}</p>

                {/* Stacked bar */}
                <a
                  href={`/admin/calendar?month=${m.month}`}
                  style={{ width: "100%", maxWidth: "46px", height: `${barHeight}px`, display: "flex", flexDirection: "column-reverse", borderRadius: "4px", overflow: "hidden", border: isHovered ? "1px solid rgba(245,197,24,0.5)" : "1px solid transparent", transition: "border 0.1s", textDecoration: "none" }}
                >
                  {[
                    { count: m.overdue, color: "#f87171" },
                    { count: m.unscheduled, color: "#F5C518" },
                    { count: m.scheduled, color: "#60a5fa" },
                    { count: m.completed, color: "#4ade80" },
                    { count: m.projected, color: "#64748b" },
                  ].filter(s => s.count > 0).map((seg, j) => (
                    <div key={j} style={{ flex: seg.count, background: seg.color, minHeight: "2px" }} />
                  ))}
                </a>

                {/* Month label */}
                <p style={{ fontSize: "11px", color: "var(--text-muted)", position: "absolute", bottom: 0 }}>{monthLabel(m.month)}</p>

                {/* Tooltip */}
                {isHovered && m.total > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: "calc(100% + 4px)",
                    background: "#0C1828",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    color: "var(--text)",
                    lineHeight: 1.6,
                  }}>
                    <strong>{m.total} total</strong>
                    {m.overdue > 0 && <><br /><span style={{ color: "#f87171" }}>{m.overdue} overdue</span></>}
                    {m.unscheduled > 0 && <><br /><span style={{ color: "#F5C518" }}>{m.unscheduled} unscheduled</span></>}
                    {m.scheduled > 0 && <><br /><span style={{ color: "#60a5fa" }}>{m.scheduled} scheduled</span></>}
                    {m.completed > 0 && <><br /><span style={{ color: "#4ade80" }}>{m.completed} completed</span></>}
                    {m.projected > 0 && <><br /><span style={{ color: "#64748b" }}>{m.projected} projected</span></>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Capacity vs Demand */}
        <div style={{
          marginTop: "20px",
          padding: "12px 16px",
          background: capacityStatus === "over" ? "rgba(248,113,113,0.08)" : capacityStatus === "near" ? "rgba(245,158,11,0.08)" : "rgba(74,222,128,0.05)",
          border: `1px solid ${capacityStatus === "over" ? "rgba(248,113,113,0.3)" : capacityStatus === "near" ? "rgba(245,158,11,0.3)" : "rgba(74,222,128,0.2)"}`,
          borderRadius: "8px",
          fontSize: "13px",
          color: capacityStatus === "over" ? "#f87171" : capacityStatus === "near" ? "#f59e0b" : "#4ade80",
        }}>
          {capacity === 0 ? (
            <span style={{ color: "var(--text-muted)" }}>Set worker availability to calculate capacity</span>
          ) : (
            <>
              <strong>Capacity: {capacity} jobs/mo</strong> · Demand: {currentMonthDemand} jobs this month{" "}
              {capacityStatus === "ok" && "✓"}
              {capacityStatus === "near" && "— near limit"}
              {capacityStatus === "over" && "— over capacity, consider hiring"}
            </>
          )}
        </div>
      </div>

      {/* Upcoming cleans this week */}
      <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Cleans This Week</h2>
      {thisWeek.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No cleans scheduled this week.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {thisWeek.map((job, i) => (
            <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: "2px" }}>{job.customerName}</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{job.address}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "13px", color: "var(--gold)", fontWeight: 600 }}>{new Date(job.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{planLabel[job.plan]} plan</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
