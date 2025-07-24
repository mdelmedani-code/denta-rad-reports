import { Shield, Clock, Award, FileText } from "lucide-react";

const WhyChoose = () => {
  const features = [
    {
      icon: Shield,
      title: "Specialist Expertise",
      description: "Consultant radiologist with head and neck subspecialty training, ensuring accurate interpretation of complex anatomical structures."
    },
    {
      icon: Clock,
      title: "Reliable Turnaround",
      description: "Standard 3-5 working day reporting with optional 24-hour priority service for urgent clinical decisions."
    },
    {
      icon: FileText,
      title: "Comprehensive Reports",
      description: "Detailed analysis covering both dental pathology and incidental findings, supporting informed treatment planning."
    },
    {
      icon: Award,
      title: "Clinical Trust",
      description: "GMC registered specialist providing professional indemnity and clinical governance for your practice."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Why Choose DentaRad?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional teleradiology services designed specifically for dental practitioners seeking expert CBCT interpretation
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-8 bg-gradient-card rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 animate-scale-in border border-silver/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;