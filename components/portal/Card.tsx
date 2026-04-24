import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: string;
  padding?: string;
  hover?: boolean;
}

export function Card({ children, accent, padding = "18px", hover, style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{
        background: "#0F1E30",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: accent ? `3px solid ${accent}` : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding,
        transition: "border-color 0.15s, transform 0.15s",
        ...(hover ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
