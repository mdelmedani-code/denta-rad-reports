import { Upload, FileText, Send } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      number: "01",
      title: "Upload",
      description: "Securely upload your CBCT scans through our encrypted portal with patient anonymisation"
    },
    {
      icon: FileText,
      number: "02", 
      title: "Reported",
      description: "Specialist radiologist reviews and provides comprehensive analysis within 3-5 working days"
    },
    {
      icon: Send,
      number: "03",
      title: "Delivered",
      description: "Receive detailed report with findings and recommendations directly to your secure inbox"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Simple, secure, and professional. Get expert CBCT reporting in three easy steps.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines - Hidden on mobile */}
          <div className="hidden lg:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-gold to-primary"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative text-center animate-scale-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary text-white font-bold text-xl mb-6 shadow-medium">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-card border border-silver/20 shadow-soft mb-6 group hover:shadow-medium transition-all duration-300">
                  <step.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                
                {/* Content */}
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <div className="bg-gradient-card rounded-2xl p-8 border border-silver/20 shadow-soft max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Secure & Compliant
            </h3>
            <p className="text-muted-foreground">
              All uploads are encrypted and GDPR compliant. Patient data is anonymised and handled according to strict NHS and GMC guidelines.
              Professional indemnity and clinical governance protocols ensure the highest standards of care.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;