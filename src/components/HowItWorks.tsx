import {
  Scan,
  Crosshair,
  Brain,
  Bone,
  Siren,
  Wind,
} from "lucide-react";

const services = [
  {
    icon: Scan,
    title: "General Review",
    description: "Comprehensive evaluation of the oral and maxillofacial region for incidental findings and pathology.",
  },
  {
    icon: Crosshair,
    title: "Implant Planning",
    description: "Measurement of bone levels and analysis of bone quality in proposed implant sites.",
  },
  {
    icon: Brain,
    title: "Impacted Teeth",
    description: "Identification of anatomical structures and potential complications involving impacted teeth.",
  },
  {
    icon: Bone,
    title: "Jaw Pathology",
    description: "Radiographic interpretation of suspected oral and maxillofacial pathology.",
  },
  {
    icon: Siren,
    title: "Endodontic Evaluation",
    description: "Evaluation for apical pathology, root fractures, and abnormal tooth morphology.",
  },
  {
    icon: Wind,
    title: "Sinus Assessment",
    description: "Maxillary sinus and paranasal evaluation for sinus disease and related disorders.",
  },
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="group p-6 rounded-lg border border-border bg-card hover:border-accent/30 hover:shadow-soft transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-full border border-accent/20 bg-accent/5 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <service.icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-base">{service.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
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
                <p className="text-sm text-muted-foreground leading-relaxed">
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
