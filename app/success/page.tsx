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

        <p style={{ fontSize: "16px", color: "var(--text-sub)", lineHeight: 1.75, marginBottom: "32px" }}>
          Welcome to FluroSolarCleaning. We&apos;ll be in touch shortly to book your first clean. Check your email for your receipt.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link href="/" className="btn btn-gold" style={{ display: "block" }}>
            Back to Home
          </Link>
          <Link href="/contact" className="btn btn-outline" style={{ display: "block" }}>
            Get in Touch
          </Link>
        </div>

        <p style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted)" }}>
          A receipt has been sent to your email · Powered by Stripe
        </p>
      </div>
    </div>
  );
}
