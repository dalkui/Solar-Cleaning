"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "standard";

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    return data.clientSecret;
  }, [plan]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 20px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <a href="/" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none", display: "block", marginBottom: "32px" }}>
          ← Back to FluroSolarCleaning
        </a>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
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
