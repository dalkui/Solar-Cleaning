import React from "react";

export function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "0 2px" }}>
      <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
        {children}
      </h3>
      {action}
    </div>
  );
}
