import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import UploadCase from "./pages/UploadCase";
import AdminDashboard from "./pages/AdminDashboard";
import Invoices from "./pages/Invoices";
import ReporterDashboard from "./pages/ReporterDashboard";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import BillingExport from "./pages/BillingExport";
import ReportingPage from "./pages/ReportingPage";
import ViewerPage from "./pages/ViewerPage";
import PDFTemplateSettings from "./pages/PDFTemplateSettings";
import TemplateManagement from "./pages/TemplateManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAuth from "./components/RequireAuth";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyNotice from "./pages/PrivacyNotice";
import MFASetup from "./pages/MFASetup";
import AuditLogs from "./pages/AuditLogs";

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
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/privacy" element={<PrivacyNotice />} />
            
            {/* MFA Setup - requires auth but before MFA enforcement */}
            <Route path="/mfa-setup" element={
              <RequireAuth>
                <MFASetup />
              </RequireAuth>
            } />
            
            {/* Terms of Service - requires auth but not terms acceptance */}
            <Route path="/terms-of-service" element={
              <RequireAuth>
                <TermsOfService />
              </RequireAuth>
            } />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload-case" element={<UploadCase />} />
            
            {/* Audit Logs - admin only */}
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute requiredRole="admin">
                <AuditLogs />
              </ProtectedRoute>
            } />
            
            {/* Unified dashboard for reporter/admin */}
            <Route path="/reporter" element={
              <ProtectedRoute requiredRole="admin">
                <UnifiedDashboard />
              </ProtectedRoute>
            } />
            
            {/* Billing export */}
            <Route path="/billing-export" element={
              <ProtectedRoute requiredRole="admin">
                <BillingExport />
              </ProtectedRoute>
            } />
            
            {/* Viewer page */}
            <Route path="/viewer/:caseId" element={
              <ProtectedRoute requiredRole="admin">
                <ViewerPage />
              </ProtectedRoute>
            } />
            
            {/* Legacy admin routes redirect to unified dashboard */}
            <Route path="/admin" element={<Navigate to="/reporter" replace />} />
            <Route path="/admin/reporter" element={<Navigate to="/reporter" replace />} />
            
            <Route path="/admin/invoices" element={
              <ProtectedRoute requiredRole="admin">
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/admin/reporter/case/:caseId" element={
              <ProtectedRoute requiredRole="admin">
                <ReportingPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/pdf-templates" element={
              <ProtectedRoute requiredRole="admin">
                <PDFTemplateSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/template-management" element={
              <ProtectedRoute requiredRole="admin">
                <TemplateManagement />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
