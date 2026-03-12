import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-lg shadow-lg p-8 border">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Terms of Service
            </h1>
          </div>

          <ScrollArea className="h-auto border rounded-lg p-6 mb-6 bg-background">
            <div className="prose prose-sm max-w-none space-y-4 text-foreground">
              <section>
                <h2 className="text-xl font-bold mb-2">1. Service Description</h2>
                <p className="text-muted-foreground">
                  DentaRad provides specialist CBCT (Cone Beam Computed Tomography) radiology reporting services to dental practitioners across the United Kingdom via our secure web portal. You upload CBCT scans and we provide expert diagnostic reports prepared by GDC/GMC registered radiologists.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">2. Eligibility</h2>
                <p className="text-muted-foreground">
                  This service is available to registered dental practitioners, medical doctors, and authorised healthcare professionals practising in the United Kingdom. By using this service, you confirm that you are a qualified healthcare professional with a valid registration (e.g., GDC, GMC) and are authorised to refer patients for radiological reporting.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">3. Your Responsibilities (Data Controller)</h2>
                <p className="text-muted-foreground mb-2">As the referring practitioner, you are the Data Controller under UK GDPR and must:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Obtain valid, informed patient consent before uploading scans to our portal</li>
                  <li>Ensure you have a lawful basis to share patient data with us</li>
                  <li>Only upload data necessary for the requested report (data minimisation)</li>
                  <li>Not share your login credentials with any other person</li>
                  <li>Use strong passwords and enable multi-factor authentication when available</li>
                  <li>Log out after each session and secure your devices</li>
                  <li>Not attempt to access other users' data or circumvent security controls</li>
                  <li>Comply with all applicable UK GDPR and Data Protection Act 2018 requirements</li>
                  <li>Notify us immediately of any suspected data breach or security incident at info@dentarad.co.uk</li>
                  <li>Maintain your own records of patient consent in line with GDC requirements</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">4. Our Responsibilities (Data Processor)</h2>
                <p className="text-muted-foreground mb-2">As your Data Processor, we will:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Provide a secure portal with industry-standard encryption and access controls</li>
                  <li>Process patient data only in accordance with your documented instructions</li>
                  <li>Maintain comprehensive audit logs of all data access</li>
                  <li>Notify you of any confirmed data breach without undue delay and within 72 hours, in accordance with UK GDPR Article 33</li>
                  <li>Assist you in responding to data subject access requests (DSARs)</li>
                  <li>Delete or return your data upon termination of the agreement (subject to legal retention obligations)</li>
                  <li>Make available all information necessary to demonstrate compliance, and allow for and contribute to audits (with reasonable prior notice)</li>
                  <li>Ensure all staff with access to personal data are bound by confidentiality obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">5. Data Security</h2>
                <p className="text-muted-foreground mb-2">Our portal provides the following security measures (UK GDPR Article 32):</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>HTTPS/TLS 1.3 encryption for all data in transit</li>
                  <li>AES-256 encryption for all data at rest</li>
                  <li>Multi-factor authentication</li>
                  <li>Role-based access control (principle of least privilege)</li>
                  <li>Comprehensive audit logging of all user actions</li>
                  <li>Regular security monitoring and vulnerability testing</li>
                  <li>SOC 2 Type II and ISO 27001 certified infrastructure (Supabase)</li>
                  <li>Automatic session timeout after 30 minutes of inactivity</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">6. Data Processing</h2>
                <p className="text-muted-foreground mb-2">We process data as follows:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li><strong>Upload:</strong> Secure portal with encrypted transfer to UK/EU hosted storage</li>
                  <li><strong>Processing:</strong> Automated metadata extraction followed by expert radiologist review</li>
                  <li><strong>Reporting:</strong> Expert radiologist prepares diagnostic report with full review and sign-off</li>
                  <li><strong>Delivery:</strong> Secure portal download only — reports are never sent via email</li>
                  <li><strong>Retention:</strong> 8 years from scan date for adult patients; until 25th birthday or 8 years (whichever is longer) for patients under 18, per the NHS Records Management Code of Practice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">7. Data Location & International Transfers</h2>
                <p className="text-muted-foreground mb-2">
                  All primary data is stored within UK/EU data centres. Where sub-processors are located outside the UK (see our Privacy Notice for the full list), appropriate safeguards are in place including:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>ICO-approved Standard Contractual Clauses (SCCs)</li>
                  <li>UK International Data Transfer Agreement (IDTA) where applicable</li>
                  <li>Only anonymised data is shared with non-UK/EU sub-processors where necessary</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">8. Fees & Payment</h2>
                <p className="text-muted-foreground mb-2">
                  Fees are charged per report based on the field of view and urgency level, as set out in our current pricing schedule (available on the portal and on request). Unless otherwise agreed in writing:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Invoices are issued monthly in arrears for all reports delivered during that period</li>
                  <li>Payment is due within 30 days of the invoice date</li>
                  <li>All prices are in GBP and exclusive of VAT (if applicable)</li>
                  <li>Late payments may incur interest at the rate prescribed by the Late Payment of Commercial Debts (Interest) Act 1998</li>
                  <li>We reserve the right to suspend access to the portal if invoices remain unpaid for more than 60 days</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">9. Intellectual Property</h2>
                <p className="text-muted-foreground">
                  The diagnostic report content is provided for the clinical use of the referring practitioner and their patient. Copyright in the report text, format, and templates remains with DentaRad. The referring practitioner is granted a non-exclusive, perpetual licence to use, store, and share the report content for clinical and medico-legal purposes in connection with the patient's care. The underlying CBCT scan data remains the property of the referring practice.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">10. Liability & Indemnification</h2>
                
                <h3 className="text-lg font-semibold mt-3 mb-2">a) You indemnify us against claims arising from:</h3>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Your failure to obtain valid patient consent</li>
                  <li>Your failure to secure your account credentials</li>
                  <li>Your sharing of login credentials with unauthorised persons</li>
                  <li>Your forwarding of reports via insecure means (e.g., unencrypted email)</li>
                  <li>Your breach of UK GDPR or the Data Protection Act 2018</li>
                </ul>

                <h3 className="text-lg font-semibold mt-3 mb-2">b) Our liability:</h3>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>We accept liability for our failure to implement appropriate security measures</li>
                  <li>We accept liability for unauthorised disclosure of data caused by our negligence</li>
                  <li>We accept liability for breach of this agreement caused by our actions</li>
                  <li><strong>Liability cap:</strong> Our total aggregate liability under or in connection with this agreement shall not exceed the greater of (i) the total fees paid by you in the 12 months preceding the claim, or (ii) £10,000</li>
                  <li>Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under English law</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">11. Clinical Disclaimer</h2>
                <p className="text-muted-foreground">
                  Our reports provide a radiological opinion based on the images and clinical information supplied. The referring practitioner retains full clinical responsibility for patient diagnosis and treatment decisions. Our reports do not constitute a definitive diagnosis and should be interpreted in conjunction with the full clinical picture. If there is any discrepancy between the report and clinical findings, the referring practitioner should contact us for further discussion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">12. Term & Termination</h2>
                <p className="text-muted-foreground mb-2">
                  This agreement begins when you register for the service and continues until terminated by either party.
                </p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li><strong>Termination by you:</strong> You may terminate at any time by giving 30 days' written notice to info@dentarad.co.uk. You remain liable for fees for reports delivered prior to termination.</li>
                  <li><strong>Termination by us:</strong> We may terminate with 30 days' written notice, or immediately if you breach these terms materially.</li>
                  <li><strong>Effect of termination:</strong> Upon termination, we will provide you with copies of all reports and data associated with your account within 30 days. After this period, data will be retained only as required by law (see retention periods in our Privacy Notice) and then securely deleted.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">13. Dispute Resolution</h2>
                <p className="text-muted-foreground">
                  In the event of a dispute arising out of or in connection with these terms, both parties agree to first attempt to resolve the matter through good-faith negotiation. If the dispute cannot be resolved within 30 days, either party may refer the matter to mediation under the Centre for Effective Dispute Resolution (CEDR) Model Mediation Procedure. If mediation fails, either party may commence court proceedings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">14. Force Majeure</h2>
                <p className="text-muted-foreground">
                  Neither party shall be liable for any failure or delay in performing its obligations under these terms where such failure or delay results from circumstances beyond the reasonable control of that party, including but not limited to: acts of God, pandemic, fire, flood, governmental action, cyber-attack, or failure of third-party infrastructure. The affected party must notify the other party promptly and use reasonable endeavours to mitigate the impact.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">15. Changes to These Terms</h2>
                <p className="text-muted-foreground">
                  We may update these terms from time to time. Material changes will be communicated to registered users via email with at least 30 days' notice. Continued use of the service after the notice period constitutes acceptance of the updated terms. If you do not agree with the changes, you may terminate your account in accordance with Section 12.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">16. Governing Law & Jurisdiction</h2>
                <p className="text-muted-foreground">
                  These terms are governed by and construed in accordance with the laws of England and Wales. The courts of England and Wales shall have exclusive jurisdiction over any dispute arising out of or in connection with these terms.
                </p>
              </section>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Last Updated:</strong> 12 March 2025<br />
                  <strong>Version:</strong> 2.0<br />
                  <strong>Next Review Date:</strong> March 2026
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
