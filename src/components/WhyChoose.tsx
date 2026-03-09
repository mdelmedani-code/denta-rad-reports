const WhyChoose = () => {
  const features = [
    {
      title: "Consultant Reporting",
      description:
        "All reports authored and signed by a UK-based Consultant Radiologist.",
    },
    {
      title: "Medico-legal confidence",
      description:
        "Structured reports designed to support safe clinical decision-making and documentation.",
    },
    {
      title: "Reliable turnaround",
      description:
        "Standard reporting within 2-3 working days, with optional 24 hour priority service available.",
    },
    {
      title: "GDPR compliant",
      description: "Safe handling of all data.",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="space-y-5">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-accent flex-shrink-0" />
              <p className="text-foreground leading-relaxed">
                <span className="font-semibold">{feature.title}:</span>{" "}
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default WhyChoose;
