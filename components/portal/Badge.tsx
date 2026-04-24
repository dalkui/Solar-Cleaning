import React from "react";

type Tone = "active" | "cancelling" | "past_due" | "scheduled" | "pending" | "in_progress" | "completed" | "info" | "projected";

const TONES: Record<Tone, { fg: string; bg: string }> = {
  active:      { fg: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  completed:   { fg: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  cancelling:  { fg: "#f87171", bg: "rgba(248,113,113,0.1)" },
  past_due:    { fg: "#f87171", bg: "rgba(248,113,113,0.1)" },
  scheduled:   { fg: "#F5C518", bg: "rgba(245,197,24,0.12)" },
  pending:     { fg: "#F5C518", bg: "rgba(245,197,24,0.12)" },
  in_progress: { fg: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  projected:   { fg: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  info:        { fg: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

export function Badge({ tone, label, icon }: { tone: Tone; label: string; icon?: React.ReactNode }) {
  const { fg, bg } = TONES[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 10px", borderRadius: "999px",
      background: bg, color: fg,
      fontSize: "11px", fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {icon}
      {label}
    </span>
  );
}
