"use client";
import { usePathname } from "next/navigation";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/portal/login";

  const tabs = [
    { label: "Home", href: "/portal", icon: "🏠" },
    { label: "History", href: "/portal/history", icon: "✓" },
    { label: "Account", href: "/portal/account", icon: "⚙️" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#08101C",
      color: "#EFF4FF",
      fontFamily: "var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif)",
      paddingBottom: isLogin ? 0 : "80px",
    }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
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
          <div style={{ maxWidth: "560px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {tabs.map(t => {
              const active = pathname === t.href;
              return (
                <a key={t.href} href={t.href} style={{
                  padding: "12px 0 14px",
                  textAlign: "center",
                  textDecoration: "none",
                  color: active ? "#F5C518" : "#7A95B0",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                }}>
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
