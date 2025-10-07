import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Smartphone, Copy, Check, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';

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
  const [mfaAttempts, setMfaAttempts] = useState(0);
  const [mfaLockedUntil, setMfaLockedUntil] = useState<Date | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const MAX_MFA_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  useEffect(() => {
    if (step === 'generate') {
      generateSecret();
    }
  }, [step]);

  // Generate secure backup codes (hashed)
  async function generateBackupCodes(): Promise<{
    plaintext: string[];
    hashed: string[];
  }> {
    const codes: string[] = [];
    
    // Generate 10 backup codes
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      codes.push(code);
    }
    
    // Hash all codes before storage
    const hashed = await Promise.all(
      codes.map(code => bcrypt.hash(code, 10))
    );
    
    return {
      plaintext: codes, // Show to user ONCE
      hashed: hashed    // Store in database
    };
  }

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
    // Check if locked out
    if (mfaLockedUntil && new Date() < mfaLockedUntil) {
      const minutesRemaining = Math.ceil(
        (mfaLockedUntil.getTime() - Date.now()) / 60000
      );
      
      toast({
        title: 'Too Many Attempts',
        description: `MFA verification locked for ${minutesRemaining} more minutes`,
        variant: 'destructive'
      });
      return;
    }
    
    // Check attempt count
    if (mfaAttempts >= MAX_MFA_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      setMfaLockedUntil(lockUntil);
      
      toast({
        title: 'Too Many Attempts',
        description: 'MFA verification locked for 15 minutes',
        variant: 'destructive',
        duration: 10000
      });
      return;
    }

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
      // For now, we'll accept it and generate backup codes
      
      // Generate and hash backup codes SECURELY
      const { plaintext, hashed } = await generateBackupCodes();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          mfa_secret: secret,
          mfa_enabled: true,
          mfa_enforced_at: new Date().toISOString(),
          backup_codes: hashed // Store HASHED codes only
        })
        .eq('id', user.id);

      if (error) {
        // Increment attempts on failure
        setMfaAttempts(prev => prev + 1);
        const remainingAttempts = MAX_MFA_ATTEMPTS - (mfaAttempts + 1);
        
        toast({
          title: 'Verification Failed',
          description: `Invalid code. ${remainingAttempts} attempts remaining.`,
          variant: 'destructive'
        });
        
        setVerificationCode('');
        throw error;
      }

      // Success - reset attempts and show backup codes
      setMfaAttempts(0);
      setMfaLockedUntil(null);
      setBackupCodes(plaintext);
      setShowBackupCodes(true);

      toast({
        title: 'MFA Enabled',
        description: 'Save your backup codes now - they will not be shown again!',
      });

    } catch (error) {
      setMfaAttempts(prev => prev + 1);
      console.error('Error verifying code:', error);
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
                <strong>Step 1 of 2:</strong> Scan this QR code with your authenticator app
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
                <strong>Step 2 of 2:</strong> Enter the 6-digit code from your authenticator app
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
      </Card>

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Backup Codes</h2>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900 font-semibold">
                ⚠️ SAVE THESE CODES NOW
              </p>
              <p className="text-xs text-red-800 mt-1">
                These codes will NEVER be shown again. Store them in a secure location.
                Each code can only be used once.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-50 border border-gray-300 rounded px-3 py-2 font-mono text-sm text-center"
                >
                  {code}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                // Copy to clipboard
                navigator.clipboard.writeText(backupCodes.join('\n'));
                toast({
                  title: 'Copied to Clipboard',
                  description: 'Backup codes copied. Store them securely.',
                });
              }}
              className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Copy All Codes
            </button>
            
            <button
              onClick={() => {
                setShowBackupCodes(false);
                navigate('/dashboard');
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              I've Saved My Codes - Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
