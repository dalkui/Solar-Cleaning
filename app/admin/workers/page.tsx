"use client";
import { useEffect, useState } from "react";

interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  pin: string;
  color: string;
  status: string;
  jobs_this_month: number;
  jobs_this_week: number;
}

const COLORS = ["#F5C518", "#60a5fa", "#4ade80", "#a78bfa", "#f87171", "#fb923c", "#2dd4bf", "#f472b6"];

const emptyForm = { name: "", phone: "", email: "", pin: "", color: "#F5C518" };

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/workers")
      .then(r => r.json())
      .then(d => { setWorkers(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setAdding(true); setEditing(null); setError(""); };
  const openEdit = (w: Worker) => { setForm({ name: w.name, phone: w.phone || "", email: w.email || "", pin: w.pin, color: w.color }); setEditing(w); setAdding(false); setError(""); };
  const close = () => { setAdding(false); setEditing(null); setForm(emptyForm); setError(""); };

  const save = async () => {
    setError("");
    if (!form.name.trim()) return setError("Name is required");
    if (!/^\d{4}$/.test(form.pin)) return setError("PIN must be exactly 4 digits");

    const body = JSON.stringify(form);
    const res = editing
      ? await fetch(`/api/admin/workers/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
      : await fetch("/api/admin/workers", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    const data = await res.json();
    if (!res.ok) return setError(data.error || "Failed to save");
    close();
    load();
  };

  const del = async (w: Worker) => {
    if (!confirm(`Remove ${w.name}? Their job history will be kept.`)) return;
    await fetch(`/api/admin/workers/${w.id}`, { method: "DELETE" });
    load();
  };

  const active = workers.filter(w => w.status === "active");
  const totalWeek = workers.reduce((s, w) => s + w.jobs_this_week, 0);
  const totalMonth = workers.reduce((s, w) => s + w.jobs_this_month, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="display" style={{ fontSize: "28px" }}>Workers</h1>
        <button onClick={openAdd} className="btn btn-gold">+ Add Worker</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[["Active Workers", active.length], ["Jobs This Week", totalWeek], ["Jobs This Month", totalMonth]].map(([label, value]) => (
          <div key={label as string} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            <p style={{ fontSize: "28px", fontWeight: 800, color: "var(--gold)", marginTop: "4px" }}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : workers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: "12px" }}>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "12px" }}>No workers yet</p>
          <button onClick={openAdd} className="btn btn-gold">Add Your First Worker</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {workers.map(w => (
            <div key={w.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${w.color}`, borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: w.color }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>{w.name}</h3>
                </div>
                {w.status === "inactive" && <span style={{ fontSize: "10px", color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: "999px" }}>Inactive</span>}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{w.phone || "No phone"}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>{w.email || "No email"}</p>
              <p style={{ fontSize: "13px", color: "var(--text)", marginBottom: "12px" }}>
                <strong>{w.jobs_this_month}</strong> <span style={{ color: "var(--text-muted)" }}>jobs this month</span>
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <a href={`/admin/workers/${w.id}`} style={{ flex: 1, textAlign: "center", padding: "8px", fontSize: "12px", color: "var(--gold)", textDecoration: "none", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "6px" }}>View</a>
                <button onClick={() => openEdit(w)} style={{ flex: 1, padding: "8px", fontSize: "12px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer" }}>Edit</button>
                <button onClick={() => del(w)} style={{ padding: "8px 12px", fontSize: "12px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", cursor: "pointer" }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {(adding || editing) && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>{editing ? "Edit Worker" : "Add Worker"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[["name", "Name"], ["phone", "Phone"], ["email", "Email (for notifications)"]].map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>PIN (4 digits)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPin ? "text" : "password"}
                    value={form.pin}
                    onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    style={{ width: "100%", padding: "10px 12px", paddingRight: "54px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", letterSpacing: "0.3em" }}
                  />
                  <button type="button" onClick={() => setShowPin(s => !s)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}>
                    {showPin ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Colour</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: c, border: form.color === c ? "3px solid #EFF4FF" : "2px solid transparent",
                      cursor: "pointer",
                    }} />
                  ))}
                </div>
              </div>
              {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button onClick={close} style={{ flex: 1, padding: "12px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                <button onClick={save} className="btn btn-gold" style={{ flex: 1 }}>{editing ? "Save" : "Add"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
