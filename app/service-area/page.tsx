import Navbar from "@/components/Navbar";
import ServiceArea from "@/components/ServiceArea";
import Footer from "@/components/Footer";

export default function ServiceAreaPage() {
  return (
    <main style={{ background: "var(--bg)" }}>
      <Navbar />
      <div style={{ paddingTop: "68px" }}>
        <ServiceArea />
      </div>
      <Footer />
    </main>
  );
}
