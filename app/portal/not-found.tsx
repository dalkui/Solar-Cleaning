"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sun } from "lucide-react";

export default function PortalNotFound() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/portal"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>
      <Sun size={40} color="#F5C518" style={{ marginBottom: "16px" }} />
      <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Page not found</h1>
      <p style={{ fontSize: "14px", color: "#7A95B0", marginBottom: "20px" }}>Taking you back to your portal…</p>
      <a href="/portal" style={{ color: "#F5C518", fontSize: "13px", textDecoration: "none", fontWeight: 600 }}>Go now →</a>
    </div>
  );
}
