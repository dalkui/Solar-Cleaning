"use client";


export default function Footer() {
  return (
    <footer style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "64px 40px 40px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "60px", marginBottom: "56px" }}>
          <div>
            <div style={{ marginBottom: "14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png?v=2" alt="FluroSolarCleaning" style={{ height: "56px", width: "auto", objectFit: "contain" }} />
            </div>
            <p style={{ fontSize: "15px", color: "var(--text-sub)", lineHeight: 1.75, maxWidth: "300px", marginBottom: "16px" }}>
              Professional solar panel cleaning subscriptions. Serviced by a certified A-Grade Electrician. Keeping Australian systems at peak efficiency.
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-sub)", lineHeight: 2 }}>
              <a href="tel:0415099300" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>0415 099 300</a><br />
              <a href="mailto:dallaskuipers77@gmail.com" style={{ color: "var(--text-sub)", textDecoration: "none" }}>dallaskuipers77@gmail.com</a>
            </p>
          </div>

          <div>
            <p className="label" style={{ marginBottom: "18px", display: "block" }}>Service</p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Pricing",      href: "/#pricing" },
                { label: "How It Works", href: "/#how-it-works" },
                { label: "FAQ",          href: "/faq" },
                { label: "Book a Clean", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} style={{ fontSize: "15px", color: "var(--text-sub)", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--gold)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-sub)")}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label" style={{ marginBottom: "18px", display: "block" }}>Company</p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Contact",        href: "/contact" },
                { label: "Service Area",   href: "/service-area" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} style={{ fontSize: "15px", color: "var(--text-sub)", transition: "color 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--gold)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-sub)")}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>© {new Date().getFullYear()} FluroSolarCleaning. All rights reserved.</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>A-Grade Electrician · Fully Insured · Melbourne, VIC</p>
        </div>
      </div>
    </footer>
  );
}
