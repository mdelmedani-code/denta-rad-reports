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
    <section className="py-24 bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Why Choose DentaRad?
          </h2>
          <p className="text-primary-foreground/50 max-w-2xl mx-auto">
            Expert dental radiology reporting you can rely on
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group text-center p-6 rounded-xl border border-primary-foreground/10 bg-white/10 backdrop-blur-sm hover:border-accent/30 hover:bg-white/15 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-bold text-primary-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">
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
