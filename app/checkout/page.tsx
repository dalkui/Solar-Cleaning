"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const planDetails: Record<string, { name: string; tier: string; price: string; firstClean: string; cleans: string }> = {
  basic:    { name: "Basic Plan",    tier: "A", price: "$24.99/mo", firstClean: "$300",  cleans: "1 clean/year" },
  standard: { name: "Standard Plan", tier: "B", price: "$49.99/mo", firstClean: "$150",  cleans: "2 cleans/year" },
  elite:    { name: "Elite Plan",    tier: "C", price: "$110/mo",   firstClean: "$150",  cleans: "4 cleans/year" },
};

function CheckoutForm({ plan, clientSecret }: { plan: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const details = planDetails[plan] || planDetails.standard;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?plan=${plan}`,
      },
    });

    if (error) {
      setError(error.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "860px", margin: "0 auto", width: "100%" }} className="checkout-grid">
      {/* Left — Plan summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <span className="label" style={{ display: "block", marginBottom: "12px" }}>Your Plan</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
            <span className="display g-text" style={{ fontSize: "48px", lineHeight: 1 }}>{details.tier}</span>
            <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--body)" }}>{details.name}</span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{details.cleans}</p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
            <span style={{ color: "var(--text-sub)" }}>First clean (today)</span>
            <span style={{ fontWeight: 700 }}>{details.firstClean}</span>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
            <span style={{ color: "var(--text-sub)" }}>Then monthly</span>
            <span style={{ fontWeight: 700 }}>{details.price}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {["Cancel anytime after minimum term", "Serviced by A-Grade Electrician", "Email & SMS reminders included", "SSL encrypted · Powered by Stripe"].map((f) => (
            <div key={f} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
              <span style={{ color: "var(--gold)" }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      {/* Right — Payment form */}
      <div>
        <span className="label" style={{ display: "block", marginBottom: "20px" }}>Payment Details</span>
        <form onSubmit={handleSubmit}>
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />

          {error && (
            <p style={{ marginTop: "16px", fontSize: "14px", color: "#f87171" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="btn btn-gold"
            style={{ width: "100%", marginTop: "24px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Processing…" : `Pay ${details.firstClean} & Subscribe`}
          </button>

          <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
            By subscribing you authorise FluroSolarCleaning to charge your card monthly until cancelled.
          </p>
        </form>
      </div>
    </div>
  );
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "standard";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"details" | "payment">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email, name }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep("payment");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#F5C518",
      colorBackground: "#0F1E30",
      colorText: "#EFF4FF",
      colorTextPlaceholder: "#3A5268",
      colorDanger: "#f87171",
      borderRadius: "8px",
      fontFamily: "DM Sans, sans-serif",
    },
    rules: {
      ".Input": { border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#0C1828" },
      ".Input:focus": { border: "1px solid #F5C518", boxShadow: "none" },
      ".Tab": { border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#0C1828" },
      ".Tab--selected": { border: "1px solid #F5C518", backgroundColor: "#0F1E30" },
      ".Label": { color: "#7A95B0" },
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "80px 40px 60px" }} className="checkout-page">
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px" }}>
          <a href="/" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>← Back to FluroSolarCleaning</a>
        </div>

        {step === "details" ? (
          <div style={{ maxWidth: "440px" }}>
            <span className="label" style={{ display: "block", marginBottom: "12px" }}>Checkout</span>
            <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: "32px" }}>Your details</h1>
            <form onSubmit={handleContinue} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--body)" }}>Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Dallas Kuipers"
                  style={{ width: "100%", background: "#0C1828", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "15px", fontFamily: "var(--body)", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--body)" }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{ width: "100%", background: "#0C1828", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "15px", fontFamily: "var(--body)", outline: "none" }}
                />
              </div>
              {error && <p style={{ fontSize: "14px", color: "#f87171" }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn btn-gold" style={{ marginTop: "8px", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Loading…" : "Continue to Payment →"}
              </button>
            </form>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <CheckoutForm plan={plan} clientSecret={clientSecret} />
          </Elements>
        ) : null}
      </div>
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
