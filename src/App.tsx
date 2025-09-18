import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import UploadCase from "./pages/UploadCase";
import AdminDashboard from "./pages/AdminDashboard";
import Invoices from "./pages/Invoices";
import ReporterDashboard from "./pages/ReporterDashboard";
import ReportingPage from "./pages/ReportingPage";
import PDFTemplateSettings from "./pages/PDFTemplateSettings";

import NotFound from "./pages/NotFound";

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload-case" element={<UploadCase />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/invoices" element={<Invoices />} />
            <Route path="/admin/reporter" element={<ReporterDashboard />} />
            <Route path="/admin/reporter/case/:caseId" element={<ReportingPage />} />
            <Route path="/admin/pdf-templates" element={<PDFTemplateSettings />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
