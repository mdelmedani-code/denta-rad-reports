import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFRequest {
  reportId: string;
  caseData: {
    patient_name: string;
    patient_dob?: string;
    patient_internal_id?: string;
    clinical_question: string;
    field_of_view: string;
    urgency: string;
    upload_date: string;
    clinic_name?: string;
    clinic_contact_email?: string;
  };
  reportText: string;
  templateId?: string;
  signatureData?: {
    signatory_name: string;
    signatory_title: string;
    signatory_credentials: string;
    signature_statement: string;
    signed_off_at: string;
  };
}

interface PDFTemplate {
  id: string;
  name: string;
  logo_url: string | null;
  company_name: string;
  company_address: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  header_text: string;
  footer_text: string;
}

// Enhanced HTML generation with print-optimized styling
function generatePDFHTML(data: PDFRequest, template: PDFTemplate): string {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Diagnostic Report - ${data.caseData.patient_name}</title>
      <style>
        @page {
          size: A4;
          margin: 0.5in;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${template.font_family};
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .container {
          width: 100%;
          max-width: none;
        }
        
        .header {
          background: ${template.primary_color};
          color: white;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .header-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo-img {
          max-height: 50px;
          max-width: 150px;
        }
        
        .company-info h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info p {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .patient-info {
          background: ${template.secondary_color};
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid ${template.primary_color};
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-weight: bold;
          color: ${template.primary_color};
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        
        .info-value {
          font-size: 12px;
          color: #333;
        }
        
        .urgency-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .urgency-standard {
          background: #e8f5e8;
          color: #2e7d32;
        }
        
        .urgency-urgent {
          background: #ffebee;
          color: #c62828;
        }
        
        .clinical-question {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          font-style: italic;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: ${template.primary_color};
          margin-bottom: 10px;
          border-bottom: 2px solid ${template.primary_color};
          padding-bottom: 5px;
        }
        
        .report-content {
          line-height: 1.6;
          white-space: pre-wrap;
          padding: 15px;
          background: #fafafa;
          border-radius: 5px;
        }
        
        .footer {
          margin-top: 30px;
          padding: 15px;
          background: ${template.secondary_color};
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
        }
        
        .footer-logo {
          font-weight: bold;
          color: ${template.primary_color};
          margin-bottom: 5px;
        }
        
        .images-section {
          margin: 20px 0;
        }
        
        .images-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 15px;
        }
        
        .image-placeholder {
          width: 100%;
          height: 150px;
          background: #f0f0f0;
          border: 2px dashed #cccccc;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          color: #999999;
          font-size: 11px;
          text-align: center;
        }
        
        .signature-section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-left: 3px solid ${template.primary_color};
          border-radius: 5px;
        }
        
        .signature-title {
          font-size: 14px;
          font-weight: bold;
          color: ${template.primary_color};
          margin-bottom: 8px;
        }
        
        .signature-content {
          font-size: 11px;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        
        .signature-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .signature-details {
          font-size: 10px;
          color: #666666;
          margin-bottom: 2px;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .header { break-inside: avoid; }
          .patient-info { break-inside: avoid; }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            ${template.logo_url ? `<img src="${template.logo_url}" alt="Company Logo" class="logo-img">` : ''}
            <div class="company-info">
              <h1>${template.company_name}</h1>
              <p>${template.header_text}</p>
            </div>
          </div>
        </div>
        
        <div class="patient-info">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Patient Name</div>
              <div class="info-value">${data.caseData.patient_name}</div>
            </div>
            ${data.caseData.patient_dob ? `
            <div class="info-item">
              <div class="info-label">Date of Birth</div>
              <div class="info-value">${new Date(data.caseData.patient_dob).toLocaleDateString()}</div>
            </div>
            ` : ''}
            ${data.caseData.patient_internal_id ? `
            <div class="info-item">
              <div class="info-label">Patient ID</div>
              <div class="info-value">${data.caseData.patient_internal_id}</div>
            </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Field of View</div>
              <div class="info-value">${data.caseData.field_of_view.replace('_', ' ').toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Urgency</div>
              <div class="info-value">
                <span class="urgency-badge urgency-${data.caseData.urgency}">
                  ${data.caseData.urgency.toUpperCase()}
                </span>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Report Date</div>
              <div class="info-value">${new Date(data.caseData.upload_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}</div>
            </div>
          </div>
          
          ${data.caseData.clinic_name ? `
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Referring Clinic</div>
              <div class="info-value">${data.caseData.clinic_name}</div>
            </div>
            ${data.caseData.clinic_contact_email ? `
            <div class="info-item">
              <div class="info-label">Contact Email</div>
              <div class="info-value">${data.caseData.clinic_contact_email}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>
        
        <div class="clinical-question">
          <strong>Clinical Question:</strong><br>
          ${data.caseData.clinical_question}
        </div>
        
        <div class="section">
          <div class="section-title">Diagnostic Findings</div>
          <div class="report-content">${data.reportText}</div>
        </div>
        
        <div class="images-section">
          <div class="section-title">Clinical Images</div>
          <div class="images-grid">
            <div class="image-placeholder">
              Image 1<br>[To be added]
            </div>
            <div class="image-placeholder">
              Image 2<br>[To be added]
            </div>
            <div class="image-placeholder">
              Image 3<br>[To be added]
            </div>
            <div class="image-placeholder">
              Image 4<br>[To be added]
            </div>
          </div>
        </div>
        
        ${data.signatureData ? `
        <div class="signature-section">
          <div class="signature-title">Digitally Signed Report</div>
          <div class="signature-content">${data.signatureData.signature_statement}</div>
          <div class="signature-name">${data.signatureData.signatory_name}</div>
          <div class="signature-details">${data.signatureData.signatory_title}</div>
          <div class="signature-details">${data.signatureData.signatory_credentials}</div>
          <div class="signature-details">Digitally signed on: ${new Date(data.signatureData.signed_off_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          <div class="footer-logo">${template.company_name}</div>
          ${template.company_address ? `<div>${template.company_address}</div>` : ''}
          <div>${template.footer_text}</div>
          <div style="margin-top: 10px;">Report ID: ${data.reportId} | Generated: ${currentDate}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// PDF generation using HTML to PDF conversion service
async function generatePDFFromHTML(htmlContent: string): Promise<Uint8Array> {
  try {
    // Use htmlcsstoimage.com API for reliable HTML to PDF conversion
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(Deno.env.get('HTMLCSS_USER_ID') + ':' + Deno.env.get('HTMLCSS_API_KEY'))
      },
      body: JSON.stringify({
        html: htmlContent,
        css: '',
        google_fonts: "Open Sans",
        format: 'pdf',
        viewport_width: 1024,
        viewport_height: 768,
        device_scale: 1
      })
    });

    if (response.ok) {
      const result = await response.json();
      const pdfResponse = await fetch(result.url);
      return new Uint8Array(await pdfResponse.arrayBuffer());
    }
  } catch (error) {
    console.warn('External PDF service failed, falling back to jsPDF:', error);
  }

  // Fallback to jsPDF for basic PDF generation
  try {
    const jsPDF = (await import("https://esm.sh/jspdf@2.5.1")).jsPDF;
    const doc = new jsPDF();
    
    // Extract text content from HTML for basic PDF
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Add content to PDF with word wrapping
    const lines = doc.splitTextToSize(textContent, 180);
    doc.text(lines, 10, 10);
    
    return new Uint8Array(doc.output('arraybuffer'));
  } catch (error) {
    console.error('All PDF generation methods failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

const serve_handler = async (req: Request): Promise<Response> => {
  console.log('PDF generation request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {   
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { reportId, caseData, reportText, templateId }: PDFRequest = await req.json();
    console.log('Processing PDF for report:', reportId);

    // Fetch PDF template
    let template: PDFTemplate;
    if (templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) {
        console.error('Error fetching template:', templateError);
        throw new Error('Template not found');
      }
      template = templateData;
    } else {
      // Fetch default active template
      const { data: templateData, error: templateError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (templateError) {
        console.error('Error fetching default template:', templateError);
        // Use fallback default template
        template = {
          id: 'fallback',
          name: 'Default Template',
          logo_url: null,
          company_name: 'DentaRad',
          company_address: null,
          primary_color: '#0066cc',
          secondary_color: '#f8f9fa',
          font_family: 'Arial, sans-serif',
          header_text: 'CBCT Diagnostic Report',
          footer_text: 'This report was generated by DentaRad AI diagnostic services.'
        };
      } else {
        template = templateData;
      }
    }

    // Generate HTML content optimized for PDF
    const htmlContent = generatePDFHTML({ reportId, caseData, reportText, templateId }, template);
    console.log('Generated HTML content for PDF');

    // Generate PDF from HTML
    const pdfBytes = await generatePDFFromHTML(htmlContent);

    // Upload to Supabase Storage
    const fileName = `report-${reportId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    // Update the reports table with the PDF URL (only if not a preview)
    if (reportId !== 'preview') {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ pdf_url: urlData.publicUrl })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report:', updateError);
        // Don't throw error for preview mode
      }
    }

    console.log('PDF generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        fileName,
        templateUsed: template.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(serve_handler);