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
import ReporterDashboard from "./pages/ReporterDashboard";
import AdminCaseReview from "./pages/AdminCaseReview";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import BillingExport from "./pages/BillingExport";
import ViewerPage from "./pages/ViewerPage";
import ReportBuilder from "./pages/ReportBuilder";
import CaseReportPage from "./pages/CaseReportPage";
import SignatureVerification from "./pages/SignatureVerification";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAuth from "./components/RequireAuth";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyNotice from "./pages/PrivacyNotice";
import AuditLogs from "./pages/AuditLogs";
import SecurityDashboard from "./pages/SecurityDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import InvoicingPage from "./pages/admin/InvoicingPage";
import CreateInvoicePage from "./pages/admin/CreateInvoicePage";
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
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/privacy" element={<PrivacyNotice />} />
            <Route path="/verify/:token?" element={<SignatureVerification />} />
            
            {/* Terms of Service - requires auth but not terms acceptance */}
            <Route path="/terms-of-service" element={
              <RequireAuth>
                <TermsOfService />
              </RequireAuth>
            } />
            
            {/* Clinic routes - protected with layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="clinic">
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/upload-case" element={
              <ProtectedRoute requiredRole="clinic">
                <AppLayout>
                  <UploadCase />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin routes - protected with layout */}
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <AuditLogs />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/security-dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <SecurityDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <UserManagementPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/invoices" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <InvoicingPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/invoices/create" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <CreateInvoicePage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Unified dashboard for reporter/admin */}
            <Route path="/reporter" element={
              <ProtectedRoute requiredRole="reporter">
                <AppLayout>
                  <UnifiedDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Billing export */}
            <Route path="/billing-export" element={
              <ProtectedRoute requiredRole="reporter">
                <AppLayout>
                  <BillingExport />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Viewer page */}
            <Route path="/viewer/:caseId" element={
              <ProtectedRoute requiredRole="reporter">
                <AppLayout>
                  <ViewerPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Reporter case review */}
            <Route path="/reporter/case/:id" element={
              <ProtectedRoute requiredRole="reporter">
                <AppLayout>
                  <AdminCaseReview />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Report builder */}
            <Route path="/reporter/report/:caseId" element={
              <ProtectedRoute requiredRole="reporter">
                <ReportBuilder />
              </ProtectedRoute>
            } />
            
            {/* Case Report Page - accessible by both clinic and admin */}
            <Route path="/admin/reports/:reportId" element={
              <RequireAuth>
                <AppLayout>
                  <CaseReportPage />
                </AppLayout>
              </RequireAuth>
            } />
            
            {/* Legacy admin routes redirect to unified dashboard */}
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
