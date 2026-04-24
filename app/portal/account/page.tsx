"use client";
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface Customer {
  id: string; name: string; email: string; phone: string;
  street: string; suburb: string; state: string; postcode: string;
  plan: string; auto_schedule: boolean; preferred_time_of_day: string; sms_opt_out?: boolean;
}

interface Subscription {
  id: string; status: string; cancel_at_period_end: boolean;
  current_period_end: number | null; amount: number; currency: string;
  interval: string; plan: string;
}

interface PaymentMethod { brand: string; last4: string; exp_month: number; exp_year: number; }

interface Invoice {
  id: string; number: string | null; status: string | null;
  amount_paid: number; amount_due: number; currency: string;
  created: number; hosted_invoice_url: string | null; invoice_pdf: string | null;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function formatCurrency(amount: number, currency = "aud") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function UpdateCardForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal/setup-intent", { method: "POST" })
      .then(r => r.json())
      .then(d => setClientSecret(d.clientSecret));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    setError("");

    const card = elements.getElement(CardElement);
    if (!card) { setLoading(false); return; }

    const { setupIntent, error: err } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });

    if (err) {
      setError(err.message || "Card couldn't be saved. Please check details.");
      setLoading(false);
      return;
    }

    if (setupIntent?.payment_method) {
      const res = await fetch("/api/portal/set-default-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method_id: setupIntent.payment_method }),
      });
      if (!res.ok) {
        setError("Card saved but couldn't be set as default. Try again.");
        setLoading(false);
        return;
      }
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit}>
      <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Card details</label>
      <div style={{ padding: "14px", background: "#08101C", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "14px" }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: "15px",
              color: "#EFF4FF",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
              "::placeholder": { color: "#7A95B0" },
            },
            invalid: { color: "#f87171" },
          },
          hidePostalCode: false,
        }} />
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={onClose} disabled={loading} style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
        <button type="submit" disabled={!stripe || !clientSecret || loading} style={{ flex: 1, padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export default function PortalAccount() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [working, setWorking] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLoad = useRef(false);

  const loadAll = async () => {
    const [meRes, subRes, invRes] = await Promise.all([
      fetch("/api/portal/me").then(r => r.json()),
      fetch("/api/portal/subscription").then(r => r.json()),
      fetch("/api/portal/invoices").then(r => r.json()),
    ]);
    setCustomer(meRes.customer);
    setSubscription(subRes.subscription);
    setPaymentMethod(subRes.paymentMethod);
    setInvoices(invRes.invoices || []);
    setLoading(false);
    didLoad.current = true;
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!didLoad.current || !customer) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/portal/update-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          street: customer.street,
          suburb: customer.suburb,
          state: customer.state,
          postcode: customer.postcode,
          auto_schedule: customer.auto_schedule,
          preferred_time_of_day: customer.preferred_time_of_day,
          sms_opt_out: customer.sms_opt_out,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 700);
  }, [customer]);

  const cancelSub = async () => {
    setWorking(true);
    await fetch("/api/portal/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setWorking(false);
    setShowCancelModal(false);
    setCancelReason("");
    loadAll();
  };

  const reactivate = async () => {
    setWorking(true);
    await fetch("/api/portal/reactivate-subscription", { method: "POST" });
    setWorking(false);
    loadAll();
  };

  if (loading || !customer) return <p style={{ padding: "40px", color: "#7A95B0" }}>Loading…</p>;

  const update = (patch: Partial<Customer>) => setCustomer(c => c ? { ...c, ...patch } : c);

  const field = (label: string, value: string, key: keyof Customer, type = "text") => (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={e => update({ [key]: e.target.value } as any)}
        style={{ width: "100%", padding: "12px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "15px" }}
      />
    </div>
  );

  const nextChargeDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" })
    : null;

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Account</h1>
        {saved && <span style={{ fontSize: "12px", color: "#4ade80" }}>Saved ✓</span>}
      </div>

      {/* Billing */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Billing</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "18px" }}>
          {subscription ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <p style={{ fontSize: "18px", fontWeight: 800 }}>{planLabel[subscription.plan] || subscription.plan}</p>
                  <p style={{ fontSize: "14px", color: "#7A95B0", marginTop: "2px" }}>{formatCurrency(subscription.amount, subscription.currency)} / {subscription.interval}</p>
                </div>
                {subscription.cancel_at_period_end ? (
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "4px 10px", borderRadius: "999px" }}>CANCELLING</span>
                ) : (
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "4px 10px", borderRadius: "999px" }}>ACTIVE</span>
                )}
              </div>

              {nextChargeDate && (
                <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "14px" }}>
                  {subscription.cancel_at_period_end
                    ? `Ends ${nextChargeDate} — no further charges`
                    : `Next charge: ${nextChargeDate}`}
                </p>
              )}

              {/* Payment method */}
              <div style={{ background: "#08101C", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {paymentMethod ? (
                  <>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>{paymentMethod.brand} •••• {paymentMethod.last4}</p>
                      <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>Expires {String(paymentMethod.exp_month).padStart(2, "0")}/{String(paymentMethod.exp_year).slice(-2)}</p>
                    </div>
                    <button onClick={() => setShowCardModal(true)} style={{ background: "transparent", color: "#F5C518", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Update</button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "13px", color: "#7A95B0" }}>No card on file</p>
                    <button onClick={() => setShowCardModal(true)} style={{ background: "#F5C518", color: "#08101C", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Add card</button>
                  </>
                )}
              </div>

              {/* Cancel/reactivate */}
              {subscription.cancel_at_period_end ? (
                <button onClick={reactivate} disabled={working} style={{ width: "100%", padding: "12px", background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  {working ? "Reactivating…" : "Reactivate subscription"}
                </button>
              ) : (
                <button onClick={() => setShowCancelModal(true)} style={{ width: "100%", padding: "10px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                  Cancel subscription
                </button>
              )}
            </>
          ) : (
            <p style={{ color: "#7A95B0", fontSize: "13px" }}>No active subscription</p>
          )}
        </div>
      </section>

      {/* Invoices */}
      {invoices.length > 0 && (
        <section style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Invoice history</h3>
          <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden" }}>
            {invoices.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>{new Date(inv.created * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}</p>
                  <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>
                    {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)}
                    {inv.status && <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>· {inv.status}</span>}
                  </p>
                </div>
                {inv.invoice_pdf && (
                  <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#F5C518", textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "6px" }}>
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scheduling preferences */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Scheduling</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "14px" }}>
            <input
              type="checkbox"
              checked={customer.auto_schedule}
              onChange={e => update({ auto_schedule: e.target.checked })}
              style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#F5C518" }}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>Auto-schedule my cleans</p>
              <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>We pick the time, you get notified.</p>
            </div>
          </label>

          <p style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Preferred time</p>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { value: "any", label: "Any" },
              { value: "morning", label: "Morning" },
              { value: "afternoon", label: "Afternoon" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update({ preferred_time_of_day: opt.value })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: customer.preferred_time_of_day === opt.value ? "rgba(245,197,24,0.15)" : "#08101C",
                  color: customer.preferred_time_of_day === opt.value ? "#F5C518" : "#EFF4FF",
                  border: `1px solid ${customer.preferred_time_of_day === opt.value ? "#F5C518" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Contact</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          <div style={{ marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "4px" }}>Email</label>
            <p style={{ fontSize: "14px", color: "#EFF4FF" }}>{customer.email}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "4px" }}>To change email, contact us</p>
          </div>
          {field("Phone", customer.phone, "phone", "tel")}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginTop: "8px" }}>
            <input
              type="checkbox"
              checked={customer.sms_opt_out || false}
              onChange={e => update({ sms_opt_out: e.target.checked })}
              style={{ width: "16px", height: "16px", accentColor: "#F5C518" }}
            />
            <span style={{ fontSize: "13px", color: "#EFF4FF" }}>Don't send me SMS (email only)</span>
          </label>
        </div>
      </section>

      {/* Address */}
      <section style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Address</h3>
        <div style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "16px" }}>
          {field("Street", customer.street, "street")}
          {field("Suburb", customer.suburb, "suburb")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {field("State", customer.state, "state")}
            {field("Postcode", customer.postcode, "postcode")}
          </div>
        </div>
      </section>

      {/* Update card modal */}
      {showCardModal && (
        <div onClick={() => setShowCardModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>Update card</h3>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "18px" }}>This replaces the card on file. Your next payment will come from the new card.</p>
            <Elements stripe={stripePromise}>
              <UpdateCardForm
                onClose={() => setShowCardModal(false)}
                onSuccess={() => { setShowCardModal(false); loadAll(); }}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div onClick={() => setShowCancelModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1E30", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>Cancel subscription?</h3>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px" }}>
              You'll keep access until {nextChargeDate || "the end of your billing period"}, then the subscription will end. No further charges.
            </p>
            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Mind telling us why? (optional)</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Too expensive, moving house, unhappy with service…"
              rows={3}
              style={{ width: "100%", padding: "10px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowCancelModal(false)} disabled={working} style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Keep subscription</button>
              <button onClick={cancelSub} disabled={working} style={{ flex: 1, padding: "12px", background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                {working ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
