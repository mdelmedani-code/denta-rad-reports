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
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/privacy" element={<PrivacyNotice />} />
            <Route path="/verify/:token?" element={<SignatureVerification />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* All routes - auth removed for exploration */}
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/upload-case" element={<AppLayout><UploadCase /></AppLayout>} />
            <Route path="/invoices" element={<AppLayout><ClinicInvoices /></AppLayout>} />
            <Route path="/admin/audit-logs" element={<AppLayout><AuditLogs /></AppLayout>} />
            <Route path="/admin/security-dashboard" element={<AppLayout><SecurityDashboard /></AppLayout>} />
            <Route path="/admin/users" element={<AppLayout><UserManagementPage /></AppLayout>} />
            <Route path="/admin/email-templates" element={<AppLayout><EmailTemplateSettings /></AppLayout>} />
            <Route path="/admin/report-template-settings" element={<AppLayout><ReportTemplateSettings /></AppLayout>} />
            <Route path="/admin/data-retention" element={<AppLayout><DataRetentionPage /></AppLayout>} />
            <Route path="/admin/pdf-template" element={<AppLayout><PDFTemplateSettings /></AppLayout>} />
            <Route path="/admin/template-editor" element={<AppLayout><TemplateEditor /></AppLayout>} />
            <Route path="/admin/invoicing" element={<AppLayout><UnifiedInvoicing /></AppLayout>} />
            <Route path="/admin/invoice-settings" element={<AppLayout><InvoiceSettings /></AppLayout>} />
            <Route path="/admin/invoice-history" element={<AppLayout><InvoiceHistory /></AppLayout>} />
            <Route path="/admin/incidents" element={<IncidentRegister />} />
            
            <Route path="/admin/monthly-invoicing" element={<Navigate to="/admin/invoicing" replace />} />
            <Route path="/admin/invoicing-page" element={<Navigate to="/admin/invoicing" replace />} />
            <Route path="/admin/invoice-viewer" element={<Navigate to="/admin/invoicing" replace />} />
            <Route path="/admin/billing-export" element={<Navigate to="/admin/invoicing" replace />} />
            
            <Route path="/reporter" element={<AppLayout><UnifiedDashboard /></AppLayout>} />
            <Route path="/billing-export" element={<AppLayout><BillingExport /></AppLayout>} />
            <Route path="/snippets" element={<AppLayout><SnippetManager /></AppLayout>} />
            <Route path="/viewer/:caseId" element={<AppLayout><ViewerPage /></AppLayout>} />
            <Route path="/reporter/case/:id" element={<AppLayout><AdminCaseReview /></AppLayout>} />
            <Route path="/reporter/report/:caseId" element={<ReportBuilder />} />
            <Route path="/admin/reports/:reportId" element={<AppLayout><CaseReportPage /></AppLayout>} />
            
            <Route path="/admin" element={<Navigate to="/reporter" replace />} />
            <Route path="/admin/reporter" element={<Navigate to="/reporter" replace />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
