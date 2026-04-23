"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";

export const InfiniteGrid = ({ children, transparent, backgroundImage }: { children?: React.ReactNode; transparent?: boolean; backgroundImage?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.4) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.4) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn("relative w-full overflow-hidden")}
      style={{ background: backgroundImage ? "transparent" : (transparent ? "transparent" : "#08101C") }}
    >
      {/* Photo background */}
      {backgroundImage && (
        <>
          <div className="absolute inset-0 z-0" style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />
          <div className="absolute inset-0 z-0" style={{
            background: "linear-gradient(135deg, rgba(4,10,28,0.96) 0%, rgba(5,12,32,0.88) 50%, rgba(6,14,36,0.80) 100%)",
          }} />
        </>
      )}
      {/* Base dim grid */}
      <div className="absolute inset-0 z-0" style={{ opacity: transparent ? 0.12 : 0.04 }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* Mouse-reveal bright grid */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ maskImage, WebkitMaskImage: maskImage, opacity: 0.45 }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* Glow orbs — solar themed */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute right-[-10%] top-[-15%] w-[45%] h-[45%] rounded-full blur-[120px]"
          style={{ background: "rgba(245,197,24,0.18)" }} />
        <div className="absolute right-[5%] top-[-5%] w-[20%] h-[20%] rounded-full blur-[90px]"
          style={{ background: "rgba(249,115,22,0.15)" }} />
        <div className="absolute left-[-10%] bottom-[-15%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{ background: "rgba(56,189,248,0.10)" }} />
      </div>

      {/* Page content sits on top */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const GridPattern = ({ offsetX, offsetY }: { offsetX: any; offsetY: any }) => {
  return (
    <svg className="w-full h-full" style={{ color: "#F5C518" }}>
      <defs>
        <motion.pattern
          id="solar-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#solar-grid)" />
    </svg>
  );
};
