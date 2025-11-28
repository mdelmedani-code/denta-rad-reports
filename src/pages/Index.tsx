import { Link } from "react-router-dom";
import logo from "@/assets/dentarad-logo-cropped.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img 
            src={logo} 
            alt="DentaRad" 
            className="h-32 w-auto"
          />
        </div>

        {/* Company Info */}
        <p className="text-sm text-muted-foreground/70 mb-8">
          Dentarad is a trading name of Radelm Ltd.
        </p>

        {/* Main Message */}
        <div className="space-y-4">
          <p className="text-xl text-muted-foreground">
            CBCT Teleradiology Services
          </p>
          <div className="pt-4">
            <div className="inline-block px-6 py-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-lg text-foreground font-medium">
                Invitation Only
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This platform is currently available to registered clinics only
              </p>
            </div>
          </div>
        </div>

        {/* Subtle Login Links */}
        <div className="pt-12 space-y-2">
          <p className="text-sm text-muted-foreground/60">
            Already registered?
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link 
              to="/login" 
              className="text-muted-foreground/70 hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Clinic Login
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link 
              to="/admin/login" 
              className="text-muted-foreground/70 hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
