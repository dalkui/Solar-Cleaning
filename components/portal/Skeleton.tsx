import React from "react";

export function Skeleton({ width = "100%", height = 16, radius = 4, style }: {
  width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius: `${radius}px`,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)",
      backgroundSize: "200% 100%",
      animation: "skeleton 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div style={{
      background: "#0F1E30",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
      padding: "18px",
      height,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={18} />
      <Skeleton width="50%" height={12} />
    </div>
  );
}
