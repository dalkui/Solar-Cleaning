import React from "react";

export function WorkerAvatar({ name, color = "#F5C518", size = 36 }: { name?: string | null; color?: string; size?: number }) {
  const initials = (name || "?")
    .split(" ")
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: color,
      color: "#08101C",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: `${size * 0.4}px`,
      fontWeight: 800,
      flexShrink: 0,
      letterSpacing: "-0.01em",
    }}>
      {initials}
    </div>
  );
}
