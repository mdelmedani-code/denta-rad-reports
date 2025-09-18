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

// Enhanced HTML generation with customizable template styling
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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${template.font_family};
          line-height: 1.6;
          color: #2c3e50;
          background: linear-gradient(135deg, ${template.secondary_color} 0%, #e9ecef 100%);
          padding: 20px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, ${template.primary_color} 0%, ${template.primary_color}dd 100%);
          color: white;
          padding: 40px;
          text-align: center;
          position: relative;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
          opacity: 0.3;
        }
        
        .header > * {
          position: relative;
          z-index: 1;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        
        .logo-img {
          max-height: 60px;
          max-width: 200px;
          margin-right: 15px;
        }
        
        .logo {
          font-size: 2.5em;
          font-weight: 700;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .subtitle {
          font-size: 1.2em;
          opacity: 0.9;
          font-weight: 300;
        }
        
        .content {
          padding: 40px;
        }
        
        .section {
          margin-bottom: 35px;
          border-left: 4px solid ${template.primary_color};
          padding-left: 20px;
        }
        
        .section-title {
          font-size: 1.4em;
          font-weight: 600;
          margin-bottom: 15px;
          color: ${template.primary_color};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .patient-info {
          background: linear-gradient(135deg, ${template.secondary_color} 0%, ${template.secondary_color}dd 100%);
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid ${template.primary_color}33;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-weight: 600;
          color: #495057;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 1.1em;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .urgency-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .urgency-standard {
          background: #e8f5e8;
          color: #2e7d32;
        }
        
        .urgency-urgent {
          background: #ffebee;
          color: #c62828;
        }
        
        .report-content {
          background: #ffffff;
          padding: 30px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          white-space: pre-wrap;
          line-height: 1.8;
          font-size: 1.05em;
        }
        
        .footer {
          background: ${template.secondary_color};
          padding: 25px 40px;
          text-align: center;
          border-top: 1px solid #e9ecef;
          font-size: 0.9em;
          color: #6c757d;
        }
        
        .footer-logo {
          font-weight: 600;
          color: ${template.primary_color};
          margin-bottom: 5px;
        }
        
        .company-address {
          margin-bottom: 10px;
          font-size: 0.85em;
          color: #666;
        }
        
        .clinical-question {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
          font-style: italic;
        }
        
        .divider {
          height: 2px;
          background: linear-gradient(to right, ${template.primary_color}, transparent);
          margin: 30px 0;
          border-radius: 1px;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            ${template.logo_url ? `<img src="${template.logo_url}" alt="Company Logo" class="logo-img">` : ''}
            <div class="logo">${template.company_name}</div>
          </div>
          <div class="subtitle">${template.header_text}</div>
        </div>
        
        <div class="content">
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
          </div>
          
          ${data.caseData.clinic_name ? `
          <div class="patient-info">
            <div class="section-title">Referring Clinic</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Clinic Name</div>
                <div class="info-value">${data.caseData.clinic_name}</div>
              </div>
              ${data.caseData.clinic_contact_email ? `
              <div class="info-item">
                <div class="info-label">Contact Email</div>
                <div class="info-value">${data.caseData.clinic_contact_email}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="clinical-question">
            <strong>Clinical Question:</strong><br>
            ${data.caseData.clinical_question}
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div class="section-title">Diagnostic Findings</div>
            <div class="report-content">${data.reportText}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">${template.company_name}</div>
          ${template.company_address ? `<div class="company-address">${template.company_address}</div>` : ''}
          <div>${template.footer_text}</div>
          <div style="margin-top: 10px; font-size: 0.8em;">Report ID: ${data.reportId} | Generated: ${currentDate}</div>
        </div>
      </div>
    </body>
    </html>
  `;
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

    // Generate HTML content with template
    const htmlContent = generatePDFHTML({ reportId, caseData, reportText }, template);

    // For development, we'll create a mock PDF response
    // In production, you would integrate with a proper PDF generation service
    const mockPdfBuffer = new TextEncoder().encode(`Mock PDF content for report ${reportId} using template ${template.name}`);
    
    // Upload to Supabase Storage
    const fileName = `report-${reportId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, mockPdfBuffer, {
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