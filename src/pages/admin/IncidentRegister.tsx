import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Clock, CheckCircle, Shield, FileText } from 'lucide-react';
import { format, differenceInHours, addHours } from 'date-fns';

interface DataIncident {
  id: string;
  incident_date: string;
  discovered_at: string;
  title: string;
  description: string;
  incident_type: string;
  data_categories: string[];
  individuals_affected: number;
  risk_level: string;
  risk_assessment: string | null;
  containment_actions: string | null;
  remediation_actions: string | null;
  ico_notification_required: boolean;
  ico_notified_at: string | null;
  ico_reference: string | null;
  individuals_notified: boolean;
  individuals_notified_at: string | null;
  status: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

const INCIDENT_TYPES = [
  { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'data_loss', label: 'Data Loss' },
  { value: 'data_disclosure', label: 'Accidental Disclosure' },
  { value: 'cyber_attack', label: 'Cyber Attack' },
  { value: 'physical_breach', label: 'Physical Breach' },
  { value: 'system_error', label: 'System Error' },
  { value: 'other', label: 'Other' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const DATA_CATEGORIES = [
  'Personal identifiers',
  'Health/medical data',
  'Financial data',
  'Contact information',
  'Professional credentials',
  'Imaging/scans',
];

export default function IncidentRegister() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<DataIncident | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    incident_type: 'other',
    data_categories: [] as string[],
    individuals_affected: 0,
    risk_level: 'low',
    risk_assessment: '',
    containment_actions: '',
    ico_notification_required: false,
  });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['data-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_incidents')
        .select('*')
        .order('discovered_at', { ascending: false });
      
      if (error) throw error;
      return data as DataIncident[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('data_incidents').insert({
        title: data.title,
        description: data.description,
        incident_date: data.incident_date,
        incident_type: data.incident_type,
        data_categories: data.data_categories,
        individuals_affected: data.individuals_affected,
        risk_level: data.risk_level,
        risk_assessment: data.risk_assessment || null,
        containment_actions: data.containment_actions || null,
        ico_notification_required: data.ico_notification_required,
        reported_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-incidents'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Incident recorded');
    },
    onError: () => toast.error('Failed to record incident'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, ico_notified_at, ico_reference, resolution_notes }: {
      id: string;
      status?: string;
      ico_notified_at?: string;
      ico_reference?: string;
      resolution_notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (status) {
        updates.status = status;
        if (status === 'resolved') updates.resolved_at = new Date().toISOString();
      }
      if (ico_notified_at) updates.ico_notified_at = ico_notified_at;
      if (ico_reference) updates.ico_reference = ico_reference;
      if (resolution_notes) updates.resolution_notes = resolution_notes;

      const { error } = await supabase.from('data_incidents').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-incidents'] });
      toast.success('Incident updated');
    },
    onError: () => toast.error('Failed to update incident'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      incident_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      incident_type: 'other',
      data_categories: [],
      individuals_affected: 0,
      risk_level: 'low',
      risk_assessment: '',
      containment_actions: '',
      ico_notification_required: false,
    });
  };

  const getDeadlineStatus = (incident: DataIncident) => {
    if (!incident.ico_notification_required) return null;
    if (incident.ico_notified_at) return { status: 'notified', color: 'text-green-600' };
    
    const deadline = addHours(new Date(incident.discovered_at), 72);
    const hoursRemaining = differenceInHours(deadline, new Date());
    
    if (hoursRemaining < 0) return { status: 'overdue', color: 'text-red-600', hours: Math.abs(hoursRemaining) };
    if (hoursRemaining < 12) return { status: 'urgent', color: 'text-orange-600', hours: hoursRemaining };
    return { status: 'pending', color: 'text-yellow-600', hours: hoursRemaining };
  };

  const openIncidents = incidents?.filter(i => i.status === 'open') || [];
  const urgentDeadlines = openIncidents.filter(i => {
    const status = getDeadlineStatus(i);
    return status && (status.status === 'overdue' || status.status === 'urgent');
  });

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Data Incident Register
            </h1>
            <p className="text-muted-foreground">
              Track and document data incidents for UK GDPR compliance
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report Data Incident</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Incident Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Brief description of the incident"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Incident Date/Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Incident Type</Label>
                    <Select value={formData.incident_type} onValueChange={(v) => setFormData({ ...formData, incident_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INCIDENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of what happened..."
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Risk Level</Label>
                    <Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Individuals Affected</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.individuals_affected}
                      onChange={(e) => setFormData({ ...formData, individuals_affected: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Data Categories Affected</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {DATA_CATEGORIES.map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={cat}
                            checked={formData.data_categories.includes(cat)}
                            onCheckedChange={(checked) => {
                              setFormData({
                                ...formData,
                                data_categories: checked
                                  ? [...formData.data_categories, cat]
                                  : formData.data_categories.filter(c => c !== cat)
                              });
                            }}
                          />
                          <label htmlFor={cat} className="text-sm">{cat}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Containment Actions Taken</Label>
                    <Textarea
                      value={formData.containment_actions}
                      onChange={(e) => setFormData({ ...formData, containment_actions: e.target.value })}
                      placeholder="What immediate actions were taken to contain the incident?"
                      rows={2}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Risk Assessment</Label>
                    <Textarea
                      value={formData.risk_assessment}
                      onChange={(e) => setFormData({ ...formData, risk_assessment: e.target.value })}
                      placeholder="Assessment of potential harm to affected individuals..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <Checkbox
                      id="ico_required"
                      checked={formData.ico_notification_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, ico_notification_required: !!checked })}
                    />
                    <div>
                      <label htmlFor="ico_required" className="font-medium">ICO Notification Required</label>
                      <p className="text-sm text-muted-foreground">
                        Check if this incident is likely to result in a risk to individuals' rights and freedoms (72-hour deadline applies)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Recording...' : 'Record Incident'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert for urgent deadlines */}
        {urgentDeadlines.length > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">
                  {urgentDeadlines.length} incident(s) require urgent ICO notification
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{openIncidents.length}</div>
              <div className="text-sm text-muted-foreground">Open Incidents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {incidents?.filter(i => i.ico_notification_required && !i.ico_notified_at).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Pending ICO Notification</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {incidents?.filter(i => i.status === 'resolved').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Resolved This Year</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {incidents?.filter(i => i.risk_level === 'high' || i.risk_level === 'critical').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">High/Critical Risk</div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Incident Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
            ) : incidents?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No incidents recorded. Use "Report Incident" to log a new data incident.
              </div>
            ) : (
              <div className="space-y-4">
                {incidents?.map(incident => {
                  const deadline = getDeadlineStatus(incident);
                  const riskLevel = RISK_LEVELS.find(r => r.value === incident.risk_level);
                  
                  return (
                    <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{incident.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(incident.incident_date), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={incident.status === 'resolved' ? 'secondary' : 'default'}>
                            {incident.status}
                          </Badge>
                          <Badge className={riskLevel?.color}>{riskLevel?.label} Risk</Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm">{incident.description}</p>
                      
                      {incident.data_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {incident.data_categories.map(cat => (
                            <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      )}
                      
                      {deadline && (
                        <div className={`flex items-center gap-2 text-sm ${deadline.color}`}>
                          <Clock className="h-4 w-4" />
                          {deadline.status === 'notified' && (
                            <span>ICO notified on {format(new Date(incident.ico_notified_at!), 'PP')}</span>
                          )}
                          {deadline.status === 'overdue' && (
                            <span className="font-semibold">OVERDUE: ICO notification was due {deadline.hours}h ago!</span>
                          )}
                          {deadline.status === 'urgent' && (
                            <span className="font-semibold">URGENT: {deadline.hours}h remaining to notify ICO</span>
                          )}
                          {deadline.status === 'pending' && (
                            <span>{deadline.hours}h remaining to notify ICO</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        {incident.status === 'open' && incident.ico_notification_required && !incident.ico_notified_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const ref = prompt('Enter ICO reference number (if available):');
                              updateStatusMutation.mutate({
                                id: incident.id,
                                ico_notified_at: new Date().toISOString(),
                                ico_reference: ref || undefined,
                              });
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark ICO Notified
                          </Button>
                        )}
                        {incident.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const notes = prompt('Resolution notes:');
                              if (notes) {
                                updateStatusMutation.mutate({
                                  id: incident.id,
                                  status: 'resolved',
                                  resolution_notes: notes,
                                });
                              }
                            }}
                          >
                            Resolve Incident
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
