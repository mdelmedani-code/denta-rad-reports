import { FileText, Shield, Database, Clock, MapPin } from 'lucide-react';

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-card rounded-lg shadow p-8 border">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Privacy Notice
            </h1>
          </div>

          <div className="prose prose-sm max-w-none space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-bold mb-3">Who We Are</h2>
              <p className="text-muted-foreground">
                DentaRad provides specialist CBCT radiology reporting services to dental practitioners across the UK.
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-3">
                <p className="text-sm text-foreground">
                  <strong>Contact:</strong> privacy@dentarad.com<br />
                  <strong>Address:</strong> United Kingdom
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">What Data We Process</h2>
              </div>
              <p className="text-muted-foreground mb-2">We process the following categories of personal data:</p>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div>
                  <p className="font-semibold text-foreground">Patient Data (Special Category):</p>
                  <p className="text-sm text-muted-foreground">Patient reference number, age, CBCT scan images, clinical information, dental history</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Dentist/Practice Data:</p>
                  <p className="text-sm text-muted-foreground">Name, email, GDC registration number, practice details, professional credentials</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Technical Data:</p>
                  <p className="text-sm text-muted-foreground">IP addresses, login timestamps, browser information, device type, actions performed on platform</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Legal Basis for Processing</h2>
              <p className="text-muted-foreground mb-2">We process data under the following legal bases:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Contract:</p>
                    <p className="text-sm text-muted-foreground">Providing radiology reporting services as requested by you</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Legitimate Interest:</p>
                    <p className="text-sm text-muted-foreground">Security monitoring, fraud prevention, service improvement, business analytics</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Legal Obligation:</p>
                    <p className="text-sm text-muted-foreground">Retention for medical records requirements, tax compliance, regulatory requirements</p>
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">How We Use Your Data</h2>
              <ol className="list-decimal ml-6 space-y-2 text-muted-foreground">
                <li><strong>Receive:</strong> You upload CBCT scan via secure portal</li>
                <li><strong>Store:</strong> Encrypted storage in UK/EU data centers</li>
                <li><strong>Analyze:</strong> Expert radiologist reviews scan using specialist software</li>
                <li><strong>Report:</strong> Create diagnostic report with AI assistance (anonymized data only)</li>
                <li><strong>Deliver:</strong> Secure portal download only (no email transmission)</li>
                <li><strong>Retain:</strong> Store per legal and medical records requirements</li>
                <li><strong>Audit:</strong> Log all access for security and compliance</li>
              </ol>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">How Long We Keep Your Data</h2>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-foreground">
                  <strong>Adult patients (17+):</strong> 8 years from scan date (NHS retention standard)
                </p>
                <p className="text-foreground">
                  <strong>Patients under 17:</strong> Until 25th birthday OR 8 years from scan date (whichever is longer)
                </p>
                <p className="text-foreground">
                  <strong>Audit logs:</strong> 7 years minimum (GDPR compliance requirement)
                </p>
                <p className="text-foreground">
                  <strong>Financial records:</strong> 6 years (HMRC requirement)
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Who We Share Your Data With</h2>
              <div className="space-y-3">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">Authorized Recipients:</p>
                  <ul className="space-y-1 text-sm text-foreground">
                    <li>• <strong>Your dental practitioner:</strong> Who requested the report (you have patient consent)</li>
                    <li>• <strong>Our radiologists:</strong> Who create the diagnostic reports</li>
                  </ul>
                </div>
                <div className="bg-muted border rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">Sub-Processors (Data Processing Agreements in place):</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      <strong>Supabase (Infrastructure hosting):</strong><br />
                      Purpose: Secure data storage, authentication, database<br />
                      Location: UK/EU data centers only<br />
                      Certification: SOC 2 Type II, ISO 27001
                    </li>
                    <li>
                      <strong>OpenAI (AI assistance):</strong><br />
                      Purpose: Report drafting assistance<br />
                      Data shared: Anonymized clinical findings only (NO patient identifiers)<br />
                      Note: All reports reviewed and approved by qualified radiologists
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Data Location</h2>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-900 dark:text-green-200 mb-2"><strong>✓ All data stored in UK/EU data centers only</strong></p>
                <p className="text-sm text-green-900 dark:text-green-200">
                  • No data transferred outside UK/EU<br />
                  • SOC 2 / ISO 27001 certified infrastructure<br />
                  • UK GDPR compliant hosting providers<br />
                  • No international data transfers
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Your Data Rights</h2>
              <p className="text-muted-foreground mb-3">Under UK GDPR, you and your patients have the right to:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Access</p>
                  <p className="text-xs text-muted-foreground">Request copy of all data we hold</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Rectification</p>
                  <p className="text-xs text-muted-foreground">Correct inaccurate data</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Erasure</p>
                  <p className="text-xs text-muted-foreground">Request deletion (subject to legal retention)</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Portability</p>
                  <p className="text-xs text-muted-foreground">Receive data in electronic format</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Object</p>
                  <p className="text-xs text-muted-foreground">Object to processing (we may refuse with legal grounds)</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Complain</p>
                  <p className="text-xs text-muted-foreground">Lodge complaint with ICO</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Data Security Measures</h2>
              </div>
              <p className="text-muted-foreground mb-3">We protect your data using:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">End-to-end encryption (HTTPS/TLS 1.3)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Encryption at rest (AES-256)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Multi-factor authentication (mandatory)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Role-based access controls</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Comprehensive audit logging</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Regular security monitoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Automatic session timeout (30 minutes)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Annual security audits</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Cookies & Tracking</h2>
              <p className="text-muted-foreground">
                We use <strong>essential cookies only</strong> for authentication and security. 
                No marketing, analytics, or tracking cookies are used. No third-party trackers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Contact & Complaints</h2>
              <div className="bg-muted border rounded-lg p-4 space-y-2">
                <p className="text-sm text-foreground">
                  <strong>Data Protection Queries:</strong> privacy@dentarad.com
                </p>
                <p className="text-sm text-foreground">
                  <strong>Security Concerns:</strong> security@dentarad.com
                </p>
                <p className="text-sm text-foreground">
                  <strong>Complaints to ICO:</strong> casework@ico.org.uk | 0303 123 1113 | www.ico.org.uk
                </p>
              </div>
            </section>

            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-GB')}<br />
                <strong>Version:</strong> 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
