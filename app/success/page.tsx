import Link from "next/link";

export default function SuccessPage() {
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
        border: "1px solid rgba(245,197,24,0.25)",
        borderRadius: "18px",
        padding: "48px 40px",
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          width: "64px", height: "64px",
          background: "rgba(245,197,24,0.1)",
          border: "2px solid var(--gold)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: "28px",
        }}>
          ✓
        </div>

        <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 38px)", marginBottom: "12px" }}>
          You&apos;re all set.
        </h1>

        <p style={{ fontSize: "16px", color: "var(--text-sub)", lineHeight: 1.75, marginBottom: "24px" }}>
          Welcome to FluroSolarCleaning. Your first clean will be scheduled automatically — we&apos;ll email you the date soon.
        </p>

        <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", padding: "16px", marginBottom: "28px", textAlign: "left" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--gold)", marginBottom: "8px" }}>
            📱 Your customer portal
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-sub)", lineHeight: 1.6, marginBottom: "10px" }}>
            Manage your bookings, update your card, or cancel anytime from your portal. Log in at any time — no password needed, just your email.
          </p>
          <Link href="/portal/login" style={{ fontSize: "13px", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
            Log in to your portal →
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link href="/portal/login" className="btn btn-gold" style={{ display: "block" }}>
            Log in to my portal
          </Link>
          <Link href="/" className="btn btn-outline" style={{ display: "block" }}>
            Back to Home
          </Link>
        </div>

        <p style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted)" }}>
          A receipt has been sent to your email · Powered by Stripe
        </p>
      </div>
    </div>
  );
}
