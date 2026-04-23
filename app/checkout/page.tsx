"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const planDetails: Record<string, { name: string; tier: string; price: string; firstClean: string; cleans: string }> = {
  basic:    { name: "Basic Plan",    tier: "A", price: "$24.99/mo", firstClean: "$300",  cleans: "1 clean/year" },
  standard: { name: "Standard Plan", tier: "B", price: "$49.99/mo", firstClean: "$150",  cleans: "2 cleans/year" },
  elite:    { name: "Elite Plan",    tier: "C", price: "$110/mo",   firstClean: "$150",  cleans: "4 cleans/year" },
};

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "standard";
  const details = planDetails[plan] || planDetails.standard;

  const paymentRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailErrorRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [canSubmit, setCanSubmit] = useState(false);
  const actionsRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Fetch client secret
      const bookingDetails = JSON.parse(sessionStorage.getItem("bookingDetails") || "{}");

      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, bookingDetails }),
      });
      const { clientSecret, error } = await res.json();
      if (error || !clientSecret) {
        setMessage(error || "Failed to load checkout.");
        setLoading(false);
        return;
      }

      // Load Stripe
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!) as any;
      if (!stripe || !mounted) return;

      const appearance = {
        theme: "night",
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
        },
      };

      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret,
        elementsOptions: { appearance },
      });

      checkout.on("change", (session: any) => {
        if (mounted) setCanSubmit(!!session.canConfirm);
      });

      const result = await checkout.loadActions();
      if (result.type === "success") {
        actionsRef.current = result.actions;
      }

      if (paymentRef.current) {
        const paymentElement = checkout.createPaymentElement();
        paymentElement.mount(paymentRef.current);
      }

      if (addressRef.current) {
        const addressElement = checkout.createBillingAddressElement();
        addressElement.mount(addressRef.current);
      }

      if (mounted) setLoading(false);
    }

    init();
    return () => { mounted = false; };
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionsRef.current) return;
    setSubmitting(true);
    setMessage("");

    const email = emailRef.current?.value;
    if (email) {
      await actionsRef.current.updateEmail(email);
    }

    const { error } = await actionsRef.current.confirm();
    if (error) {
      setMessage(error.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 40px" }} className="checkout-page">
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <a href="/" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", display: "block", marginBottom: "32px" }}>
          ← Back to FluroSolarCleaning
        </a>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "40px", alignItems: "start" }} className="checkout-grid">
          {/* Left — Plan summary */}
          <div>
            <span className="label" style={{ display: "block", marginBottom: "12px" }}>Your Plan</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
              <span className="display g-text" style={{ fontSize: "48px", lineHeight: 1 }}>{details.tier}</span>
              <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--body)" }}>{details.name}</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>{details.cleans}</p>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-sub)" }}>First clean (today)</span>
                <span style={{ fontWeight: 700 }}>{details.firstClean}</span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-sub)" }}>Then monthly</span>
                <span style={{ fontWeight: 700 }}>{details.price}</span>
              </div>
            </div>

            {["Cancel anytime after minimum term", "Email & SMS reminders", "SSL encrypted · Powered by Stripe"].map((f) => (
              <div key={f} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>
                <span style={{ color: "var(--gold)" }}>✓</span>{f}
              </div>
            ))}
          </div>

          {/* Right — Payment form */}
          <div>
            <span className="label" style={{ display: "block", marginBottom: "20px" }}>Payment Details</span>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "14px", padding: "40px 0" }}>
                <div style={{ width: "18px", height: "18px", border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Loading secure checkout…
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: loading ? "none" : "block" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--body)" }}>Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  required
                  placeholder="you@example.com"
                  style={{ width: "100%", background: "#0C1828", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "15px", fontFamily: "var(--body)", outline: "none" }}
                />
                <div ref={emailErrorRef} style={{ color: "#f87171", fontSize: "13px", marginTop: "4px" }} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--body)" }}>Billing Address</label>
                <div ref={addressRef} />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--body)" }}>Payment</label>
                <div ref={paymentRef} />
              </div>

              {message && <p style={{ color: "#f87171", fontSize: "14px", marginBottom: "16px" }}>{message}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-gold"
                style={{ width: "100%", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Processing…" : `Pay ${details.firstClean} & Subscribe`}
              </button>

              <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                By subscribing you authorise FluroSolarCleaning to charge your card monthly until cancelled.
              </p>
            </form>
          </div>
        </div>
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
