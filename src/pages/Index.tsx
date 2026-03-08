import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import WhyChoose from "@/components/WhyChoose";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home, Upload, FileText, BarChart3, Shield, Settings, ScrollText, 
  Users, Receipt, Database, FileCog, Palette, Mail, AlertTriangle, 
  Eye, MessageSquareText, Lock
} from "lucide-react";

const devPages = [
  { section: "Public Pages", items: [
    { title: "Landing Page", url: "/", icon: Home },
    { title: "Privacy Notice", url: "/privacy", icon: Shield },
    { title: "Signature Verification", url: "/verify", icon: Eye },
  ]},
  { section: "Clinic Pages", items: [
    { title: "Clinic Login", url: "/login", icon: Lock },
    { title: "Clinic Dashboard", url: "/dashboard", icon: Home },
    { title: "Upload Case", url: "/upload-case", icon: Upload },
    { title: "Clinic Invoices", url: "/invoices", icon: Receipt },
  ]},
  { section: "Reporter / Admin Pages", items: [
    { title: "Admin Login", url: "/admin/login", icon: Lock },
    { title: "Unified Dashboard", url: "/reporter", icon: BarChart3 },
    { title: "Snippet Manager", url: "/snippets", icon: MessageSquareText },
    { title: "Billing Export", url: "/billing-export", icon: FileText },
  ]},
  { section: "Admin Settings", items: [
    { title: "Invoicing", url: "/admin/invoicing", icon: Receipt },
    { title: "Invoice History", url: "/admin/invoice-history", icon: ScrollText },
    { title: "Invoice Settings", url: "/admin/invoice-settings", icon: Settings },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Data Retention", url: "/admin/data-retention", icon: Database },
    { title: "PDF Template", url: "/admin/pdf-template", icon: FileCog },
    { title: "Template Editor", url: "/admin/template-editor", icon: Palette },
    { title: "Email Templates", url: "/admin/email-templates", icon: Mail },
    { title: "Report Template", url: "/admin/report-template-settings", icon: FileText },
    { title: "Security Dashboard", url: "/admin/security-dashboard", icon: Shield },
    { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
    { title: "Incident Register", url: "/admin/incidents", icon: AlertTriangle },
  ]},
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />

      {/* Dev Navigation - All Pages */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 text-sm">🛠 Dev Mode</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-2">All Pages</h2>
            <p className="text-muted-foreground">Browse every page in the app (auth guards still apply for protected routes)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {devPages.map((group) => (
              <Card key={group.section} className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{group.section}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span>{item.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{item.url}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <WhyChoose />
      <HowItWorks />
      <Pricing />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
