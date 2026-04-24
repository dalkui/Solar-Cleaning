"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "34px", fontWeight: 800, color: "#F5C518", marginBottom: "6px" }}>FluroSolar</h1>
        <p style={{ fontSize: "14px", color: "#7A95B0" }}>Customer Portal</p>
      </div>

      <div style={{ width: "100%", maxWidth: "380px", background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "28px" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "38px", marginBottom: "12px" }}>📬</p>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Check your inbox</h2>
            <p style={{ fontSize: "14px", color: "#7A95B0", lineHeight: 1.5 }}>
              We sent a login link to <strong style={{ color: "#EFF4FF" }}>{email}</strong>. Tap the link in that email to log in.
            </p>
            <button onClick={() => { setSent(false); setEmail(""); }} style={{ marginTop: "16px", background: "transparent", border: "none", color: "#F5C518", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Use a different email</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>Log in</h2>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Enter your email and we'll send you a one-tap login link.</p>

            {errorParam === "expired" && (
              <p style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                That login link has expired. Request a new one below.
              </p>
            )}

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "15px", marginBottom: "16px" }}
            />
            <button type="submit" disabled={loading || !email} style={{ width: "100%", padding: "14px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", opacity: (loading || !email) ? 0.6 : 1 }}>
              {loading ? "Sending…" : "Send login link"}
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
