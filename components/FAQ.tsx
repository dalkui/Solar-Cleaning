"use client";

import { Plus, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    id: "01",
    q: "Why do I need a subscription instead of just booking when I remember?",
    a: "Most people never book — and their panels quietly lose 10–30% output for months or years. A subscription means it happens automatically on an optimal schedule, without you ever having to think about it. That's the whole point.",
  },
  {
    id: "02",
    q: "Why is it important that my cleaner is an electrician?",
    a: "Solar panels are live electrical equipment. An unqualified cleaner doesn't know how to identify a failing micro-inverter, a burnt diode, or unsafe wiring — issues that can become serious faults or fire hazards. As an A-Grade Electrician, I spot these problems during every clean, before they become expensive.",
  },
  {
    id: "03",
    q: "Will cleaning void my solar warranty?",
    a: "Only if done incorrectly. High-pressure washing and harsh chemicals are explicitly excluded from most manufacturer warranties. We use soft brushes and no harsh chemicals — the exact method most manufacturers specify. Your warranty stays intact.",
  },
  {
    id: "04",
    q: "How much output am I actually losing right now?",
    a: "Studies show dust and grime reduce output by 10–30% depending on location and time since last clean. Coastal areas (salt air), rural areas (dust and ash), and anywhere with bird activity are hit hardest. A single clean typically restores full output immediately.",
  },
  {
    id: "05",
    q: "Can I cancel my subscription?",
    a: "Plans A and C can be cancelled anytime with 14 days notice, no fees. Plan B has a 12-month minimum term due to the half-price first clean. If cancelled within the first year, the $150 intro discount is recovered, bringing your first clean to the standard $300 rate.",
  },
  {
    id: "06",
    q: "Do I need to be home for the clean?",
    a: "No. As long as we have safe roof access, our team completes the clean while you're out. We'll send photos and an efficiency report as soon as we're done.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" style={{ background: "var(--bg-alt)", padding: "64px 40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        <div style={{ marginBottom: "28px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>FAQ</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)" }}>Questions answered.</h2>
        </div>

        <Accordion type="single" defaultValue="01" collapsible className="w-full" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
              className="faq-item"
            >
              <AccordionTrigger
                style={{ padding: "22px 28px", cursor: "pointer", width: "100%" }}
                className="faq-trigger"
              >
                <div style={{ display: "flex", flex: 1, justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.4, fontFamily: "var(--body)", textAlign: "left", color: "var(--text)" }}>
                    {faq.q}
                  </h3>
                  <div style={{ position: "relative", flexShrink: 0, width: "20px", height: "20px" }}>
                    <Plus
                      size={20}
                      strokeWidth={2}
                      className="faq-icon-plus"
                      style={{ color: "var(--gold)", position: "absolute", inset: 0, transition: "opacity 0.3s, transform 0.3s" }}
                    />
                    <X
                      size={20}
                      strokeWidth={2}
                      className="faq-icon-x"
                      style={{ color: "var(--gold)", position: "absolute", inset: 0, transition: "opacity 0.3s, transform 0.3s" }}
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p style={{ fontSize: "15px", color: "var(--text-sub)", lineHeight: 1.75, padding: "0 28px 22px" }}>
                  {faq.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

      </div>
    </section>
  );
}
