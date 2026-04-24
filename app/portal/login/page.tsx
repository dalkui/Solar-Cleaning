"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sun, Mail, ArrowRight, Inbox } from "lucide-react";

function LoginInner() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }} className="portal-fade-in">
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <Sun size={26} color="#F5C518" strokeWidth={2.5} />
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#F5C518", letterSpacing: "-0.02em" }}>FluroSolar</h1>
        </div>
        <p style={{ fontSize: "13px", color: "#7A95B0" }}>Customer portal</p>
      </div>

      <div style={{ width: "100%", maxWidth: "380px", background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "28px" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(245,197,24,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <Inbox size={24} color="#F5C518" />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.01em" }}>Check your inbox</h2>
            <p style={{ fontSize: "14px", color: "#7A95B0", lineHeight: 1.5 }}>
              We sent a login link to <strong style={{ color: "#EFF4FF" }}>{email}</strong>. Tap the link in that email to log in.
            </p>
            <button onClick={() => { setSent(false); setEmail(""); }} className="portal-btn" style={{ marginTop: "16px", background: "transparent", border: "none", color: "#F5C518", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>Use a different email</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px", letterSpacing: "-0.01em" }}>Log in</h2>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px", lineHeight: 1.5 }}>Enter your email and we'll send you a one-tap login link. No password needed.</p>

            {errorParam === "expired" && (
              <p style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", marginBottom: "16px" }}>
                That login link has expired. Request a new one below.
              </p>
            )}

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Mail size={11} /> Email
            </label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="portal-focus" style={{ width: "100%", padding: "12px 14px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "15px", marginBottom: "16px" }} />
            <button type="submit" disabled={loading || !email} className="portal-btn" style={{ width: "100%", padding: "14px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", opacity: (loading || !email) ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {loading ? "Sending…" : <>Send login link <ArrowRight size={16} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PortalLogin() {
  return <Suspense><LoginInner /></Suspense>;
}
