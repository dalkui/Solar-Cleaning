"use client";
import { GlowCard } from "@/components/ui/spotlight-card";

const areas = [
  { region: "Inner Melbourne", suburbs: ["CBD", "Fitzroy", "Collingwood", "Richmond", "South Yarra", "Prahran", "St Kilda", "Port Melbourne"] },
  { region: "Northern Suburbs", suburbs: ["Brunswick", "Coburg", "Northcote", "Preston", "Reservoir", "Bundoora", "Epping", "Whittlesea"] },
  { region: "Eastern Suburbs", suburbs: ["Box Hill", "Doncaster", "Ringwood", "Croydon", "Lilydale", "Mooroolbark", "Warrandyte", "Eltham"] },
  { region: "South-Eastern Suburbs", suburbs: ["Glen Waverley", "Dandenong", "Cranbourne", "Berwick", "Pakenham", "Frankston", "Mornington", "Chelsea"] },
  { region: "Southern Suburbs", suburbs: ["Brighton", "Sandringham", "Mentone", "Mordialloc", "Cheltenham", "Moorabbin", "Bentleigh", "Carnegie"] },
  { region: "Western Suburbs", suburbs: ["Footscray", "Sunshine", "Werribee", "Hoppers Crossing", "Point Cook", "Altona", "Williamstown", "Laverton"] },
];

export default function ServiceArea() {
  return (
    <section id="service-area" style={{ background: "var(--bg-alt)", padding: "64px 40px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "16px" }}>Service Area</span>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 54px)", marginBottom: "16px" }}>
            Servicing all of Melbourne<br />
            <em className="g-text">and greater Melbourne.</em>
          </h2>
          <p style={{ fontSize: "17px", color: "var(--text-sub)", lineHeight: 1.75, maxWidth: "560px" }}>
            From the CBD to the outer suburbs — if you're in Melbourne, we come to you. Not sure if we cover your area? Just ask.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }} className="area-grid">
          {areas.map((area) => (
            <GlowCard key={area.region} glowColor="orange" style={{ background: "var(--bg-card)", padding: "24px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold)", marginBottom: "14px", fontFamily: "var(--body)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {area.region}
              </h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {area.suburbs.map((s) => (
                  <li key={s} style={{ fontSize: "14px", color: "var(--text-sub)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--text-muted)", flexShrink: 0 }} />
                    {s}
                  </li>
                ))}
              </ul>
            </GlowCard>
          ))}
        </div>

        <GlowCard glowColor="orange" style={{ marginTop: "16px", background: "rgba(245,197,24,0.05)", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px", fontFamily: "var(--body)" }}>Don't see your suburb?</p>
            <p style={{ fontSize: "14px", color: "var(--text-sub)" }}>We're expanding coverage regularly. Get in touch and we'll let you know.</p>
          </div>
          <a href="/contact" className="btn btn-gold" style={{ fontSize: "14px", whiteSpace: "nowrap" }}>Check Your Area →</a>
        </GlowCard>

      </div>
    </section>
  );
}
