import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dentaradLogo from "@/assets/dentarad-logo-new.svg";
import heroMandible from "@/assets/hero-mandible.png";
import heroMandibleBg from "@/assets/hero-mandible-bg.png";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-background overflow-hidden">
      {/* Translucent mandible background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${heroMandibleBg})`,
          backgroundSize: '130%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.21,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      {/* Subtle warm glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="flex flex-col items-center text-center">
          {/* Logo + Mandible side by side */}
          <div className="flex items-center justify-center mb-0">
            <img
              src={dentaradLogo}
              alt="DentaRad Logo"
              className="w-80 sm:w-[28rem] lg:w-[36rem] xl:w-[42rem] object-contain"
            />
          </div>

          {/* Gold accent line */}
          <div className="w-12 h-px bg-accent mb-2" />

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
