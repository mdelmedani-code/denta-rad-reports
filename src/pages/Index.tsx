import Hero from "@/components/Hero";
import WhyChoose from "@/components/WhyChoose";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(
          180deg,
          hsl(215, 84%, 16%) 0%,
          hsl(215, 84%, 12%) 10%,
          hsl(215, 60%, 20%) 25%,
          hsl(45, 86%, 58%) 50%,
          hsl(45, 95%, 75%) 60%,
          hsl(0, 0%, 100%) 80%,
          hsl(0, 0%, 100%) 100%
        )`,
      }}
    >
      <Hero />
      <WhyChoose />
      <HowItWorks />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
