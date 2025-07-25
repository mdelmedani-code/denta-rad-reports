import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Clock, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationPreferences } from "@/components/NotificationPreferences";

interface Case {
  id: string;
  patient_name: string;
  upload_date: string;
  clinical_question: string;
  status: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';
  urgency: 'standard' | 'urgent';
  field_of_view: 'small' | 'large';
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load cases: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'report_ready': return 'bg-green-100 text-green-800';
      case 'awaiting_payment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">DentaRad Portal</h1>
              <p className="text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Clinic Dashboard
              </CardTitle>
              <CardDescription>
                Manage your CBCT scan submissions and access reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/upload-case")} className="mr-4">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Case
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Notification Preferences */}
        <div className="mb-8">
          <NotificationPreferences />
        </div>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Cases</CardTitle>
            <CardDescription>
              Track the progress of your submitted CBCT scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading cases...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No cases uploaded yet</p>
                <Button 
                  onClick={() => navigate("/upload-case")} 
                  className="mt-4"
                >
                  Upload Your First Case
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Patient Name</th>
                      <th className="text-left py-2">Upload Date</th>
                      <th className="text-left py-2">Clinical Question</th>
                      <th className="text-left py-2">Urgency</th>
                      <th className="text-left py-2">FOV</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((case_) => (
                      <tr key={case_.id} className="border-b">
                        <td className="py-2">{case_.patient_name}</td>
                        <td className="py-2">
                          {new Date(case_.upload_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 max-w-xs truncate">
                          {case_.clinical_question}
                        </td>
                        <td className="py-2">
                          <Badge 
                            variant={case_.urgency === 'urgent' ? 'destructive' : 'secondary'}
                          >
                            {case_.urgency}
                          </Badge>
                        </td>
                        <td className="py-2">{case_.field_of_view}</td>
                        <td className="py-2">
                          <Badge className={getStatusColor(case_.status)}>
                            {formatStatus(case_.status)}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {case_.status === 'report_ready' && (
                            <Button variant="outline" size="sm">
                              Download Report
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;