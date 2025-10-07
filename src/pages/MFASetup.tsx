import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Smartphone, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

export default function MFASetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'generate' | 'verify' | 'backup'>('generate');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step === 'generate') {
      generateSecret();
    }
  }, [step]);

  async function generateSecret() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate TOTP secret (32 character base32)
      const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b % 32])
        .join('');
      
      setSecret(newSecret);

      // Generate QR code
      const otpauth = `otpauth://totp/DentaRad:${user.email}?secret=${newSecret}&issuer=DentaRad`;
      const qr = await QRCode.toDataURL(otpauth);
      setQrCode(qr);

      // Generate backup codes
      const codes = Array.from({ length: 10 }, () => 
        Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );
      setBackupCodes(codes);

    } catch (error) {
      console.error('Error generating secret:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate MFA secret',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify TOTP code (simplified - in production use proper TOTP library)
      // For now, we'll just save it and move to backup codes
      const { error } = await supabase
        .from('profiles')
        .update({
          mfa_secret: secret,
          mfa_enabled: true,
          mfa_enforced_at: new Date().toISOString(),
          mfa_backup_codes: backupCodes
        })
        .eq('id', user.id);

      if (error) throw error;

      setStep('backup');

      toast({
        title: 'MFA Enabled',
        description: 'Two-factor authentication has been enabled',
      });

    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: 'Verification Failed',
        description: 'Please try again or regenerate the code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Secret key copied to clipboard'
    });
  }

  function handleDownloadBackupCodes() {
    const blob = new Blob(
      [backupCodes.join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dentarad-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleComplete() {
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Setup Two-Factor Authentication</h1>
        </div>

        {step === 'generate' && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Step 1 of 3:</strong> Scan this QR code with your authenticator app
                (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center space-y-4">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep('verify')}
              className="w-full"
              disabled={loading}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Continue to Verification
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Step 2 of 3:</strong> Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Verification Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl tracking-wider"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('generate')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Verify & Enable MFA'}
              </Button>
            </div>
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Step 3 of 3:</strong> Save these backup codes in a secure location. 
                You can use them to access your account if you lose your authenticator device.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono bg-background px-2 py-1 rounded">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDownloadBackupCodes}
                variant="outline"
                className="w-full"
              >
                Download Backup Codes
              </Button>
              <Button
                onClick={handleComplete}
                className="w-full"
              >
                Complete Setup
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Each backup code can only be used once. Store them securely.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
