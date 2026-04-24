"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type ToastType = "success" | "error";
interface ToastEntry { id: number; type: ToastType; message: string; }

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div style={{
        position: "fixed",
        bottom: "calc(90px + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "8px",
        zIndex: 1000,
        pointerEvents: "none",
        width: "calc(100% - 32px)",
        maxWidth: "400px",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px",
            background: t.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
            border: `1px solid ${t.type === "success" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
            color: t.type === "success" ? "#4ade80" : "#f87171",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
            animation: "toastIn 0.2s ease-out",
          }}>
            {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span style={{ color: "#EFF4FF", flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
