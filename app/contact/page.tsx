import Navbar from "@/components/Navbar";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export default function ContactPage() {
  return (
    <main style={{ background: "var(--bg)" }}>
      <Navbar />
      <div style={{ paddingTop: "68px" }}>
        <ContactForm />
      </div>
      <Footer />
    </main>
  );
}
