import { UserCheck, Scale, Clock, ShieldCheck } from "lucide-react";

const WhyChoose = () => {
  const features = [
    {
      icon: UserCheck,
      title: "Consultant Reporting",
      description:
        "All reports authored and signed by a UK-based Consultant Radiologist.",
    },
    {
      icon: Scale,
      title: "Medico-legal Confidence",
      description:
        "Structured reports designed to support safe clinical decision-making and documentation.",
    },
    {
      icon: Clock,
      title: "Reliable Turnaround",
      description:
        "Standard reporting within 2-3 working days, with optional 24 hour priority service available.",
    },
    {
      icon: ShieldCheck,
      title: "GDPR Compliant",
      description: "Safe handling of all data in accordance with UK data protection regulations.",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section divider */}
        <div className="flex items-center justify-center mb-16">
          <div className="h-px flex-1 bg-border" />
          <h2 className="px-8 text-xl sm:text-2xl font-semibold text-primary tracking-tight">
            Why Choose DentaRad
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group text-center"
            >
              <div className="w-12 h-12 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/10 transition-colors">
                <feature.icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm tracking-wide uppercase">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
