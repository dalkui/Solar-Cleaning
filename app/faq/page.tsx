import Navbar from "@/components/Navbar";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function FAQPage() {
  return (
    <main style={{ background: "var(--bg)" }}>
      <Navbar />
      <div style={{ paddingTop: "68px" }}>
        <FAQ />
      </div>
      <Footer />
    </main>
  );
}
