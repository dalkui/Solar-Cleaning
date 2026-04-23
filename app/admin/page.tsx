"use client";
import { useEffect, useState } from "react";

interface Customer {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscribed_at: string;
}

interface Job {
  customerName: string;
  address: string;
  plan: string;
  date: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/customers").then((r) => r.json()),
      fetch("/api/admin/jobs").then((r) => r.json()),
    ]).then(([c, j]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setJobs(Array.isArray(j) ? j : []);
      setLoading(false);
    });
  }, []);

  const active = customers.filter((c) => c.status === "active");
  const thisWeek = jobs.filter((j) => {
    const d = new Date(j.date);
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(now.getDate() + 7);
    return d >= now && d <= weekAhead;
  });

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  return (
    <div>
      <h1 className="display" style={{ fontSize: "32px", marginBottom: "32px" }}>Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "40px" }}>
        {[
          { label: "Active Subscribers", value: active.length },
          { label: "Cleans This Week", value: thisWeek.length },
          { label: "Total Customers", value: customers.length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>{stat.label}</p>
            <p className="display g-text" style={{ fontSize: "40px" }}>{stat.value}</p>
          </div>
        ))}
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
