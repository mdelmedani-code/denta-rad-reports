import Hero from "@/components/Hero";
import CBCTShowcase from "@/components/CBCTShowcase";
import WhyChoose from "@/components/WhyChoose";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
