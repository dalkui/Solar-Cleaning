"use client";

import { useState, useEffect, useRef } from "react";

const mainLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Why Us", href: "/#why-us" },
];

const moreLinks = [
  { label: "FAQ", href: "/faq" },
  { label: "Service Area", href: "/service-area" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "0 40px",
      background: "rgba(8,16,28,0.95)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png?v=2" alt="FluroSolarCleaning" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
        </a>

        {/* Desktop links */}
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {mainLinks.map((l) => (
            <a key={l.label} href={l.href}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-sub)", transition: "color 0.15s", textDecoration: "none", fontFamily: "var(--body)" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-sub)")}>
              {l.label}
            </a>
          ))}

          {/* More dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ fontSize: "14px", fontWeight: 500, color: dropdownOpen ? "var(--text)" : "var(--text-sub)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--body)", display: "flex", alignItems: "center", gap: "5px", transition: "color 0.15s", padding: 0 }}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseOut={(e) => { if (!dropdownOpen) e.currentTarget.style.color = "var(--text-sub)"; }}
            >
              More
              <span style={{ fontSize: "10px", transition: "transform 0.2s", display: "inline-block", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>

            {dropdownOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 12px)", right: 0,
                background: "rgba(12,24,40,0.98)", border: "1px solid var(--border)",
                borderRadius: "10px", padding: "8px", minWidth: "160px",
                backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}>
                {moreLinks.map((l) => (
                  <a key={l.label} href={l.href} onClick={() => setDropdownOpen(false)}
                    style={{ display: "block", padding: "10px 14px", fontSize: "14px", fontWeight: 500, color: "var(--text-sub)", textDecoration: "none", borderRadius: "6px", transition: "all 0.15s", fontFamily: "var(--body)" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(245,197,24,0.08)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-sub)"; }}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a href="/portal/login"
            style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-sub)", textDecoration: "none", fontFamily: "var(--body)", transition: "color 0.15s" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-sub)")}>
            Log In
          </a>

          <a href="/contact" className="btn btn-gold" style={{ fontSize: "13px", padding: "10px 22px" }}>
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none", flexDirection: "column", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              display: "block", width: "22px", height: "2px", background: "var(--text)", borderRadius: "2px", transition: "all 0.2s",
              transform: menuOpen ? (i === 0 ? "rotate(45deg) translate(5px, 5px)" : i === 2 ? "rotate(-45deg) translate(5px, -5px)" : "none") : "none",
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "rgba(8,16,28,0.98)", borderTop: "1px solid var(--border)", padding: "20px 40px 24px" }}>
          {[...mainLinks, ...moreLinks, { label: "Log In", href: "/portal/login" }].map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
              style={{ display: "block", padding: "12px 0", fontSize: "16px", fontWeight: 500, color: "var(--text-sub)", borderBottom: "1px solid var(--border)", textDecoration: "none" }}>
              {l.label}
            </a>
          ))}
          <a href="/contact" className="btn btn-gold" onClick={() => setMenuOpen(false)}
            style={{ display: "block", marginTop: "20px", textAlign: "center", fontSize: "15px" }}>
            Get Started
          </a>
        </div>
      )}
    </nav>
  );
}
