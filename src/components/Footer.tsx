import { Link } from "react-router-dom";
import dentaradLogo from "@/assets/dentarad-logo-clean.png";
import icoLogo from "@/assets/ico-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      {/* Main footer */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <img
              src={dentaradLogo}
              alt="DentaRad"
              className="h-10 object-contain mb-3 mx-auto sm:mx-0"
            />
            <p className="text-sm text-muted-foreground">
              Dental Radiology Reporting Service
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              info@dentarad.co.uk
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Trading name of Radelm Ltd.
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <img src={icoLogo} alt="ICO - Information Commissioner's Office" className="h-8 rounded" />
              <span className="text-xs text-muted-foreground">ICO Registered: ZC105797</span>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/data-processing-agreement" className="hover:text-primary transition-colors">
              Data Processing Agreement
            </Link>
            <Link to="/meet-the-team" className="hover:text-primary transition-colors">
              Meet the Team
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} DentaRad — Radelm Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
