import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-card rounded-lg shadow p-8 border">
          <h1 className="text-3xl font-bold text-foreground mb-2">DentaRad Data Processing Agreement</h1>
          <p className="text-sm text-muted-foreground mb-8">Effective Date: 12 March 2025</p>

          <ScrollArea className="h-auto">
            <div className="prose prose-sm max-w-none space-y-8 text-foreground">

              {/* 1. Parties */}
              <section>
                <h2 className="text-xl font-bold mb-3">1. Parties</h2>
                <p className="text-muted-foreground">This Data Processing Agreement is entered into between:</p>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm text-foreground mt-2">
                  <p><strong>The Referring Practitioner or Dental Practice</strong> (Data Controller)</p>
                  <p>and</p>
                  <p><strong>Radelm Ltd trading as DentaRad</strong> (Data Processor).</p>
                </div>
              </section>

              {/* 2. Purpose */}
              <section>
                <h2 className="text-xl font-bold mb-3">2. Purpose</h2>
                <p className="text-muted-foreground">
                  This agreement governs the processing of personal data by DentaRad when providing radiology reporting services to the referring practitioner.
                </p>
              </section>

              {/* 3. Nature of Processing */}
              <section>
                <h2 className="text-xl font-bold mb-3">3. Nature of Processing</h2>
                <p className="text-muted-foreground mb-2">DentaRad processes personal data for the purpose of:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• reviewing CBCT imaging</li>
                  <li>• preparing radiology reports</li>
                  <li>• delivering reports to referring clinicians.</li>
                </ul>
                <p className="text-muted-foreground mt-3">Processing may include:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• storage</li>
                  <li>• viewing</li>
                  <li>• interpretation of imaging</li>
                  <li>• report generation.</li>
                </ul>
              </section>

              {/* 4. Categories of Data Subjects */}
              <section>
                <h2 className="text-xl font-bold mb-3">4. Categories of Data Subjects</h2>
                <p className="text-muted-foreground mb-2">Personal data may relate to:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• dental patients</li>
                  <li>• referring clinicians.</li>
                </ul>
              </section>

              {/* 5. Types of Personal Data */}
              <section>
                <h2 className="text-xl font-bold mb-3">5. Types of Personal Data</h2>
                <p className="text-muted-foreground mb-2">Data processed may include:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• patient identifiers</li>
                  <li>• date of birth</li>
                  <li>• imaging data</li>
                  <li>• clinical history</li>
                  <li>• practitioner details.</li>
                </ul>
              </section>

              {/* 6. Processor Obligations */}
              <section>
                <h2 className="text-xl font-bold mb-3">6. Processor Obligations</h2>
                <p className="text-muted-foreground mb-2">DentaRad agrees to:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• process data only according to the controller's instructions</li>
                  <li>• maintain appropriate security measures</li>
                  <li>• ensure confidentiality of staff accessing data</li>
                  <li>• assist the controller in responding to data subject requests</li>
                  <li>• notify the controller of data breaches without undue delay</li>
                  <li>• delete or return personal data upon termination where required.</li>
                </ul>
              </section>

              {/* 7. Security Measures */}
              <section>
                <h2 className="text-xl font-bold mb-3">7. Security Measures</h2>
                <p className="text-muted-foreground mb-2">Security measures include:</p>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• encryption in transit</li>
                  <li>• encrypted storage</li>
                  <li>• role-based access controls</li>
                  <li>• system monitoring and logging.</li>
                </ul>
              </section>

              {/* 8. Sub-processors */}
              <section>
                <h2 className="text-xl font-bold mb-3">8. Sub-processors</h2>
                <p className="text-muted-foreground">
                  DentaRad may use technology providers to support the service, including secure cloud hosting providers.
                </p>
                <p className="text-muted-foreground">
                  All sub-processors are required to maintain appropriate data protection standards.
                </p>
              </section>

              {/* 9. Data Breach Notification */}
              <section>
                <h2 className="text-xl font-bold mb-3">9. Data Breach Notification</h2>
                <p className="text-muted-foreground">
                  In the event of a personal data breach, DentaRad will notify the data controller without undue delay after becoming aware of the breach.
                </p>
              </section>

              {/* 10. Termination */}
              <section>
                <h2 className="text-xl font-bold mb-3">10. Termination</h2>
                <p className="text-muted-foreground">
                  Upon termination of the service agreement, personal data will be retained only as required by law or securely deleted.
                </p>
              </section>

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
