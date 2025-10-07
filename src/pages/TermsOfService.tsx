import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!accepted) {
      toast({
        title: 'Please Accept Terms',
        description: 'You must read and accept the terms to continue',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Terms Accepted',
        description: 'You can now use the platform',
      });

      navigate('/dashboard');

    } catch (error) {
      console.error('Error accepting terms:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept terms. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-card rounded-lg shadow-lg p-8 border">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Terms of Service
            </h1>
          </div>

          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-900 dark:text-yellow-200">
              <strong>Required Reading:</strong> Please read these terms carefully. By accepting, you agree to these terms and confirm you are authorized to use this service as a dental practitioner.
            </p>
          </div>

          <ScrollArea className="h-[500px] border rounded-lg p-6 mb-6 bg-background">
            <div className="prose prose-sm max-w-none space-y-4 text-foreground">
              <section>
                <h2 className="text-xl font-bold mb-2">1. Service Description</h2>
                <p className="text-muted-foreground">
                  We provide secure CBCT radiology reporting services via our web portal. You upload CBCT scans, we provide expert diagnostic reports.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">2. Your Responsibilities (Data Controller)</h2>
                <p className="text-muted-foreground mb-2">As the dental practitioner, you are the Data Controller and must:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Obtain valid patient consent before uploading scans</li>
                  <li>Ensure you have legal basis to share patient data</li>
                  <li>Only upload data necessary for the requested report</li>
                  <li>Not share your login credentials with others</li>
                  <li>Use strong passwords and enable multi-factor authentication</li>
                  <li>Log out after each session</li>
                  <li>Not attempt to access other users' data</li>
                  <li>Comply with all UK GDPR requirements</li>
                  <li>Notify us immediately of any suspected security breach</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">3. Our Responsibilities (Data Processor)</h2>
                <p className="text-muted-foreground mb-2">We will:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Provide a secure portal with encryption and access controls</li>
                  <li>Process data only per your instructions</li>
                  <li>Maintain comprehensive audit logs</li>
                  <li>Notify you of any data breaches within 24 hours</li>
                  <li>Assist with data subject access requests</li>
                  <li>Delete your data on request (subject to legal retention requirements)</li>
                  <li>Allow you to audit our security measures (with reasonable notice)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">4. Data Security</h2>
                <p className="text-muted-foreground mb-2">Our portal provides:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>✅ HTTPS encryption (data in transit)</li>
                  <li>✅ AES-256 encryption at rest</li>
                  <li>✅ Multi-factor authentication (mandatory)</li>
                  <li>✅ Role-based access control</li>
                  <li>✅ Comprehensive audit logging</li>
                  <li>✅ Regular security monitoring</li>
                  <li>✅ SOC 2 Type II certified infrastructure (Supabase)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">5. Data Processing</h2>
                <p className="text-muted-foreground mb-2">We process data as follows:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li><strong>Upload:</strong> Secure portal → Encrypted storage</li>
                  <li><strong>Processing:</strong> Automated metadata extraction + manual expert review</li>
                  <li><strong>Reporting:</strong> AI-assisted drafting + expert validation</li>
                  <li><strong>Delivery:</strong> Secure portal download only (no email)</li>
                  <li><strong>Retention:</strong> 8 years (or 25 years if patient under 17)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">6. Data Location</h2>
                <p className="text-muted-foreground mb-2">All data stored in:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>✅ UK/EU data centers only</li>
                  <li>✅ No data transferred outside UK/EU</li>
                  <li>✅ SOC 2 / ISO 27001 certified infrastructure</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">7. Liability & Indemnification</h2>
                
                <h3 className="text-lg font-semibold mt-3 mb-2">a) You indemnify us for:</h3>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Your failure to obtain patient consent</li>
                  <li>Your failure to secure your account</li>
                  <li>Your sharing of login credentials</li>
                  <li>Your forwarding of reports via insecure means</li>
                  <li>Your breaches of UK GDPR</li>
                </ul>

                <h3 className="text-lg font-semibold mt-3 mb-2">b) We are liable for:</h3>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Our failure to secure the portal</li>
                  <li>Our unauthorized disclosure of data</li>
                  <li>Our breach of this agreement</li>
                  <li>Limited to: Amount covered by our insurance</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">8. Governing Law</h2>
                <p className="text-muted-foreground">
                  These terms are governed by the laws of England and Wales. UK courts have exclusive jurisdiction.
                </p>
              </section>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-GB')}<br />
                  <strong>Version:</strong> 1.0
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="accept-terms"
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                I have read and agree to the Terms of Service. I understand that I am the Data Controller
                and am responsible for obtaining patient consent and complying with UK GDPR.
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={loading || !accepted}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Accepting...' : 'Accept & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
