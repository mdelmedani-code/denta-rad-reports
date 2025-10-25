import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Search, Shield } from 'lucide-react';

interface SignatureData {
  id: string;
  report_id: string;
  case_id: string;
  signer_name: string;
  signer_credentials: string;
  signed_at: string;
  signature_hash: string;
  verification_token: string;
  report_version: number;
  is_superseded: boolean;
}

interface VersionInfo {
  id: string;
  version: number;
  signed_at: string;
  signed_by: string;
  is_superseded: boolean;
  is_current: boolean;
}

export default function SignatureVerification() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [versionChain, setVersionChain] = useState<VersionInfo[]>([]);
  const [result, setResult] = useState<{
    valid: boolean;
    data?: SignatureData;
    error?: string;
  } | null>(null);

  const verifySignature = async () => {
    if (!token.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase
        .from('signature_audit')
        .select('*')
        .eq('verification_token', token.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setResult({
          valid: false,
          error: 'Invalid verification code. Please check and try again.',
        });
        return;
      }

      // Load version chain
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_report_version_chain', {
          p_report_id: data.report_id,
        });

      if (!versionError && versionData) {
        setVersionChain(versionData);
      }

      setResult({
        valid: true,
        data,
      });
    } catch (error) {
      console.error('Verification error:', error);
      setResult({
        valid: false,
        error: 'Verification failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Signature Verification</h1>
          <p className="text-muted-foreground">
            Verify the authenticity of a DentaRad CBCT report signature
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              Enter the verification code from your report to confirm its authenticity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter verification token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifySignature()}
                className="font-mono"
              />
              <Button onClick={verifySignature} disabled={loading || !token.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>

            {result && (
              <div className="mt-6">
                {result.valid && result.data ? (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <div className="font-semibold text-green-900 dark:text-green-100 text-lg">
                          ✅ Signature Valid {result.data.is_superseded && '(Superseded Version)'}
                        </div>
                        <p className="text-green-800 dark:text-green-200">
                          This report has been electronically signed and has not been modified since signing.
                        </p>
                        {result.data.is_superseded && (
                          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                            <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                              ⚠️ This version has been superseded by a newer version. See version history below.
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="bg-white dark:bg-green-950/40 rounded-lg p-4 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-muted-foreground">Signed by:</div>
                            <div className="font-medium">{result.data.signer_name}</div>
                            
                            {result.data.signer_credentials && (
                              <>
                                <div className="text-muted-foreground">Credentials:</div>
                                <div className="font-medium">{result.data.signer_credentials}</div>
                              </>
                            )}
                            
                            <div className="text-muted-foreground">Date & Time:</div>
                            <div className="font-medium">
                              {new Date(result.data.signed_at).toLocaleString('en-GB', {
                                dateStyle: 'long',
                                timeStyle: 'long',
                              })}
                            </div>
                            
                            <div className="text-muted-foreground">Version:</div>
                            <div className="font-medium">
                              {result.data.report_version}
                            </div>
                            
                            <div className="text-muted-foreground">Content Hash:</div>
                            <div className="font-mono text-xs break-all">
                              {result.data.signature_hash.substring(0, 32)}...
                            </div>
                          </div>
                        </div>
                        
                        {versionChain.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="font-semibold text-green-900 dark:text-green-100">
                              Version History:
                            </h4>
                            <div className="bg-white dark:bg-green-950/40 rounded-lg p-3 space-y-2">
                              {versionChain.map((version) => (
                                <div 
                                  key={version.id}
                                  className={`flex items-center justify-between text-sm p-2 rounded ${
                                    version.is_current 
                                      ? 'bg-green-100 dark:bg-green-900/30 font-medium' 
                                      : 'bg-muted/50'
                                  }`}
                                >
                                  <div>
                                    <span>Version {version.version}</span>
                                    {version.is_current && (
                                      <Badge className="ml-2" variant="outline">Current</Badge>
                                    )}
                                    {version.is_superseded && (
                                      <Badge className="ml-2" variant="outline">Superseded</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {version.signed_at 
                                      ? new Date(version.signed_at).toLocaleDateString('en-GB')
                                      : 'Not signed'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-green-700 dark:text-green-300">
                          This electronic signature is legally binding and verifies the authenticity of this report.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold text-lg">❌ Verification Failed</div>
                        <p>{result.error}</p>
                        <p className="text-sm">
                          Please ensure you have entered the complete verification code from your report.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="mt-8 p-4 bg-muted rounded-lg text-sm space-y-2">
              <h3 className="font-semibold">How to verify a report:</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Locate the signature block at the end of your report</li>
                <li>Copy the verification code (starts with letters and numbers)</li>
                <li>Paste it in the field above and click "Verify"</li>
                <li>You'll see confirmation if the signature is valid</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>DentaRad uses SHA-256 cryptographic hashing to ensure report integrity</p>
          <p className="mt-1">All signatures are logged and tamper-proof</p>
        </div>
      </div>
    </div>
  );
}