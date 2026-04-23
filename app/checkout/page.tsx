"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const planDetails: Record<string, { name: string; price: string; firstClean: string; cleans: string }> = {
  basic: { name: "Basic Plan", price: "$24.99/month", firstClean: "$300", cleans: "1 clean/year" },
  standard: { name: "Standard Plan", price: "$49.99/month", firstClean: "$150", cleans: "2 cleans/year" },
  elite: { name: "Elite Plan", price: "$110/month", firstClean: "$150", cleans: "4 cleans/year" },
};

function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan") || "standard";
  const details = planDetails[plan] || planDetails.standard;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCheckout();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "18px",
        padding: "40px",
        maxWidth: "440px",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ marginBottom: "24px" }}>
          <div className="display g-text" style={{ fontSize: "48px", lineHeight: 1, marginBottom: "8px" }}>
            {plan === "basic" ? "A" : plan === "standard" ? "B" : "C"}
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--body)", marginBottom: "4px" }}>
            {details.name}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{details.cleans}</p>
        </div>

        <div style={{
          background: "rgba(245,197,24,0.08)",
          border: "1px solid rgba(245,197,24,0.2)",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px",
        }}>
          <p style={{ fontSize: "13px", color: "var(--gold)", fontWeight: 600, marginBottom: "4px" }}>
            First clean today: {details.firstClean}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Then {details.price} ongoing
          </p>
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "14px", marginBottom: "16px" }}>{error}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-muted)", fontSize: "14px" }}>
          <div style={{
            width: "20px", height: "20px",
            border: "2px solid var(--gold)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          {loading ? "Redirecting to secure checkout…" : "Loading…"}
        </div>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "var(--text-muted)" }}>
          Secured by Stripe · SSL encrypted
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
