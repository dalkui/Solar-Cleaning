import { InfiniteGrid } from "@/components/ui/the-infinite-grid";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import WhyUs from "@/components/WhyUs";
import HowItWorks from "@/components/HowItWorks";
import PricingModal from "@/components/PricingModal";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ background: "var(--bg)" }}>
      <Navbar />
      <InfiniteGrid backgroundImage="/hero-panels.jpg">
        <Hero />
      </InfiniteGrid>
      <TrustBar />
      <HowItWorks />
      <PricingModal />
      <WhyUs />
      <Footer />
    </main>
  );
}
