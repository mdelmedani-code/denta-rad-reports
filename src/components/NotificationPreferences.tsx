import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NotificationPreferences {
  email_new_cases: boolean;
  email_urgent_cases: boolean;
  email_daily_summary: boolean;
  email_status_changes: boolean;
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_new_cases: true,
    email_urgent_cases: true,
    email_daily_summary: false,
    email_status_changes: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        setPreferences(data.notification_preferences as unknown as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    
    setSaving(true);
    const newPreferences = { ...preferences, [key]: value };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: newPreferences })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(newPreferences);
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="new-cases">New Cases</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when new cases are uploaded by your clinic
            </p>
          </div>
          <Switch
            id="new-cases"
            checked={preferences.email_new_cases}
            onCheckedChange={(checked) => updatePreferences('email_new_cases', checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="urgent-cases">Urgent Cases</Label>
            <p className="text-sm text-muted-foreground">
              Get notified immediately for urgent cases
            </p>
          </div>
          <Switch
            id="urgent-cases"
            checked={preferences.email_urgent_cases}
            onCheckedChange={(checked) => updatePreferences('email_urgent_cases', checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="status-changes">Status Changes</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when case status updates (e.g., completed, in progress)
            </p>
          </div>
          <Switch
            id="status-changes"
            checked={preferences.email_status_changes}
            onCheckedChange={(checked) => updatePreferences('email_status_changes', checked)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-summary">Daily Summary</Label>
            <p className="text-sm text-muted-foreground">
              Receive a daily summary of your cases
            </p>
          </div>
          <Switch
            id="daily-summary"
            checked={preferences.email_daily_summary}
            onCheckedChange={(checked) => updatePreferences('email_daily_summary', checked)}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
};