const HowItWorks = () => {
  const indications = [
    "Implant and surgical planning",
    "Impacted teeth assessment",
    "Endodontic evaluation",
    "Jaw Pathology",
    "Maxillary sinus assessment",
  ];

  const steps = [
    "Upload scan via secure web-based portal.",
    "Provide clinical question and patient's details.",
    "Receive structured report via secure channel.",
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Typical Indications */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">
              Typical indications:
            </h2>
            <ul className="space-y-3">
              {indications.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How to Submit */}
          <div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-5 text-center">
                How to submit cases:
              </h2>
              <ol className="space-y-4">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-foreground text-sm leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
