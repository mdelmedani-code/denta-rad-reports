import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import MeetTheTeamPage from "./pages/MeetTheTeamPage";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import UploadCase from "./pages/UploadCase";
import AdminDashboard from "./pages/AdminDashboard";
import ReporterDashboard from "./pages/ReporterDashboard";
import AdminCaseReview from "./pages/AdminCaseReview";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import BillingExport from "./pages/BillingExport";
import ViewerPage from "./pages/ViewerPage";
import ReportBuilder from "./pages/ReportBuilder";
import CaseReportPage from "./pages/CaseReportPage";
import SignatureVerification from "./pages/SignatureVerification";
import SnippetManager from "./pages/SnippetManager";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAuth from "./components/RequireAuth";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyNotice from "./pages/PrivacyNotice";
import AuditLogs from "./pages/AuditLogs";
import SecurityDashboard from "./pages/SecurityDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import DataRetentionPage from "./pages/admin/DataRetentionPage";
import PDFTemplateSettings from "./pages/admin/PDFTemplateSettings";
import TemplateEditor from "./pages/TemplateEditor";
import UnifiedInvoicing from "./pages/admin/UnifiedInvoicing";
import InvoiceSettings from "./pages/admin/InvoiceSettings";
import InvoiceHistory from "./pages/admin/InvoiceHistory";
import EmailTemplateSettings from "./pages/admin/EmailTemplateSettings";
import ReportTemplateSettings from "./pages/admin/ReportTemplateSettings";
import ClinicInvoices from "./pages/ClinicInvoices";
import IncidentRegister from "./pages/admin/IncidentRegister";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/meet-the-team" element={<MeetTheTeamPage />} />
            <Route path="/privacy" element={<PrivacyNotice />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
