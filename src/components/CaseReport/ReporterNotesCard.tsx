import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Reply, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReporterNotesCardProps {
  caseData: any;
  onUpdate?: () => void;
}

export function ReporterNotesCard({ caseData, onUpdate }: ReporterNotesCardProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(caseData.reporter_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ reporter_notes: notes })
        .eq('id', caseData.id);

      if (error) throw error;

      toast({
        title: 'Notes Saved',
        description: 'Your response has been saved successfully',
      });

      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Reply className="h-5 w-5 text-green-500" />
          Response to Clinic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {caseData.special_instructions && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
              Clinic's Special Instructions:
            </div>
            <div className="text-foreground">
              {caseData.special_instructions}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Your Response / Notes (visible to clinic)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or responses to the clinic's questions..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            These notes will be visible to the clinic and included in communications
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || notes === caseData.reporter_notes}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Response'}
        </Button>
      </CardContent>
    </Card>
  );
}