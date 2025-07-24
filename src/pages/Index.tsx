import Hero from "@/components/Hero";
import WhyChoose from "@/components/WhyChoose";
import Pricing from "@/components/Pricing";
import HowItWorks from "@/components/HowItWorks";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <WhyChoose />
      <HowItWorks />
      <Pricing />
      <About />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
