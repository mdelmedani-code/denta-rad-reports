import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dentaradLogo from "@/assets/dentarad-logo-new.png";
import heroBg from "@/assets/hero-cbct-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215,84%,6%)/0.95] via-[hsl(215,84%,10%)/0.88] to-[hsl(215,60%,14%)/0.80]" />
      
      {/* Subtle animated glow accent */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/6 w-64 h-64 bg-accent/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="max-w-2xl">
          {/* Logo */}
          <img
            src={dentaradLogo}
            alt="DentaRad Logo"
            className="w-64 sm:w-80 lg:w-96 mb-10 object-contain"
          />

          {/* Subtitle */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-wide text-primary-foreground mb-4">
            Dental CBCT
            <br />
            <span className="font-semibold">Radiology Reports</span>
          </h1>

          {/* Accent line */}
          <div className="w-16 h-0.5 bg-accent mb-6" />

          {/* Description */}
          <p className="text-primary-foreground/70 text-base sm:text-lg leading-relaxed mb-12 max-w-xl">
            We offer specialist dental teleradiology — CBCT and OPG reporting 
            service provided by UK trained and registered Dental & Oral 
            Maxillofacial Radiologists.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 h-12 text-base shadow-gold"
              >
                Send Scan for Reporting
              </Button>
            </Link>
            <a href="#register">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/5 hover:border-accent/40 font-semibold px-8 h-12 text-base transition-all duration-300"
              >
                Register Interest
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(215,84%,6%)] to-transparent" />
    </section>
  );
};

export default Hero;
