import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dentaradLogo from "@/assets/dentarad-logo-new.png";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-background overflow-hidden">
      {/* Subtle warm glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <img
            src={dentaradLogo}
            alt="DentaRad Logo"
            className="w-56 sm:w-72 lg:w-80 mb-8 object-contain"
          />

          {/* Gold accent line */}
          <div className="w-12 h-px bg-accent mb-8" />

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-primary mb-4">
            Dental Radiology
            <br />
            <span className="font-semibold">Reporting Service</span>
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-12 max-w-xl">
            Specialist CBCT and OPG reporting by UK trained and registered
            Dental &amp; Oral Maxillofacial Radiologists.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 h-12 text-base"
              >
                Send Scan for Reporting
              </Button>
            </Link>
            <a href="#register">
              <Button
                size="lg"
                variant="outline"
                className="border-accent text-accent-foreground hover:bg-accent/5 font-medium px-8 h-12 text-base transition-all duration-300"
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
