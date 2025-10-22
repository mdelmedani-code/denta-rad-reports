import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteCaseDialogProps {
  caseId: string;
  caseStatus: 'uploaded' | 'in_progress' | 'report_ready' | 'awaiting_payment';
  patientName: string;
  onDeleteSuccess: () => void;
}

export function DeleteCaseDialog({ 
  caseId, 
  caseStatus, 
  patientName,
  onDeleteSuccess 
}: DeleteCaseDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const isInProgress = caseStatus !== 'uploaded';

  const handleDelete = async () => {
    // Validate password
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm deletion",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      // Verify user's password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User not found");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        throw new Error("Incorrect password");
      }
      // Get the file path first
      const { data: caseData, error: fetchError } = await supabase
        .from('cases')
        .select('file_path')
        .eq('id', caseId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage if file exists
      if (caseData?.file_path) {
        const { error: storageError } = await supabase.storage
          .from('cbct-scans')
          .remove([caseData.file_path]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with case deletion even if storage fails
        }
      }

      // Delete the case (cascade will handle reports, annotations, etc.)
      const { error: deleteError } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (deleteError) throw deleteError;

      toast({
        title: "Case Deleted",
        description: `Case for ${patientName} has been deleted.`,
      });

      setPassword("");
      setOpen(false);
      onDeleteSuccess();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete case",
        variant: "destructive",
      });
      setPassword("");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPassword("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Case?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the case for <strong>{patientName}</strong>?
            </p>
            
            {isInProgress && (
              <div className="flex gap-2 p-3 bg-warning/10 border border-warning rounded-md">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-warning mb-1">
                    Warning: Case In Progress
                  </p>
                  <p className="text-muted-foreground">
                    This case has status <strong className="text-foreground">"{caseStatus.replace('_', ' ')}"</strong>.
                    Work may have already begun on this case, and <strong>you may still be charged</strong> for 
                    processing that has been completed.
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm">
              This action cannot be undone. The scan files and all associated data will be permanently deleted.
            </p>
            
            <div className="space-y-2 mt-4">
              <Label htmlFor="password" className="text-sm font-semibold">
                Confirm your password to delete
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={deleting}
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !deleting) {
                    handleDelete();
                  }
                }}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Case
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
