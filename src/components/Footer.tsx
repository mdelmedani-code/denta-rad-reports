import { Badge } from "@/components/ui/badge";

const Footer = () => {
  return (
    <footer className="bg-navy-deep text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-gold bg-clip-text text-transparent">
              DentaRad
            </h3>
            <p className="text-white/80 mb-4">
              A trading name of Radelm Ltd
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              Expert CBCT teleradiology services by a specialist head and neck radiologist. 
              Professional, secure, and reliable reporting for dental practitioners across the UK.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>CBCT Scan Reporting</li>
              <li>Priority 24h Service</li>
              <li>IAN Nerve Tracing</li>
              <li>Incidental Findings Analysis</li>
              <li>Clinical Consultation</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-white/70 text-sm">
              <p>referrals@dentarad.co.uk</p>
              <p>Secure portal access nationwide</p>
              <div className="pt-4">
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  GMC Registered
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-white/60 text-sm">
              © 2024 DentaRad - Radelm Ltd. All rights reserved.
            </div>
            <div className="flex space-x-6 text-white/60 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Clinical Governance</a>
              <a href="/admin/login" className="hover:text-white transition-colors opacity-50 text-xs">Admin</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;