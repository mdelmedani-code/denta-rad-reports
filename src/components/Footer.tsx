import { Link } from "react-router-dom";
import dentaradLogo from "@/assets/dentarad-logo-new.png";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main footer bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold">
              DENTARAD{" "}
              <span className="font-normal opacity-80">
                | Dental Radiology Reporting Service
              </span>
            </p>
            <p className="text-sm opacity-70">
              www.dentarad.co.uk | info@dentarad.co.uk
            </p>
            <p className="text-xs opacity-50 mt-1">
              Trading name of Radelm Ltd.
            </p>
          </div>
          <img
            src={dentaradLogo}
            alt="DentaRad"
            className="h-10 object-contain opacity-80"
          />
        </div>
      </div>

      {/* Bottom links */}
      <div className="border-t border-primary-foreground/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs opacity-60">
            <span>© {new Date().getFullYear()} DentaRad — Radelm Ltd.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:opacity-100 transition-opacity">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="hover:opacity-100 transition-opacity">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
