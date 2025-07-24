import { Badge } from "@/components/ui/badge";
import { Award, GraduationCap, Shield, Stethoscope } from "lucide-react";

const About = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="animate-fade-in">
            <Badge variant="secondary" className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20">
              <Award className="w-4 h-4 mr-2" />
              Consultant Radiologist
            </Badge>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              About the Radiologist
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              A GMC-registered consultant radiologist with subspecialty expertise in head and neck imaging, 
              providing professional teleradiology services to dental practitioners across the UK.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Specialist Training
                  </h3>
                  <p className="text-muted-foreground">
                    Subspecialty fellowship in head and neck radiology with extensive experience in dental and maxillofacial imaging
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Professional Standards
                  </h3>
                  <p className="text-muted-foreground">
                    GMC registration with full professional indemnity, clinical governance protocols, and adherence to RCR guidelines
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Clinical Focus
                  </h3>
                  <p className="text-muted-foreground">
                    Dedicated to supporting dental practitioners with accurate, timely interpretation of CBCT imaging for optimal patient care
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual Elements */}
          <div className="relative animate-slide-up">
            <div className="bg-gradient-card rounded-3xl p-8 shadow-large border border-silver/20">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto flex items-center justify-center shadow-medium">
                  <Award className="w-16 h-16 text-white" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Professional Credentials
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Maintaining the highest standards of radiological practice
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-lg font-bold text-primary">GMC</div>
                    <div className="text-sm text-muted-foreground">Registered</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-lg font-bold text-primary">RCR</div>
                    <div className="text-sm text-muted-foreground">Member</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-lg font-bold text-primary">H&N</div>
                    <div className="text-sm text-muted-foreground">Subspecialty</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-lg font-bold text-primary">CBCT</div>
                    <div className="text-sm text-muted-foreground">Certified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;