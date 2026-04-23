"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <span className="label" style={{ display: "block", marginBottom: "8px" }}>FluroSolar</span>
          <h1 className="display" style={{ fontSize: "32px" }}>Admin</h1>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                style={{ width: "100%", background: "#0C1828", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "15px", outline: "none" }}
              />
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-gold"
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
