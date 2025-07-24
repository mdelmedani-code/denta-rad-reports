import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Award, ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-navy-deep/20"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="animate-fade-in">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-2 bg-white/10 text-white border-white/20 backdrop-blur-sm">
            <Award className="w-4 h-4 mr-2" />
            UK Consultant Radiologist • GMC Registered
          </Badge>
          
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Expert CBCT
            <br />
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              Teleradiology
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-white/90 mb-4 max-w-3xl mx-auto leading-relaxed">
            Professional remote reporting of dental CBCT scans by a specialist head and neck radiologist
          </p>
          
          {/* Company Info */}
          <p className="text-lg text-white/70 mb-12">
            <strong className="text-white">DentaRad</strong> • A trading name of Radelm Ltd
          </p>
        </div>
        
        <div className="animate-slide-up">
          {/* Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Clock className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-white font-semibold">3-5 Day Turnaround</p>
              <p className="text-white/70 text-sm">24h priority available</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <FileText className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-white font-semibold">Comprehensive Reports</p>
              <p className="text-white/70 text-sm">Dental & incidental findings</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Award className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-white font-semibold">Specialist Expertise</p>
              <p className="text-white/70 text-sm">Head & neck subspecialty</p>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="premium" size="lg" className="text-lg px-8 py-6 h-auto">
              Refer a Case
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-navy">
              Register for Access
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;