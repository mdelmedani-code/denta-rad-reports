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
      <section className="py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Comprehensive Dental Radiology Reports
            </h2>
            <p className="text-accent font-medium">
              CBCT reports, panoramic interpretation, and more
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-medium hover:border-accent/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Submit */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              How It Works
            </h2>
            <p className="text-primary-foreground/70">
              Simple, secure, and efficient
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-accent text-accent-foreground font-bold text-xl flex items-center justify-center mx-auto mb-5">
                  {step.num}
                </div>
                <p className="text-primary-foreground/90 leading-relaxed">
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
