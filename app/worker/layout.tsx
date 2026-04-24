"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sun, Calendar, Clock, CheckCircle } from "lucide-react";
import { ToastProvider } from "@/components/shared/Toast";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/worker/login";

  useEffect(() => {
    const tags = [{ rel: "manifest", href: "/manifest.json" }];
    const metas = [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FluroSolar Worker" },
      { name: "theme-color", content: "#08101C" },
    ];
    const added: HTMLElement[] = [];
    tags.forEach(t => {
      if (document.querySelector(`link[rel="${t.rel}"]`)) return;
      const link = document.createElement("link");
      link.rel = t.rel;
      link.href = t.href;
      document.head.appendChild(link);
      added.push(link);
    });
    metas.forEach(m => {
      if (document.querySelector(`meta[name="${m.name}"]`)) return;
      const meta = document.createElement("meta");
      meta.name = m.name;
      meta.content = m.content;
      document.head.appendChild(meta);
      added.push(meta);
    });
    return () => { added.forEach(el => el.remove()); };
  }, []);

  const tabs = [
    { label: "Today", href: "/worker", Icon: Sun },
    { label: "Schedule", href: "/worker/schedule", Icon: Calendar },
    { label: "Availability", href: "/worker/availability", Icon: Clock },
    { label: "History", href: "/worker/history", Icon: CheckCircle },
  ];

  return (
    <ToastProvider>
      <div style={{
        minHeight: "100vh",
        background: "#08101C",
        color: "#EFF4FF",
        fontFamily: "var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif)",
        paddingBottom: isLogin ? 0 : "calc(90px + env(safe-area-inset-bottom))",
      }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }} className="portal-fade-in" key={pathname}>
          {children}
        </div>

        {!isLogin && (
          <nav style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to bottom, rgba(12,24,40,0.96), rgba(12,24,40,1))",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingBottom: "env(safe-area-inset-bottom)",
            zIndex: 50,
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ maxWidth: "480px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              {tabs.map(t => {
                const active = pathname === t.href;
                return (
                  <a key={t.href} href={t.href} aria-label={t.label} style={{
                    padding: "10px 0 12px",
                    textAlign: "center",
                    textDecoration: "none",
                    color: active ? "#F5C518" : "#7A95B0",
                    fontSize: "11px",
                    fontWeight: active ? 700 : 500,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "3px",
                    position: "relative",
                    transition: "color 0.15s",
                  }}>
                    <span style={{
                      width: "3px", height: "3px",
                      borderRadius: "50%",
                      background: active ? "#F5C518" : "transparent",
                      marginBottom: "1px",
                    }} />
                    <t.Icon
                      size={22}
                      strokeWidth={active ? 2.25 : 1.75}
                      fill={active ? "rgba(245,197,24,0.15)" : "none"}
                    />
                    {t.label}
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </ToastProvider>
  );
}
