import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3 } from 'lucide-react';
import ReporterDashboard from './ReporterDashboard';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '@/hooks/useAuth';

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cases');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage cases, view statistics, and export billing
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Cases
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <ReporterDashboard />
          </TabsContent>

          <TabsContent value="stats">
            <AdminDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
