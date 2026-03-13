import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-lg shadow p-8 border">
          <h1 className="text-3xl font-bold text-foreground mb-2">DentaRad Privacy Notice</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: 12 March 2025</p>

          <ScrollArea className="h-auto">
            <div className="prose prose-sm max-w-none space-y-8 text-foreground">

              {/* 1. Introduction */}
              <section>
                <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
                <p className="text-muted-foreground">
                  This Privacy Notice explains how Radelm Ltd trading as DentaRad processes personal data when providing CBCT radiology reporting services.
                </p>
                <p className="text-muted-foreground">
                  DentaRad provides specialist radiology reporting services to dental practitioners. In most circumstances, DentaRad acts as a data processor on behalf of the referring dental practice, which acts as the data controller.
                </p>
                <p className="text-muted-foreground">
                  If you are a patient and have questions about how your data is used, you should normally contact the dental practice that requested the scan.
                </p>
              </section>

              {/* 2. Company Information */}
              <section>
                <h2 className="text-xl font-bold mb-3">2. Company Information</h2>
                <p className="text-muted-foreground">
                  DentaRad is a trading name of Radelm Ltd.
                </p>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm text-foreground">
                  <p>Registered in England and Wales</p>
                  <p>Company number: 14787209</p>
                  <p className="mt-3 font-semibold">Registered office:</p>
                  <p>
                    Suite 12 East Wing<br />
                    Jason House<br />
                    Kerry Hill<br />
                    Horsforth<br />
                    Leeds<br />
                    West Yorkshire<br />
                    United Kingdom<br />
                    LS18 4JR
                  </p>
                  <p className="mt-3">
                    <strong>Contact:</strong> info@dentarad.co.uk
                  </p>
                </div>
              </section>

              {/* 3. Our Role Under Data Protection Law */}
              <section>
                <h2 className="text-xl font-bold mb-3">3. Our Role Under Data Protection Law</h2>
                <p className="text-muted-foreground mb-2">
                  Under the UK General Data Protection Regulation (UK GDPR):
                </p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• The dental practice requesting the report is the <strong className="text-foreground">Data Controller</strong>.</li>
                  <li>• DentaRad acts as a <strong className="text-foreground">Data Processor</strong>.</li>
                </ul>
                <p className="text-muted-foreground mt-3">This means the dental practice decides:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• why patient data is used</li>
                  <li>• what data is shared</li>
                  <li>• how long it should be retained.</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  DentaRad processes the data only to provide the radiology reporting service.
                </p>
              </section>

              {/* 4. Personal Data We Process */}
              <section>
                <h2 className="text-xl font-bold mb-3">4. Personal Data We Process</h2>
                <p className="text-muted-foreground mb-3">The information processed may include:</p>
                <div className="bg-muted rounded-lg p-4 space-y-4">
                  <div>
                    <p className="font-semibold text-foreground">Patient information such as:</p>
                    <ul className="text-sm text-muted-foreground ml-4 space-y-1 mt-1">
                      <li>• name</li>
                      <li>• date of birth</li>
                      <li>• patient identification numbers</li>
                      <li>• CBCT imaging data</li>
                      <li>• relevant clinical information</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Referrer information such as:</p>
                    <ul className="text-sm text-muted-foreground ml-4 space-y-1 mt-1">
                      <li>• practitioner name</li>
                      <li>• practice name</li>
                      <li>• contact details</li>
                      <li>• account login information.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Purpose of Processing */}
              <section>
                <h2 className="text-xl font-bold mb-3">5. Purpose of Processing</h2>
                <p className="text-muted-foreground mb-2">We process personal data solely for the purpose of:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• providing radiology reporting services</li>
                  <li>• preparing diagnostic reports</li>
                  <li>• delivering reports to referring clinicians</li>
                  <li>• maintaining secure records in accordance with legal obligations.</li>
                </ul>
              </section>

              {/* 6. Legal Basis for Processing */}
              <section>
                <h2 className="text-xl font-bold mb-3">6. Legal Basis for Processing</h2>
                <p className="text-muted-foreground mb-2">
                  Because DentaRad acts as a data processor, the legal basis for processing is determined by the data controller (the dental practice).
                </p>
                <p className="text-muted-foreground">Typically this is:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• provision of healthcare services</li>
                  <li>• legitimate interests in providing healthcare</li>
                  <li>• compliance with legal obligations.</li>
                </ul>
              </section>

              {/* 7. Data Security */}
              <section>
                <h2 className="text-xl font-bold mb-3">7. Data Security</h2>
                <p className="text-muted-foreground mb-2">
                  DentaRad implements appropriate technical and organisational measures to protect personal data.
                </p>
                <p className="text-muted-foreground">These include:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• encrypted data transmission</li>
                  <li>• secure cloud hosting</li>
                  <li>• access controls</li>
                  <li>• audit logging</li>
                  <li>• secure authentication procedures.</li>
                </ul>
              </section>

              {/* 8. Data Storage and Location */}
              <section>
                <h2 className="text-xl font-bold mb-3">8. Data Storage and Location</h2>
                <p className="text-muted-foreground">
                  Patient data is stored on secure cloud infrastructure located within the UK or European Economic Area (EEA) where possible.
                </p>
                <p className="text-muted-foreground">
                  Where third-party service providers outside the UK are used, appropriate safeguards such as Standard Contractual Clauses (SCCs) are applied.
                </p>
              </section>

              {/* 9. Data Retention */}
              <section>
                <h2 className="text-xl font-bold mb-3">9. Data Retention</h2>
                <p className="text-muted-foreground mb-2">
                  Data is retained in accordance with the NHS Records Management Code of Practice.
                </p>
                <p className="text-muted-foreground">Retention periods are typically:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• <strong className="text-foreground">Adult patients:</strong> 8 years</li>
                  <li>• <strong className="text-foreground">Patients under 18:</strong> until age 25 or 8 years (whichever is longer).</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  After this period, data will be securely deleted.
                </p>
              </section>

              {/* 10. Data Sharing */}
              <section>
                <h2 className="text-xl font-bold mb-3">10. Data Sharing</h2>
                <p className="text-muted-foreground mb-2">Personal data may be shared with:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• the referring dental practitioner</li>
                  <li>• authorised clinical staff involved in reporting</li>
                  <li>• secure technology providers supporting the platform.</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Data is not sold or shared for marketing purposes.
                </p>
              </section>

              {/* 11. Patient Rights */}
              <section>
                <h2 className="text-xl font-bold mb-3">11. Patient Rights</h2>
                <p className="text-muted-foreground mb-2">Under UK GDPR, individuals have rights including:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• the right of access</li>
                  <li>• the right to rectification</li>
                  <li>• the right to restriction of processing</li>
                  <li>• the right to lodge a complaint with the ICO.</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Because DentaRad acts as a data processor, most requests should be directed to the referring dental practice.
                </p>
              </section>

              {/* 12. Complaints */}
              <section>
                <h2 className="text-xl font-bold mb-3">12. Complaints</h2>
                <p className="text-muted-foreground mb-2">
                  If you have concerns about how personal data is handled, you may contact:
                </p>
                <div className="bg-muted rounded-lg p-4 text-sm text-foreground">
                  <p className="font-semibold">Information Commissioner's Office (ICO)</p>
                  <a href="https://ico.org.uk" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                    https://ico.org.uk
                  </a>
                </div>
              </section>

              {/* 13. Changes to This Privacy Notice */}
              <section>
                <h2 className="text-xl font-bold mb-3">13. Changes to This Privacy Notice</h2>
                <p className="text-muted-foreground">
                  This Privacy Notice may be updated periodically.
                </p>
                <p className="text-muted-foreground">
                  Material changes will be published on the website.
                </p>
              </section>

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
