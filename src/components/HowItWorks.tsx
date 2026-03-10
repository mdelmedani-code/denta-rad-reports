const services = [
  "General Review",
  "Implant Planning",
  "Impacted Teeth",
  "Jaw Pathology",
  "Endodontic Evaluation",
  "Sinus Assessment",
];

const steps = [
  { num: "1", text: "Upload scan via our secure web-based portal." },
  { num: "2", text: "Provide your clinical question and patient details." },
  { num: "3", text: "Receive a structured report via secure channel." },
];

const HowItWorks = () => {
  return (
    <>
      {/* Services Grid */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-accent font-medium mb-3">Reporting Services</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight">
              Comprehensive Reports
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {services.map((service) => (
              <div
                key={service}
                className="flex items-center justify-center rounded-lg border border-border bg-card text-lg font-medium text-foreground hover:border-accent/30 transition-colors py-6 px-4"
              >
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Submit */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] text-accent font-medium mb-3">Simple Process</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight">
              How to Submit Cases
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, index) => (
              <div key={step.num} className="text-center relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[60%] w-[80%] h-px bg-border" />
                )}
                <div className="w-10 h-10 rounded-full border border-accent bg-accent/5 text-accent font-semibold text-sm flex items-center justify-center mx-auto mb-5">
                  {step.num}
                </div>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;
