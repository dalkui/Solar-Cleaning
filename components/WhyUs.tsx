"use client";
import { GlowCard } from "@/components/ui/spotlight-card";

const painPoints = [
  { num: "01", title: "You're losing 10–30% of your ROI", body: "Dust, ash, bird droppings, and mineral deposits left by rain silently choke your output. A dirty panel isn't just dirty — it's costing you money every hour the sun is up." },
  { num: "02", title: "DIY cleaning can void your warranty", body: "High-pressure hoses and harsh chemicals are the #1 cause of voided solar warranties. We clean with soft brushes and no harsh chemicals — the method your manufacturer actually recommends." },
  { num: "03", title: "Getting on your roof is dangerous", body: "Falls from residential roofs cause serious injuries every year. There's no reason to risk it. We're trained, insured, and equipped for safe rooftop work on all system types." },
  { num: "04", title: "You keep forgetting to book a cleaner", body: "With a FluroSolarCleaning subscription, you never have to think about it again. We schedule your cleans automatically and send reminders — true set-and-forget maintenance." },
];

export default function WhyUs() {
  return (
    <section id="why-us" style={{ background: "var(--bg)", padding: "64px 40px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>Why FluroSolarCleaning</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)", marginBottom: "16px" }}>
            The only solar maintenance plan<br />
            <em className="g-text">that runs itself.</em>
          </h2>
        </div>

        <div className="pain-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {painPoints.map((p) => (
            <GlowCard key={p.num} glowColor="orange" style={{ background: "var(--bg-card)", padding: "28px" }}>
              <p className="label" style={{ marginBottom: "12px" }}>{p.num}</p>
              <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "10px", lineHeight: 1.35, fontFamily: "var(--body)" }}>{p.title}</h3>
              <p style={{ fontSize: "15px", color: "var(--text-sub)", lineHeight: 1.75 }}>{p.body}</p>
            </GlowCard>
          ))}
        </div>

      </div>
    </section>
  );
}
