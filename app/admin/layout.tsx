"use client";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Upcoming Jobs", href: "/admin/jobs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", flexShrink: 0, background: "var(--bg-alt)", borderRight: "1px solid var(--border)", padding: "32px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px 32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "4px" }}>FluroSolar</span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Admin</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--gold)" : "var(--text-sub)",
                  background: active ? "rgba(245,197,24,0.08)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div style={{ padding: "0 12px" }}>
          <button
            onClick={handleLogout}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", fontSize: "14px", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
