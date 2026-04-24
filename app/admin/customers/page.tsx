"use client";
import { useEffect, useState, useMemo } from "react";

interface Customer {
  id: string;
  name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; stories: string; panels: string; status: string;
  subscribed_at: string;
  auto_schedule?: boolean;
  payment_status?: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const statusColor: Record<string, string> = { active: "#4ade80", cancelled: "#f87171" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [autoFilter, setAutoFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => {
      if (q && ![c.name, c.email, c.phone, c.suburb, c.plan].some(v => v?.toLowerCase().includes(q))) return false;
      if (planFilter !== "all" && c.plan !== planFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "past_due" && c.payment_status !== "past_due") return false;
        if (statusFilter !== "past_due" && c.status !== statusFilter) return false;
      }
      if (autoFilter === "on" && !c.auto_schedule) return false;
      if (autoFilter === "off" && c.auto_schedule) return false;
      return true;
    });
  }, [customers, search, planFilter, statusFilter, autoFilter]);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Plan", "Status", "Payment", "Address", "Subscribed"];
    const rows = filtered.map(c => [
      c.name, c.email, c.phone, c.plan, c.status, c.payment_status || "active",
      `${c.street}, ${c.suburb} ${c.postcode} ${c.state}`,
      new Date(c.subscribed_at).toLocaleDateString("en-AU"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <h1 className="display" style={{ fontSize: "32px" }}>Customers</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={exportCSV} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search name, email, phone, suburb…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "220px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 14px", color: "var(--text)", fontSize: "14px" }}
        />
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", color: "var(--text)", fontSize: "13px" }}>
          <option value="all">All plans</option>
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="elite">Elite</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", color: "var(--text)", fontSize: "13px" }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="past_due">Past due</option>
        </select>
        <select value={autoFilter} onChange={e => setAutoFilter(e.target.value)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", color: "var(--text)", fontSize: "13px" }}>
          <option value="all">Auto-schedule: any</option>
          <option value="on">Auto-schedule: on</option>
          <option value="off">Auto-schedule: off</option>
        </select>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>{filtered.length} of {customers.length} customers</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(c => (
          <div key={c.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: "16px", alignItems: "center" }}>
            <a href={`/admin/customers/${c.id}`} style={{ textDecoration: "none", color: "var(--text)" }}>
              <p style={{ fontWeight: 600, marginBottom: "2px" }}>{c.name || "—"}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{c.email}</p>
            </a>
            <div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>{c.street}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{c.suburb} {c.postcode}</p>
            </div>
            <div>
              <p style={{ fontSize: "13px", marginBottom: "2px" }}>{planLabel[c.plan] || c.plan}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.stories} storey · {c.panels} panels</p>
              {c.auto_schedule === false && <p style={{ fontSize: "10px", color: "#f59e0b", marginTop: "2px" }}>Manual scheduling</p>}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {c.phone && (
                <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} title={c.phone} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "14px" }}>📞</a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} title={c.email} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: "14px" }}>✉️</a>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {c.payment_status === "past_due" && (
                <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: "999px", marginBottom: "4px" }}>PAYMENT</span>
              )}
              <span style={{ fontSize: "12px", fontWeight: 600, color: statusColor[c.status] || "var(--text-muted)", textTransform: "capitalize" }}>{c.status}</span>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {new Date(c.subscribed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>No customers match these filters.</p>
        )}
      </div>
    </div>
  );
}
