"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/worker/login";

  useEffect(() => {
    // Inject PWA meta tags dynamically (avoids Next.js metadata conflict with client component)
    const tags = [
      { rel: "manifest", href: "/manifest.json" },
    ];
    const metas = [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FluroSolar" },
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
    { label: "Today", href: "/worker", icon: "☀️" },
    { label: "Schedule", href: "/worker/schedule", icon: "📅" },
    { label: "Availability", href: "/worker/availability", icon: "⏰" },
    { label: "History", href: "/worker/history", icon: "✓" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08101C",
      color: "#EFF4FF",
      fontFamily: "var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif)",
      paddingBottom: isLogin ? 0 : "80px",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {children}
      </div>

      {!isLogin && (
        <nav style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#0C1828",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "env(safe-area-inset-bottom)",
          zIndex: 50,
        }}>
          <div style={{
            maxWidth: "480px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
          }}>
            {tabs.map(t => {
              const active = pathname === t.href;
              return (
                <a
                  key={t.href}
                  href={t.href}
                  style={{
                    padding: "12px 0 14px",
                    textAlign: "center",
                    textDecoration: "none",
                    color: active ? "#F5C518" : "#7A95B0",
                    fontSize: "12px",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "2px" }}>{t.icon}</div>
                  {t.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
