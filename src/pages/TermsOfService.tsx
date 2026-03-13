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
            <div className="prose prose-sm max-w-none space-y-6 text-foreground">

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Last Updated:</strong> 12 March 2025</p>
                <p><strong>Version:</strong> 3.2</p>
                <p><strong>Next Review Date:</strong> March 2026</p>
              </div>

              <section>
                <h2 className="text-xl font-bold mb-2">Company Information</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad is a trading name of Radelm Ltd, a company registered in England and Wales.
                </p>
                <p className="text-muted-foreground mb-1"><strong>Registered office:</strong></p>
                <address className="text-muted-foreground not-italic ml-4 space-y-0.5">
                  <p>Suite 12 East Wing</p>
                  <p>Jason House</p>
                  <p>Kerry Hill</p>
                  <p>Horsforth</p>
                  <p>Leeds</p>
                  <p>West Yorkshire</p>
                  <p>United Kingdom</p>
                  <p>LS18 4JR</p>
                </address>
                <p className="text-muted-foreground mt-2">
                  <strong>Company number:</strong> 14787209
                </p>
                <p className="text-muted-foreground mt-2">
                  Throughout these terms, references to &quot;DentaRad&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; refer to Radelm Ltd trading as DentaRad.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">1. Service Description</h2>
                <p className="text-muted-foreground mb-2">
                  These Terms of Service govern the use of the DentaRad reporting platform operated by Radelm Ltd trading as DentaRad.
                </p>
                <p className="text-muted-foreground mb-2">
                  DentaRad provides specialist CBCT (Cone Beam Computed Tomography) radiology reporting services to dental practitioners across the United Kingdom via a secure digital platform.
                </p>
                <p className="text-muted-foreground mb-2">
                  Dental practitioners upload CBCT scans and associated clinical information, and DentaRad provides expert diagnostic reports prepared and authorised by appropriately qualified radiologists registered with the General Medical Council (GMC).
                </p>
                <p className="text-muted-foreground mb-2">
                  Reports represent the professional opinion of the reporting radiologist based on the images and clinical information supplied.
                </p>
                <p className="text-muted-foreground">
                  DentaRad provides reporting services with reasonable skill and care consistent with the standards expected of a consultant radiologist.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">2. Eligibility</h2>
                <p className="text-muted-foreground mb-2">
                  This service is available only to registered dental practitioners, medical doctors, and authorised healthcare professionals practising in the United Kingdom.
                </p>
                <p className="text-muted-foreground mb-2">By using this service, you confirm that:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>You hold valid professional registration (e.g. GDC, GMC)</li>
                  <li>You are authorised to request radiological investigations and reporting</li>
                  <li>You are acting in the course of your professional clinical practice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">3. Clinical Governance</h2>
                <p className="text-muted-foreground mb-2">
                  All reports are prepared by appropriately qualified radiologists registered with the General Medical Council (GMC) and working within their scope of practice.
                </p>
                <p className="text-muted-foreground mb-2">DentaRad maintains appropriate clinical governance procedures including:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Continuing professional development</li>
                  <li>Maintenance of professional standards</li>
                  <li>Professional indemnity insurance</li>
                  <li>Clinical discrepancy review where appropriate</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">4. Your Responsibilities (Data Controller)</h2>
                <p className="text-muted-foreground mb-2">
                  As the referring practitioner, you act as the Data Controller under UK GDPR and the Data Protection Act 2018.
                </p>
                <p className="text-muted-foreground mb-2">You are responsible for:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Obtaining appropriate patient consent or another lawful basis for sharing patient data with DentaRad</li>
                  <li>Ensuring that sharing patient data complies with UK GDPR and the Data Protection Act 2018</li>
                  <li>Uploading only data necessary for the requested report</li>
                  <li>Maintaining records of patient consent in accordance with professional obligations</li>
                  <li>Providing accurate and sufficient clinical information relevant to the reporting request</li>
                </ul>
                <p className="text-muted-foreground mt-3 mb-2">You must also:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Keep login credentials secure</li>
                  <li>Not share login credentials with unauthorised persons</li>
                  <li>Use strong passwords</li>
                  <li>Enable multi-factor authentication where available</li>
                  <li>Log out after each session</li>
                  <li>Secure devices used to access the platform</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  Any suspected data breach must be reported immediately to: <strong>info@dentarad.co.uk</strong>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">5. Our Responsibilities (Data Processor)</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad acts as a Data Processor on behalf of the referring practitioner.
                </p>
                <p className="text-muted-foreground mb-2">We will:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Process personal data only in accordance with your documented instructions</li>
                  <li>Implement appropriate technical and organisational security measures</li>
                  <li>Ensure staff with access to personal data are subject to confidentiality obligations</li>
                  <li>Maintain audit logs of system activity</li>
                  <li>Assist with responding to Data Subject Access Requests where applicable</li>
                  <li>Notify you of confirmed data breaches without undue delay where required</li>
                  <li>Delete or return personal data upon termination of the agreement subject to legal retention obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">6. Data Security</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad implements security measures in accordance with UK GDPR Article 32.
                </p>
                <p className="text-muted-foreground mb-2">These include:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>HTTPS/TLS encryption for data in transit</li>
                  <li>Encryption for stored data</li>
                  <li>Multi-factor authentication where available</li>
                  <li>Role-based access control</li>
                  <li>Audit logging of user activity</li>
                  <li>Automatic session timeouts</li>
                  <li>Security monitoring and vulnerability testing</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Infrastructure is hosted using secure cloud platforms that follow recognised industry security standards.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">7. Data Processing Workflow</h2>
                <p className="text-muted-foreground mb-2">Patient data is processed as follows:</p>

                <h3 className="text-lg font-semibold mt-3 mb-1">Upload</h3>
                <p className="text-muted-foreground">
                  CBCT scans and associated clinical information are uploaded via the secure portal or other agreed secure transfer mechanism.
                </p>

                <h3 className="text-lg font-semibold mt-3 mb-1">Processing</h3>
                <p className="text-muted-foreground">
                  Images are reviewed by a qualified consultant radiologist.
                </p>

                <h3 className="text-lg font-semibold mt-3 mb-1">Reporting</h3>
                <p className="text-muted-foreground">
                  A diagnostic radiology report is prepared and authorised by the reporting radiologist.
                </p>

                <h3 className="text-lg font-semibold mt-3 mb-1">Delivery</h3>
                <p className="text-muted-foreground">
                  Reports are delivered via a secure channel, which may include encrypted portal access, secure electronic transfer, or other encrypted communication methods agreed between the parties.
                </p>
                <p className="text-muted-foreground mt-1">
                  Reports will not be transmitted via unsecured communication methods.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">8. Data Retention</h2>
                <p className="text-muted-foreground mb-2">
                  Data is retained in accordance with the NHS Records Management Code of Practice.
                </p>
                <p className="text-muted-foreground mb-2">Retention periods are:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Adult patients: 8 years from scan date</li>
                  <li>Patients under 18: until age 25 or 8 years, whichever is longer</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  After the retention period expires, data will be securely deleted.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">9. Image Quality and Clinical Information</h2>
                <p className="text-muted-foreground mb-2">
                  The quality and completeness of the report depends on the quality of the images and clinical information supplied.
                </p>
                <p className="text-muted-foreground mb-2">DentaRad reserves the right to:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Request additional clinical information</li>
                  <li>Request repeat uploads where images are incomplete</li>
                  <li>Decline to issue a report where images are non-diagnostic or inadequate for interpretation</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">10. Turnaround Time</h2>
                <p className="text-muted-foreground mb-2">
                  Standard turnaround times are provided for guidance only and represent target reporting times.
                </p>
                <p className="text-muted-foreground mb-2">Turnaround times may be affected by:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Image quality issues</li>
                  <li>Missing clinical information</li>
                  <li>Technical interruptions</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Urgent reporting options may be available where specified.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">11. Service Availability</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad provides reporting services on a best-efforts basis.
                </p>
                <p className="text-muted-foreground mb-2">
                  While reasonable steps are taken to maintain service availability and timely reporting, uninterrupted access to the service cannot be guaranteed.
                </p>
                <p className="text-muted-foreground mb-2">Service availability may be affected by factors including:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>System maintenance</li>
                  <li>Technical failures</li>
                  <li>Internet or infrastructure outages</li>
                  <li>Radiologist availability</li>
                  <li>Circumstances beyond reasonable control</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  DentaRad reserves the right to suspend or temporarily restrict access to the service for maintenance, security updates, or operational reasons.
                </p>
                <p className="text-muted-foreground mt-1">
                  Where reasonably possible, users will be notified in advance of planned service interruptions.
                </p>
                <p className="text-muted-foreground mt-1">
                  The referring practitioner remains responsible for ensuring appropriate arrangements exist for urgent patient care where immediate reporting may be required.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">12. Fees and Payment</h2>
                <p className="text-muted-foreground mb-2">
                  Fees are charged per report according to the current pricing schedule.
                </p>
                <p className="text-muted-foreground mb-2">Unless otherwise agreed:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Invoices are issued monthly in arrears</li>
                  <li>Payment is due within 30 days</li>
                  <li>Prices are stated in GBP excluding VAT</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Late payments may incur interest under the Late Payment of Commercial Debts (Interest) Act 1998.
                </p>
                <p className="text-muted-foreground mt-1">
                  Access to the service may be suspended where invoices remain unpaid for more than 60 days.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">13. Intellectual Property</h2>
                <p className="text-muted-foreground mb-2">
                  Copyright in report text, report templates, and reporting formats remains the property of DentaRad.
                </p>
                <p className="text-muted-foreground mb-2">The referring practitioner is granted a non-exclusive licence to use the report for:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Clinical decision-making</li>
                  <li>Inclusion in patient records</li>
                  <li>Medico-legal purposes</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  The underlying CBCT scan data remains the property of the referring practice.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">14. Professional Indemnity</h2>
                <p className="text-muted-foreground">
                  DentaRad maintains appropriate professional indemnity insurance covering the provision of radiology reporting services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">15. Liability and Indemnity</h2>
                <p className="text-muted-foreground mb-2">
                  The referring practitioner agrees to indemnify and hold harmless DentaRad against claims arising from:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Failure by the referring practitioner to obtain appropriate patient consent or other lawful basis for sharing patient data</li>
                  <li>Improper handling or onward transmission of reports</li>
                  <li>Breach of UK GDPR or the Data Protection Act 2018 by the referring practitioner</li>
                  <li>Sharing login credentials with unauthorised persons</li>
                </ul>
                <p className="text-muted-foreground mt-3 mb-2">
                  DentaRad's total aggregate liability under or in connection with this agreement shall not exceed the greater of:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>The total fees paid by the referring practitioner in the preceding 12 months; or</li>
                  <li>£10,000</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  DentaRad shall not be liable for indirect or consequential losses including loss of profits, loss of business, loss of goodwill, or loss of anticipated savings.
                </p>
                <p className="text-muted-foreground mt-1">
                  Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any liability which cannot legally be excluded under English law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">16. Reliance on Information Provided</h2>
                <p className="text-muted-foreground mb-2">DentaRad prepares reports based solely on:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>The imaging data supplied</li>
                  <li>The clinical information provided by the referring practitioner</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  The accuracy of the report depends on the quality of images and adequacy of the clinical information supplied.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">17. Clinical Responsibility</h2>
                <p className="text-muted-foreground mb-2">The referring practitioner retains full responsibility for:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Determining the appropriateness of imaging investigations</li>
                  <li>Providing adequate clinical information</li>
                  <li>Reviewing reports in a timely manner</li>
                  <li>Integrating imaging findings with the clinical picture</li>
                  <li>Determining appropriate treatment or referral</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Radiology reports represent a professional diagnostic opinion and must be interpreted alongside the full clinical assessment.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">18. Urgent or Critical Findings</h2>
                <p className="text-muted-foreground mb-2">
                  Where findings may require urgent clinical attention, DentaRad will make reasonable efforts to notify the referring practitioner using the contact details provided.
                </p>
                <p className="text-muted-foreground mb-2">
                  However, the referring practitioner remains responsible for ensuring appropriate systems exist to review reports and act upon findings.
                </p>
                <p className="text-muted-foreground">
                  Immediate notification cannot be guaranteed in all circumstances.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">19. Term and Termination</h2>
                <p className="text-muted-foreground mb-2">
                  This agreement begins when you register for the service.
                </p>
                <p className="text-muted-foreground mb-2">
                  Either party may terminate the agreement with 30 days written notice.
                </p>
                <p className="text-muted-foreground mb-2">Upon termination:</p>
                <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                  <li>Reports and associated data will be made available for download</li>
                  <li>Data will be retained only as legally required</li>
                  <li>Access to the service will be removed</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">20. Dispute Resolution</h2>
                <p className="text-muted-foreground mb-2">
                  In the event of a dispute, both parties agree to attempt resolution through good-faith negotiation.
                </p>
                <p className="text-muted-foreground">
                  If resolution cannot be achieved within 30 days, either party may refer the matter to mediation under the CEDR Model Mediation Procedure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">21. Force Majeure</h2>
                <p className="text-muted-foreground">
                  Neither party shall be liable for failure or delay in performing obligations due to circumstances beyond reasonable control, including natural disasters, cyber attacks, infrastructure failures, or governmental actions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">22. Changes to These Terms</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad may update these terms periodically.
                </p>
                <p className="text-muted-foreground mb-2">
                  Registered users will receive 30 days notice of material changes.
                </p>
                <p className="text-muted-foreground">
                  Continued use of the service following the notice period constitutes acceptance of the updated terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-2">23. Governing Law</h2>
                <p className="text-muted-foreground mb-2">
                  These terms are governed by and construed in accordance with the laws of England and Wales.
                </p>
                <p className="text-muted-foreground">
                  The courts of England and Wales shall have exclusive jurisdiction over any dispute arising from these terms.
                </p>
              </section>

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
