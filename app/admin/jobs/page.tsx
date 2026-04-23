"use client";
import { useEffect, useState } from "react";

interface Job {
  customerId: string;
  customerName: string;
  address: string;
  plan: string;
  stories: string;
  panels: string;
  date: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/jobs")
      .then((r) => r.json())
      .then((data) => { setJobs(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const now = new Date().toISOString().split("T")[0];

  const upcoming = jobs.filter((j) => j.date >= now);
  const past = jobs.filter((j) => j.date < now);

  const renderJob = (job: Job) => (
    <a
      key={`${job.customerId}-${job.date}`}
      href={`/admin/customers/${job.customerId}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", display: "grid", gridTemplateColumns: "120px 1fr 1fr auto", gap: "16px", alignItems: "center", textDecoration: "none", color: "var(--text)" }}
    >
      <div>
        <p style={{ color: "var(--gold)", fontWeight: 600, fontSize: "14px" }}>
          {new Date(job.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {new Date(job.date).getFullYear()}
        </p>
      </div>
      <div>
        <p style={{ fontWeight: 600, marginBottom: "2px" }}>{job.customerName}</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{planLabel[job.plan]} plan</p>
      </div>
      <div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>{job.address}</p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{job.stories} storey · {job.panels} panels</p>
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>View →</div>
    </a>
  );

  return (
    <div>
      <h1 className="display" style={{ fontSize: "32px", marginBottom: "32px" }}>Upcoming Jobs</h1>

      {upcoming.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "40px" }}>No upcoming jobs scheduled.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "48px" }}>
          {upcoming.map(renderJob)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--text-muted)" }}>Past Jobs</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: 0.6 }}>
            {past.slice(-10).reverse().map(renderJob)}
          </div>
        </>
      )}
    </div>
  );
}
