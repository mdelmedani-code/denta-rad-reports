import { Shield, Database, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

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
                DentaRad provides specialist CBCT radiology reporting services to dental practitioners across the United Kingdom. We act as a Data Processor on behalf of referring dental practices (the Data Controllers).
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-3">
                <p className="text-sm text-foreground">
                  <strong>Data Protection Contact:</strong> privacy@dentarad.co.uk<br />
                  <strong>General Enquiries:</strong> info@dentarad.co.uk<br />
                  <strong>Registered Address:</strong> [Registered business address to be confirmed]<br />
                  <strong>ICO Registration:</strong> [Registration number to be confirmed]
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
                  <p className="font-semibold text-foreground">Patient Data (Special Category — Health Data):</p>
                  <p className="text-sm text-muted-foreground">Patient reference number, date of birth, CBCT scan images, clinical information, dental and medical history relevant to the referral</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Referring Practitioner Data:</p>
                  <p className="text-sm text-muted-foreground">Name, email address, GDC registration number, practice name and address, professional credentials</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Technical Data:</p>
                  <p className="text-sm text-muted-foreground">IP addresses, login timestamps, browser information, device type, actions performed on the platform</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Legal Basis for Processing</h2>
              <p className="text-muted-foreground mb-2">We process personal data under the following legal bases (UK GDPR Article 6):</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Contract (Article 6(1)(b)):</p>
                    <p className="text-sm text-muted-foreground">Processing necessary for the performance of our radiology reporting service contract with the referring practice</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Legitimate Interest (Article 6(1)(f)):</p>
                    <p className="text-sm text-muted-foreground">Security monitoring, fraud prevention, service improvement, and business analytics</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <div>
                    <p className="font-semibold text-foreground">Legal Obligation (Article 6(1)(c)):</p>
                    <p className="text-sm text-muted-foreground">Retention for medical records requirements, HMRC tax compliance, and regulatory obligations</p>
                  </div>
                </li>
              </ul>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                <p className="font-semibold text-foreground mb-2">Special Category Data — Additional Legal Basis (Article 9(2)(h)):</p>
                <p className="text-sm text-muted-foreground">
                  Patient health data (CBCT scans and clinical information) is processed under <strong>Article 9(2)(h) of UK GDPR</strong> — processing necessary for the purposes of preventive or occupational medicine, medical diagnosis, the provision of health or social care, or the management of health or social care systems and services. This processing is carried out by or under the responsibility of a health professional subject to professional secrecy obligations. Our reporting radiologists are registered with the General Dental Council (GDC) and/or General Medical Council (GMC).

            <section>
              <h2 className="text-xl font-bold mb-3">How We Use Your Data</h2>
              <ol className="list-decimal ml-6 space-y-2 text-muted-foreground">
                <li><strong>Receive:</strong> You upload CBCT scan via our secure portal</li>
                <li><strong>Store:</strong> Encrypted storage in UK data centres (Supabase UK/EU region)</li>
                <li><strong>Analyse:</strong> Expert radiologist reviews scan using specialist software</li>
                <li><strong>Report:</strong> Diagnostic report created with AI assistance (anonymised data only — see sub-processors below)</li>
                <li><strong>Deliver:</strong> Secure portal download only (no email transmission of reports)</li>
                <li><strong>Retain:</strong> Stored per NHS Records Management Code of Practice</li>
                <li><strong>Audit:</strong> All access logged for security and regulatory compliance</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Automated Decision-Making</h2>
              <p className="text-muted-foreground">
                We use AI tools to assist in drafting radiology reports. However, <strong>no automated decisions are made without human oversight</strong>. All AI-assisted reports are reviewed, edited, and approved by a qualified radiologist before delivery. The AI processes anonymised clinical findings only — no patient identifiers are shared with AI providers.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">How Long We Keep Your Data</h2>
              </div>
              <p className="text-muted-foreground mb-3">Retention periods follow the NHS Records Management Code of Practice:</p>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-foreground">
                  <strong>Adult patients (aged 18+):</strong> 8 years from the date of the scan
                </p>
                <p className="text-foreground">
                  <strong>Patients under 18:</strong> Until the patient's 25th birthday, or 8 years from the scan date — whichever is longer
                </p>
                <p className="text-foreground">
                  <strong>Audit logs:</strong> 7 years minimum (regulatory compliance)
                </p>
                <p className="text-foreground">
                  <strong>Financial records:</strong> 6 years (HMRC requirement)
                </p>
                <p className="text-foreground">
                  <strong>Registration interest submissions:</strong> 24 months, then securely deleted
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                After the retention period, data is securely pseudonymised or deleted in accordance with our data retention policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Who We Share Your Data With</h2>
              <div className="space-y-3">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">Authorised Recipients:</p>
                  <ul className="space-y-1 text-sm text-foreground">
                    <li>• <strong>The referring dental practitioner:</strong> Who requested the report (and holds patient consent)</li>
                    <li>• <strong>Our reporting radiologists:</strong> GDC/GMC registered professionals who create the diagnostic reports</li>
                  </ul>
                </div>
                <div className="bg-muted border rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">Sub-Processors (Data Processing Agreements in place):</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>
                      <strong>Supabase Inc. (Infrastructure hosting):</strong><br />
                      Purpose: Secure data storage, authentication, database hosting<br />
                      Location: EU data centres<br />
                      Certifications: SOC 2 Type II, ISO 27001<br />
                      Transfer mechanism: UK GDPR Adequacy / Standard Contractual Clauses
                    </li>
                    <li>
                      <strong>AI Providers (Report drafting assistance):</strong><br />
                      Purpose: Assisting with report drafting<br />
                      Data shared: <strong>Anonymised clinical findings only</strong> — no patient names, dates of birth, NHS numbers, or other identifiers are transmitted<br />
                      Transfer mechanism: Standard Contractual Clauses where applicable<br />
                      Note: All AI-generated content is reviewed and approved by a qualified radiologist before delivery
                    </li>
                    <li>
                      <strong>Resend (Email notifications):</strong><br />
                      Purpose: Sending system notifications and registration confirmations<br />
                      Data shared: Email addresses only<br />
                      Transfer mechanism: Standard Contractual Clauses
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">International Data Transfers</h2>
              </div>
              <div className="bg-muted border rounded-lg p-4">
                <p className="text-foreground mb-2"><strong>Primary data storage is within the UK/EU.</strong></p>
                <p className="text-sm text-muted-foreground mb-3">
                  Where data is transferred to sub-processors outside the UK (for example, AI providers based in the United States), we ensure appropriate safeguards are in place:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Standard Contractual Clauses (SCCs)</strong> approved by the ICO</li>
                  <li>• <strong>UK GDPR International Data Transfer Agreement (IDTA)</strong> where required</li>
                  <li>• Transfer Impact Assessments completed for each sub-processor</li>
                  <li>• Only anonymised data is shared with non-UK/EU AI providers</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Data Protection Impact Assessment</h2>
              <p className="text-muted-foreground">
                We have conducted a Data Protection Impact Assessment (DPIA) for our processing of special category health data, as required under UK GDPR Article 35. This assessment is reviewed annually or when significant changes are made to our processing activities. A summary is available upon request to privacy@dentarad.co.uk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Your Data Rights</h2>
              <p className="text-muted-foreground mb-3">Under UK GDPR, data subjects have the following rights:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right of Access (Article 15)</p>
                  <p className="text-xs text-muted-foreground">Request a copy of all personal data we hold about you</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right to Rectification (Article 16)</p>
                  <p className="text-xs text-muted-foreground">Correct inaccurate or incomplete personal data</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right to Erasure (Article 17)</p>
                  <p className="text-xs text-muted-foreground">Request deletion (subject to legal retention obligations)</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right to Data Portability (Article 20)</p>
                  <p className="text-xs text-muted-foreground">Receive your data in a structured, machine-readable format</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right to Object (Article 21)</p>
                  <p className="text-xs text-muted-foreground">Object to processing based on legitimate interests</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground text-sm">Right to Complain (Article 77)</p>
                  <p className="text-xs text-muted-foreground">Lodge a complaint with the Information Commissioner's Office</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                To exercise any of these rights, contact us at <strong>privacy@dentarad.co.uk</strong>. We will respond within one calendar month as required by UK GDPR.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Data Security Measures</h2>
              </div>
              <p className="text-muted-foreground mb-3">We protect your data using industry-standard security controls:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">HTTPS/TLS 1.3 encryption in transit</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">AES-256 encryption at rest</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Multi-factor authentication</span>
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
                  <span className="text-sm text-muted-foreground">Regular security monitoring and testing</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">Automatic session timeout (30 minutes)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-muted-foreground">SOC 2 Type II / ISO 27001 certified infrastructure</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Cookies & Tracking</h2>
              <p className="text-muted-foreground">
                We use <strong>essential cookies only</strong> for authentication and security purposes. 
                We do not use marketing, analytics, or tracking cookies. No third-party trackers are present on our site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Changes to This Notice</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Notice from time to time. Significant changes will be communicated to registered users via email. The current version is always available on our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Contact & Complaints</h2>
              <div className="bg-muted border rounded-lg p-4 space-y-2">
                <p className="text-sm text-foreground">
                  <strong>Data Protection Queries:</strong> privacy@dentarad.co.uk
                </p>
                <p className="text-sm text-foreground">
                  <strong>General Enquiries:</strong> info@dentarad.co.uk
                </p>
                <p className="text-sm text-foreground">
                  <strong>Supervisory Authority:</strong> Information Commissioner's Office (ICO)<br />
                  <span className="text-muted-foreground">
                    Website: <a href="https://ico.org.uk" className="underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a> | 
                    Tel: 0303 123 1113 | 
                    Email: casework@ico.org.uk
                  </span>
                </p>
              </div>
            </section>

            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> 12 March 2025<br />
                <strong>Version:</strong> 2.0<br />
                <strong>Next Review Date:</strong> March 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
