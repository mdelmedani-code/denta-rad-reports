import dentaradLogo from "@/assets/dentarad-logo-cropped.jpg";

const Hero = () => {
  return (
    <section className="relative bg-background py-16 sm:py-24 overflow-hidden">
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src={dentaradLogo}
            alt="DentaRad Logo"
            className="h-20 sm:h-24 mx-auto object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide text-accent uppercase mb-8">
          Dental Radiology Reporting Service
        </h1>

        {/* Divider */}
        <div className="w-24 h-0.5 bg-accent mx-auto mb-10" />


        {/* Comprehensive Reports */}
        <div className="max-w-3xl mx-auto mb-12">
          <p className="text-foreground leading-relaxed">
            <span className="font-semibold">Comprehensive reports:</span> CBCT
            and OPG interpretation including dental structures, maxillofacial
            anatomy and clinically significant incidental findings.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
