import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Version {
  id: string;
  version_number: number;
  clinical_history: string;
  technique: string;
  findings: string;
  impression: string;
  saved_at: string;
  saved_by: string;
}

interface VersionHistoryProps {
  reportId: string;
  currentVersion: {
    clinical_history: string;
    technique: string;
    findings: string;
    impression: string;
  };
  onRestore: (version: Version) => void;
  disabled?: boolean;
}

export const VersionHistory = ({
  reportId,
  currentVersion,
  onRestore,
  disabled,
}: VersionHistoryProps) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, [reportId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_versions')
        .select('*')
        .eq('report_id', reportId)
        .order('version_number', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: Version) => {
    try {
      onRestore(version);
      
      toast({
        title: 'Version Restored',
        description: `Restored to version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore this version',
        variant: 'destructive',
      });
    }
  };

  const saveCurrentVersion = async () => {
    try {
      const nextVersionNumber = versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { error } = await supabase
        .from('report_versions')
        .insert({
          report_id: reportId,
          version_number: nextVersionNumber,
          clinical_history: currentVersion.clinical_history,
          technique: currentVersion.technique,
          findings: currentVersion.findings,
          impression: currentVersion.impression,
          saved_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      await loadVersions();

      toast({
        title: 'Version Saved',
        description: `Saved as version ${nextVersionNumber}`,
      });
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save version',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>
            View and restore previous versions of this report
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button
            onClick={saveCurrentVersion}
            disabled={disabled}
            className="w-full"
            variant="outline"
          >
            Save Current as New Version
          </Button>

          <Separator />

          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No version history yet</p>
                  <p className="text-sm mt-1">Versions will appear here as you save them</p>
                </div>
              ) : (
                versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Version {version.version_number}</span>
                          {index === 0 && <Badge variant="outline">Latest</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(version.saved_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVersion(
                          selectedVersion?.id === version.id ? null : version
                        )}
                      >
                        {selectedVersion?.id === version.id ? 'Hide' : 'Preview'}
                      </Button>
                    </div>

                    {selectedVersion?.id === version.id && (
                      <>
                        <Separator />
                        <ScrollArea className="h-48">
                          <div className="space-y-3 text-sm">
                            <div>
                              <div className="font-medium mb-1">Clinical History:</div>
                              <div
                                className="text-muted-foreground prose prose-sm"
                                dangerouslySetInnerHTML={{ __html: version.clinical_history || 'Empty' }}
                              />
                            </div>
                            <div>
                              <div className="font-medium mb-1">Findings:</div>
                              <div
                                className="text-muted-foreground prose prose-sm"
                                dangerouslySetInnerHTML={{ __html: version.findings || 'Empty' }}
                              />
                            </div>
                          </div>
                        </ScrollArea>
                        <Button
                          onClick={() => handleRestore(version)}
                          disabled={disabled}
                          size="sm"
                          className="w-full"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Restore This Version
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};