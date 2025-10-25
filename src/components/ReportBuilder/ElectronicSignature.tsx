import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, PenLine } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface SignatureData {
  signed_by: string;
  signed_at: string;
  signatory_name: string;
  signatory_credentials: string;
  signature_hash: string;
  verification_token: string;
}

interface ElectronicSignatureProps {
  reportId: string;
  caseId: string;
  reportContent: string;
  signatureData: SignatureData | null;
  onSign: (data: SignatureData) => void;
}

export const ElectronicSignature = ({
  reportId,
  caseId,
  reportContent,
  signatureData,
  onSign,
}: ElectronicSignatureProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSign = async () => {
    if (!signerName || !password) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password,
      });

      if (authError) {
        toast({
          title: 'Authentication Failed',
          description: 'Incorrect password. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Generate signature hash
      const contentHash = CryptoJS.SHA256(reportContent).toString();
      const verificationToken = CryptoJS.lib.WordArray.random(32).toString();

      const signaturePayload: SignatureData = {
        signed_by: user?.id || '',
        signed_at: new Date().toISOString(),
        signatory_name: signerName,
        signatory_credentials: credentials,
        signature_hash: contentHash,
        verification_token: verificationToken,
      };

      // Save to signature audit
      const { error: auditError } = await supabase
        .from('signature_audit')
        .insert({
          report_id: reportId,
          case_id: caseId,
          signer_id: user?.id,
          signer_name: signerName,
          signer_credentials: credentials,
          signature_hash: contentHash,
          ip_address: '', // Would need server-side IP detection
          user_agent: navigator.userAgent,
          verification_token: verificationToken,
        });

      if (auditError) throw auditError;

      // Update report
      const { error: reportError } = await supabase
        .from('reports')
        .update({
          is_signed: true,
          signed_by: signerName,
          signed_at: new Date().toISOString(),
          signature_hash: contentHash,
        })
        .eq('id', reportId);

      if (reportError) throw reportError;

      onSign(signaturePayload);

      toast({
        title: 'Report Signed',
        description: 'The report has been electronically signed',
      });

      setShowDialog(false);
      setPassword('');
    } catch (error) {
      console.error('Error signing report:', error);
      toast({
        title: 'Signing Failed',
        description: 'Failed to sign the report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (signatureData) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-semibold text-green-900 dark:text-green-100">
              ✅ Electronically Signed
            </div>
            <div className="text-sm space-y-1 text-green-800 dark:text-green-200">
              <div><strong>Signed by:</strong> {signatureData.signatory_name}</div>
              {signatureData.signatory_credentials && (
                <div><strong>Credentials:</strong> {signatureData.signatory_credentials}</div>
              )}
              <div>
                <strong>Date & Time:</strong>{' '}
                {new Date(signatureData.signed_at).toLocaleString('en-GB', {
                  dateStyle: 'long',
                  timeStyle: 'long',
                })}
              </div>
              <div className="font-mono text-xs">
                <strong>Verification:</strong> #{signatureData.verification_token.substring(0, 16)}...
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Alert>
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>This report has not been signed yet</span>
            <Button onClick={() => setShowDialog(true)} className="ml-4">
              <PenLine className="h-4 w-4 mr-2" />
              Sign Report
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Electronically Sign Report</DialogTitle>
            <DialogDescription>
              By signing this report, you verify that:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You have reviewed all information</li>
                <li>The findings are accurate to your professional judgment</li>
                <li>The report meets professional standards</li>
                <li>You are the authorized signatory</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Your Full Name *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Dr. John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">Professional Credentials</Label>
              <Input
                id="credentials"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="BDS, MSc, Specialist in Dental Radiology"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Confirm Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
              />
              <p className="text-xs text-muted-foreground">
                Re-authentication required for security
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={loading}>
              {loading ? 'Signing...' : 'Sign Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};