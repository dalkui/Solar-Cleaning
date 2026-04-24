"use client";
import { useEffect, useState } from "react";

interface DaySetting {
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_jobs: number;
  is_active: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<DaySetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/availability")
      .then((r) => r.json())
      .then((d) => setSettings(Array.isArray(d) ? d : []));
  }, []);

  const update = (dow: number, field: keyof DaySetting, value: any) => {
    setSettings((prev) => prev.map((s) => s.day_of_week === dow ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    background: "#0C1828",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "6px",
    padding: "8px 10px",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    width: "100px",
  };

  return (
    <div>
      <h1 className="display" style={{ fontSize: "32px", marginBottom: "8px" }}>Availability Settings</h1>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px" }}>Set which days you work, your hours, and how many jobs you can take per day.</p>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 80px 100px 100px 80px", gap: "0", padding: "12px 24px", borderBottom: "1px solid var(--border)" }}>
          {["Day", "Active", "Start", "End", "Max Jobs"].map((h) => (
            <span key={h} style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{h}</span>
          ))}
        </div>

        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const s = settings.find((x) => x.day_of_week === dow);
          if (!s) return null;
          return (
            <div key={dow} style={{ display: "grid", gridTemplateColumns: "140px 80px 100px 100px 80px", gap: "0", padding: "14px 24px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: s.is_active ? 600 : 400, color: s.is_active ? "var(--text)" : "var(--text-muted)" }}>{DAY_NAMES[dow]}</span>
              <input type="checkbox" checked={s.is_active} onChange={(e) => update(dow, "is_active", e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "#F5C518", cursor: "pointer" }} />
              <input type="time" value={s.start_time} onChange={(e) => update(dow, "start_time", e.target.value)} disabled={!s.is_active} style={{ ...inputStyle, opacity: s.is_active ? 1 : 0.4 }} />
              <input type="time" value={s.end_time} onChange={(e) => update(dow, "end_time", e.target.value)} disabled={!s.is_active} style={{ ...inputStyle, opacity: s.is_active ? 1 : 0.4 }} />
              <input type="number" min="1" max="10" value={s.max_jobs} onChange={(e) => update(dow, "max_jobs", parseInt(e.target.value))} disabled={!s.is_active} style={{ ...inputStyle, width: "60px", opacity: s.is_active ? 1 : 0.4 }} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-gold" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span style={{ fontSize: "13px", color: "#4ade80" }}>Saved ✓</span>}
      </div>
    </div>
  );
}
