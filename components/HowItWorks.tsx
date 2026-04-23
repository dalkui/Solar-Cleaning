"use client";

import { Plus, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const steps = [
  { num: "01", title: "Choose Your Plan", body: "Select your cleaning frequency in under 2 minutes. Note: standard pricing applies to single-story homes. Double-story or complex access may incur a safety fee." },
  { num: "02", title: "Secure Checkout", body: "Pay securely via Stripe. Your subscription activates instantly, locking in your first professional clean and site inspection." },
  { num: "03", title: "We Automate It", body: "We auto-schedule your seasonal cleans. It's 100% hands-off — you don't even need to be home. We'll just send a quick reminder before we arrive." },
  { num: "04", title: "Peak Performance", body: "Enjoy maximum energy output and lower power bills." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ background: "var(--bg-alt)", padding: "64px 40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>The Process</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)" }}>
            Up and running in 3 minutes.
          </h2>
        </div>

        <Accordion type="single" defaultValue="01" collapsible className="w-full" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {steps.map((step) => (
            <AccordionItem
              key={step.num}
              value={step.num}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}
            >
              <AccordionTrigger
                style={{ padding: "20px 28px", cursor: "pointer", width: "100%" }}
                className="faq-trigger"
              >
                <div style={{ display: "flex", flex: 1, justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <span className="display g-text" style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{step.num}</span>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.4, fontFamily: "var(--body)", textAlign: "left", color: "var(--text)" }}>
                      {step.title}
                    </h3>
                  </div>
                  <div style={{ position: "relative", flexShrink: 0, width: "20px", height: "20px" }}>
                    <Plus size={20} strokeWidth={2} className="faq-icon-plus" style={{ color: "var(--gold)", position: "absolute", inset: 0, transition: "opacity 0.3s, transform 0.3s" }} />
                    <X size={20} strokeWidth={2} className="faq-icon-x" style={{ color: "var(--gold)", position: "absolute", inset: 0, transition: "opacity 0.3s, transform 0.3s" }} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p style={{ fontSize: "15px", color: "var(--text-sub)", lineHeight: 1.75, padding: "0 28px 20px 28px" }}>
                  {step.body}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div style={{ marginTop: "32px" }}>
          <a href="/#pricing" className="btn btn-gold">Get Started →</a>
        </div>

      </div>
    </section>
  );
}
