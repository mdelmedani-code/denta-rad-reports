import { Link } from "react-router-dom";
import dentaradLogo from "@/assets/dentarad-logo-new.png";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <img
              src={dentaradLogo}
              alt="DentaRad"
              className="h-12 object-contain mb-3 mx-auto sm:mx-0"
            />
            <p className="text-sm text-primary-foreground/70">
              Dental Radiology Reporting Service
            </p>
            <p className="text-sm text-primary-foreground/70 mt-1">
              info@dentarad.co.uk
            </p>
            <p className="text-xs text-primary-foreground/40 mt-2">
              Trading name of Radelm Ltd.
            </p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2 text-sm text-primary-foreground/60">
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/meet-the-team" className="hover:text-primary-foreground transition-colors">
              Meet the Team
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} DentaRad — Radelm Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
