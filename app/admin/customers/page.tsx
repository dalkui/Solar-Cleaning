"use client";
import { useEffect, useState } from "react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  plan: string;
  stories: string;
  panels: string;
  status: string;
  subscribed_at: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const statusColor: Record<string, string> = { active: "#4ade80", cancelled: "#f87171" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = customers.filter((c) =>
    [c.name, c.email, c.suburb, c.plan].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="display" style={{ fontSize: "32px" }}>Customers</h1>
        <input
          placeholder="Search name, suburb, plan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 14px", color: "var(--text)", fontSize: "14px", outline: "none", width: "240px" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((c) => (
          <a
            key={c.id}
            href={`/admin/customers/${c.id}`}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "center", textDecoration: "none", color: "var(--text)", transition: "border-color 0.15s" }}
          >
            <div>
              <p style={{ fontWeight: 600, marginBottom: "2px" }}>{c.name || "—"}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{c.email}</p>
            </div>
            <div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>{c.street}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{c.suburb} {c.postcode}</p>
            </div>
            <div>
              <p style={{ fontSize: "13px", marginBottom: "2px" }}>{planLabel[c.plan] || c.plan} plan</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.stories} storey · {c.panels} panels</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: statusColor[c.status] || "var(--text-muted)", textTransform: "capitalize" }}>{c.status}</span>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {new Date(c.subscribed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </a>
        ))}

        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No customers found.</p>
        )}
      </div>
    </div>
  );
}
