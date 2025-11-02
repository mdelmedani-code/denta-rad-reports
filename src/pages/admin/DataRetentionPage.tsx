import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Archive, Database, AlertTriangle, Calendar, Search, Trash2 } from "lucide-react";
import { format, subYears, subMonths } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CaseForRetention {
  id: string;
  simple_id: number;
  patient_name: string;
  upload_date: string;
  completed_at: string | null;
  status: string;
  archived: boolean;
  archived_at: string | null;
  archived_reason: string | null;
  clinic_name: string;
  age_days: number;
}

const DataRetentionPage = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseForRetention[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>("7years");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseForRetention | null>(null);
  const [actionType, setActionType] = useState<"archive" | "delete" | null>(null);
  
  const [stats, setStats] = useState({
    totalOldCases: 0,
    archivedCases: 0,
    pendingArchival: 0,
    completedCases: 0,
  });

  useEffect(() => {
    fetchCases();
  }, [filterPeriod, showArchived]);

  const getRetentionDate = () => {
    const now = new Date();
    switch (filterPeriod) {
      case "1year": return subYears(now, 1);
      case "3years": return subYears(now, 3);
      case "5years": return subYears(now, 5);
      case "7years": return subYears(now, 7);
      case "10years": return subYears(now, 10);
      default: return subYears(now, 7);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const retentionDate = getRetentionDate();
      
      let query = supabase
        .from('cases')
        .select(`
          id,
          simple_id,
          patient_name,
          upload_date,
          completed_at,
          status,
          archived,
          archived_at,
          archived_reason,
          clinics!inner(name)
        `)
        .lt('upload_date', retentionDate.toISOString())
        .order('upload_date', { ascending: true });

      if (!showArchived) {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        simple_id: item.simple_id,
        patient_name: item.patient_name,
        upload_date: item.upload_date,
        completed_at: item.completed_at,
        status: item.status,
        archived: item.archived,
        archived_at: item.archived_at,
        archived_reason: item.archived_reason,
        clinic_name: item.clinics?.name || 'Unknown',
        age_days: Math.floor((new Date().getTime() - new Date(item.upload_date).getTime()) / (1000 * 60 * 60 * 24)),
      }));

      setCases(transformedData);

      // Calculate stats
      setStats({
        totalOldCases: transformedData.length,
        archivedCases: transformedData.filter(c => c.archived).length,
        pendingArchival: transformedData.filter(c => !c.archived && c.status === 'completed').length,
        completedCases: transformedData.filter(c => c.status === 'completed').length,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveCase = async (caseId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: reason,
        })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Case archived successfully",
      });

      fetchCases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive case",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          deleted_at: new Date().toISOString(),
          deletion_reason: 'GDPR data retention policy',
          patient_name: '[DELETED]',
          patient_first_name: '[DELETED]',
          patient_last_name: '[DELETED]',
          patient_id: '[DELETED]',
          patient_dob: null,
        })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Case pseudonymized successfully",
      });

      fetchCases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pseudonymize case",
        variant: "destructive",
      });
    }
  };

  const filteredCases = cases.filter(c => 
    c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.simple_id.toString().includes(searchTerm) ||
    c.clinic_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      in_progress: "secondary",
      uploaded: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8" />
            Data Retention Management
          </h1>
          <p className="text-muted-foreground mt-1">
            GDPR and health data compliance dashboard
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Old Cases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOldCases}</div>
            <p className="text-xs text-muted-foreground">
              Beyond retention period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Cases</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archivedCases}</div>
            <p className="text-xs text-muted-foreground">
              Already processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Archival</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingArchival}</div>
            <p className="text-xs text-muted-foreground">
              Completed, needs archival
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Cases</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCases}</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.totalOldCases} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Configure retention period and search criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Retention Period</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1year">Older than 1 year</SelectItem>
                  <SelectItem value="3years">Older than 3 years</SelectItem>
                  <SelectItem value="5years">Older than 5 years</SelectItem>
                  <SelectItem value="7years">Older than 7 years (NHS Standard)</SelectItem>
                  <SelectItem value="10years">Older than 10 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Cases</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Patient name, case ID, clinic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Options</Label>
              <Select 
                value={showArchived ? "all" : "active"} 
                onValueChange={(v) => setShowArchived(v === "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="all">Include Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cases Requiring Action</CardTitle>
          <CardDescription>
            Cases older than the selected retention period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cases found matching the criteria
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Age (Days)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Archived</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((caseItem) => (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-mono">#{caseItem.simple_id}</TableCell>
                      <TableCell>{caseItem.patient_name}</TableCell>
                      <TableCell>{caseItem.clinic_name}</TableCell>
                      <TableCell>
                        {format(new Date(caseItem.upload_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={caseItem.age_days > 2555 ? "text-red-600 font-semibold" : ""}>
                          {caseItem.age_days}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                      <TableCell>
                        {caseItem.archived ? (
                          <Badge variant="secondary">
                            <Archive className="w-3 h-3 mr-1" />
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!caseItem.archived && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCase(caseItem);
                                setActionType("archive");
                              }}
                            >
                              <Archive className="w-3 h-3 mr-1" />
                              Archive
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedCase(caseItem);
                                setActionType("delete");
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Pseudonymize
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedCase && !!actionType} onOpenChange={() => {
        setSelectedCase(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "archive" ? "Archive Case" : "Pseudonymize Case"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "archive" ? (
                <>
                  This will mark case <strong>#{selectedCase?.simple_id}</strong> as archived.
                  The case data will remain but flagged for long-term storage.
                </>
              ) : (
                <>
                  This will permanently remove patient identifiable information from case{" "}
                  <strong>#{selectedCase?.simple_id}</strong>. Patient name and DOB will be replaced
                  with "[DELETED]". This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCase) {
                  if (actionType === "archive") {
                    handleArchiveCase(selectedCase.id, "GDPR retention policy - exceeded 7 years");
                  } else {
                    handleDeleteCase(selectedCase.id);
                  }
                }
                setSelectedCase(null);
                setActionType(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataRetentionPage;
