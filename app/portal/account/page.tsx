"use client";
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  CreditCard, Receipt, MapPin, Phone, Mail, Download,
  CheckCircle, Pause, Calendar, Clock, Shield,
} from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";

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

function CardBrandLogo({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  const common = { width: 32, height: 20, style: { flexShrink: 0 } as React.CSSProperties };
  if (b === "visa") return (
    <svg viewBox="0 0 48 30" {...common}><rect width="48" height="30" rx="4" fill="#1A1F71" /><text x="24" y="21" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="13" letterSpacing="-0.5">VISA</text></svg>
  );
  if (b === "mastercard") return (
    <svg viewBox="0 0 48 30" {...common}><rect width="48" height="30" rx="4" fill="#1A1A1A" /><circle cx="20" cy="15" r="7" fill="#EB001B" /><circle cx="28" cy="15" r="7" fill="#F79E1B" opacity="0.9" /></svg>
  );
  if (b === "amex") return (
    <svg viewBox="0 0 48 30" {...common}><rect width="48" height="30" rx="4" fill="#2E77BB" /><text x="24" y="20" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="10">AMEX</text></svg>
  );
  return <div {...common} style={{ ...common.style, background: "#1A1F71", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={14} color="white" /></div>;
}

function UpdateCardForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedJust, setSavedJust] = useState(false);
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
      setSavedJust(true);
      setTimeout(() => onSuccess(), 900);
    }
    setLoading(false);
  };

  if (savedJust) {
    return (
      <div style={{ textAlign: "center", padding: "30px 20px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(74,222,128,0.15)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" style={{ strokeDasharray: 60, animation: "checkSweep 0.5s ease-out forwards" }} />
          </svg>
        </div>
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#4ade80" }}>Card saved</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Card details</label>
      <div style={{ padding: "14px", background: "#08101C", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "12px" }}>
        <CardElement options={{
          style: {
            base: { fontSize: "15px", color: "#EFF4FF", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", "::placeholder": { color: "#7A95B0" } },
            invalid: { color: "#f87171" },
          },
          hidePostalCode: true,
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#7A95B0", marginBottom: "16px" }}>
        <Shield size={12} /> Payments processed securely by Stripe
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={onClose} disabled={loading} className="portal-btn" style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
        <button type="submit" disabled={!stripe || !clientSecret || loading} className="portal-btn" style={{ flex: 1, padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export default function PortalAccount() {
  const toast = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
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
          phone: customer.phone, street: customer.street, suburb: customer.suburb,
          state: customer.state, postcode: customer.postcode,
          auto_schedule: customer.auto_schedule, preferred_time_of_day: customer.preferred_time_of_day,
          sms_opt_out: customer.sms_opt_out,
        }),
      });
      toast("Saved");
    }, 700);
  }, [customer]);

  const cancelSub = async () => {
    setWorking(true);
    const res = await fetch("/api/portal/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setWorking(false);
    setShowCancelModal(false);
    setCancelReason("");
    if (res.ok) { toast("Subscription cancelled"); loadAll(); }
    else toast("Couldn't cancel. Try again.", "error");
  };

  const reactivate = async () => {
    setWorking(true);
    const res = await fetch("/api/portal/reactivate-subscription", { method: "POST" });
    setWorking(false);
    if (res.ok) { toast("Subscription reactivated"); loadAll(); }
    else toast("Couldn't reactivate. Try again.", "error");
  };

  const requestPause = async () => {
    const res = await fetch("/api/portal/pause-request", { method: "POST" });
    setShowCancelModal(false);
    if (res.ok) toast("Pause request sent — we'll be in touch");
    else toast("Couldn't send. Try again.", "error");
  };

  if (loading || !customer) {
    return (
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <SkeletonCard height={140} />
        <SkeletonCard height={100} />
        <SkeletonCard height={120} />
      </div>
    );
  }

  const update = (patch: Partial<Customer>) => setCustomer(c => c ? { ...c, ...patch } : c);

  const field = (label: string, value: string, key: keyof Customer, type = "text", icon?: React.ReactNode) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        {icon}{label}
      </label>
      <input type={type} value={value || ""} onChange={e => update({ [key]: e.target.value } as any)} className="portal-focus" style={{ width: "100%", padding: "12px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "15px" }} />
    </div>
  );

  const nextChargeDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" })
    : null;

  return (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "20px" }}>Account</h1>

      {/* Billing */}
      <section style={{ marginBottom: "24px" }} id="billing">
        <SectionHeader>Billing</SectionHeader>
        {subscription ? (
          <Card padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <p style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>{planLabel[subscription.plan] || subscription.plan}</p>
                <p style={{ fontSize: "14px", color: "#7A95B0", marginTop: "2px" }} className="tabular-nums">
                  {formatCurrency(subscription.amount, subscription.currency)} / {subscription.interval}
                </p>
              </div>
              {subscription.cancel_at_period_end ? <Badge tone="cancelling" label="Cancelling" /> : <Badge tone="active" label="Active" />}
            </div>

            {nextChargeDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#7A95B0", marginBottom: "16px" }}>
                <Calendar size={13} />
                {subscription.cancel_at_period_end ? `Ends ${nextChargeDate}` : `Next charge ${nextChargeDate}`}
              </div>
            )}

            {/* Card on file */}
            <div style={{ background: "#08101C", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
              {paymentMethod ? (
                <>
                  <CardBrandLogo brand={paymentMethod.brand} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: "0.02em" }}>•••• {paymentMethod.last4}</p>
                    <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }} className="tabular-nums">
                      Expires {String(paymentMethod.exp_month).padStart(2, "0")}/{String(paymentMethod.exp_year).slice(-2)}
                    </p>
                  </div>
                  <button onClick={() => setShowCardModal(true)} className="portal-btn portal-focus" style={{ background: "transparent", color: "#F5C518", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Update</button>
                </>
              ) : (
                <>
                  <CreditCard size={20} color="#7A95B0" />
                  <p style={{ fontSize: "13px", color: "#7A95B0", flex: 1 }}>No card on file</p>
                  <button onClick={() => setShowCardModal(true)} className="portal-btn" style={{ background: "#F5C518", color: "#08101C", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Add card</button>
                </>
              )}
            </div>

            {subscription.cancel_at_period_end ? (
              <button onClick={reactivate} disabled={working} className="portal-btn portal-focus" style={{ width: "100%", padding: "12px", background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {working ? "Reactivating…" : "Reactivate subscription"}
              </button>
            ) : (
              <button onClick={() => setShowCancelModal(true)} className="portal-btn portal-focus" style={{ width: "100%", padding: "10px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                Cancel subscription
              </button>
            )}
          </Card>
        ) : (
          <Card><p style={{ color: "#7A95B0", fontSize: "13px" }}>No active subscription</p></Card>
        )}
      </section>

      {/* Invoices */}
      {invoices.length > 0 && (
        <section style={{ marginBottom: "24px" }}>
          <SectionHeader>Invoice History</SectionHeader>
          <Card padding="4px 0">
            {invoices.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245,197,24,0.08)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Receipt size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600 }}>{new Date(inv.created * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}</p>
                    <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }} className="tabular-nums">
                      {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)}
                      {inv.status && <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>· {inv.status}</span>}
                    </p>
                  </div>
                </div>
                {inv.invoice_pdf && (
                  <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" aria-label="Download invoice" className="portal-btn portal-focus" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#F5C518", textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px" }}>
                    <Download size={12} /> PDF
                  </a>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Scheduling */}
      <section style={{ marginBottom: "24px" }}>
        <SectionHeader>Scheduling</SectionHeader>
        <Card padding="16px">
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "14px" }}>
            <input type="checkbox" checked={customer.auto_schedule} onChange={e => update({ auto_schedule: e.target.checked })} style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#F5C518" }} />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>Auto-schedule my cleans</p>
              <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>We pick the time, you get notified.</p>
            </div>
          </label>

          <p style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Preferred time</p>
          <div style={{ display: "flex", gap: "6px" }}>
            {[{ value: "any", label: "Any" }, { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }].map(opt => (
              <button key={opt.value} onClick={() => update({ preferred_time_of_day: opt.value })} className="portal-btn portal-focus" style={{
                flex: 1, padding: "10px",
                background: customer.preferred_time_of_day === opt.value ? "rgba(245,197,24,0.15)" : "#08101C",
                color: customer.preferred_time_of_day === opt.value ? "#F5C518" : "#EFF4FF",
                border: `1px solid ${customer.preferred_time_of_day === opt.value ? "#F5C518" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>{opt.label}</button>
            ))}
          </div>
        </Card>
      </section>

      {/* Contact */}
      <section style={{ marginBottom: "24px" }}>
        <SectionHeader>Contact</SectionHeader>
        <Card padding="16px">
          <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Mail size={11} /> Email
            </label>
            <p style={{ fontSize: "14px", color: "#EFF4FF" }}>{customer.email}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "4px" }}>To change email, contact us</p>
          </div>
          {field("Phone", customer.phone, "phone", "tel", <Phone size={11} />)}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginTop: "8px" }}>
            <input type="checkbox" checked={customer.sms_opt_out || false} onChange={e => update({ sms_opt_out: e.target.checked })} style={{ width: "16px", height: "16px", accentColor: "#F5C518" }} />
            <span style={{ fontSize: "13px", color: "#EFF4FF" }}>Don't send me SMS (email only)</span>
          </label>
        </Card>
      </section>

      {/* Address */}
      <section style={{ marginBottom: "24px" }}>
        <SectionHeader>Address</SectionHeader>
        <Card padding="16px">
          {field("Street", customer.street, "street", "text", <MapPin size={11} />)}
          {field("Suburb", customer.suburb, "suburb")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {field("State", customer.state, "state")}
            {field("Postcode", customer.postcode, "postcode")}
          </div>
        </Card>
      </section>

      {/* Update card modal */}
      {showCardModal && (
        <div onClick={() => setShowCardModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
          <div onClick={e => e.stopPropagation()} className="portal-pop-in" style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "420px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(245,197,24,0.12)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={16} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Update card</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px", lineHeight: 1.5 }}>This replaces the card on file. Your next payment will come from the new card.</p>
            <Elements stripe={stripePromise}>
              <UpdateCardForm onClose={() => setShowCardModal(false)} onSuccess={() => { setShowCardModal(false); toast("Card updated"); loadAll(); }} />
            </Elements>
          </div>
        </div>
      )}

      {/* Cancel modal with retention */}
      {showCancelModal && (
        <div onClick={() => setShowCancelModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
          <div onClick={e => e.stopPropagation()} className="portal-pop-in" style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px" }}>
            <h3 style={{ fontSize: "19px", fontWeight: 700, marginBottom: "8px" }}>Before you go…</h3>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px", lineHeight: 1.5 }}>
              {nextChargeDate ? `You'll keep access until ${nextChargeDate}, then the subscription will end.` : "Your subscription will end at the end of the current billing period."}
            </p>

            {/* Retention offer */}
            <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", padding: "14px", marginBottom: "18px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Pause size={16} color="#F5C518" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#F5C518", marginBottom: "4px" }}>Would pausing for a month help?</p>
                <p style={{ fontSize: "12px", color: "#EFF4FF", lineHeight: 1.5, marginBottom: "10px" }}>We can pause your subscription for a month, no charges. A real human will reach out within a day.</p>
                <button onClick={requestPause} className="portal-btn portal-focus" style={{ background: "#F5C518", color: "#08101C", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  Yes, pause instead
                </button>
              </div>
            </div>

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>If you must cancel, mind telling us why? (optional)</label>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Too expensive, moving house, unhappy with service…" rows={3} className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", marginBottom: "16px" }} />

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={cancelSub} disabled={working} className="portal-btn" style={{ flex: 1, padding: "12px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                {working ? "Cancelling…" : "Yes, cancel my plan"}
              </button>
              <button onClick={() => setShowCancelModal(false)} disabled={working} className="portal-btn" style={{ flex: 1, padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Keep subscription</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
