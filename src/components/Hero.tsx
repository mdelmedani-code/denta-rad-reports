import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dentaradLogo from "@/assets/dentarad-logo-new.png";
import heroBg from "@/assets/hero-cbct-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Dark overlay with navy tint */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/50" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="max-w-2xl">
          {/* Logo */}
          <img
            src={dentaradLogo}
            alt="DentaRad Logo"
            className="w-64 sm:w-80 lg:w-96 mb-8 object-contain"
          />

          {/* Subtitle */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-wide text-primary-foreground/90 mb-4">
            Dental Radiology Reporting Service
          </h1>

          {/* Accent line */}
          <div className="w-20 h-1 bg-accent mb-6" />

          {/* Description */}
          <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
            Comprehensive CBCT and OPG interpretation including dental structures, 
            maxillofacial anatomy and clinically significant incidental findings.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 h-12 text-base shadow-gold"
              >
                Upload Case
              </Button>
            </Link>
            <a href="#register">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-8 h-12 text-base"
              >
                Register Interest
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
