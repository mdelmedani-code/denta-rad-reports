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
    patient_dob: string;
    patient_internal_id: string;
    clinical_question: string;
    field_of_view: string;
    urgency: string;
    upload_date: string;
    clinic_name: string;
    clinic_contact_email: string;
  };
  reportText: string;
}

const generatePDFHTML = (data: PDFRequest) => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo-section {
            flex: 1;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
        }
        .tagline {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0 0 0;
        }
        .report-info {
            text-align: right;
            flex: 1;
        }
        .report-title {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            color: #1f2937;
        }
        .report-date {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0 0 0;
        }
        .patient-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            border-left: 4px solid #2563eb;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin: 0 0 15px 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .patient-item {
            display: flex;
            flex-direction: column;
        }
        .patient-label {
            font-weight: 600;
            color: #374151;
            font-size: 14px;
            margin-bottom: 3px;
        }
        .patient-value {
            color: #6b7280;
            font-size: 14px;
        }
        .clinical-question {
            grid-column: 1 / -1;
        }
        .report-content {
            margin: 30px 0;
        }
        .report-text {
            background: #ffffff;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            white-space: pre-wrap;
            line-height: 1.8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        .urgency-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .urgency-standard {
            background: #dbeafe;
            color: #1d4ed8;
        }
        .urgency-urgent {
            background: #fee2e2;
            color: #dc2626;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .header { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <h1 class="company-name">RadiologyPro</h1>
            <p class="tagline">Professional CBCT Analysis & Reporting</p>
        </div>
        <div class="report-info">
            <h2 class="report-title">Diagnostic Report</h2>
            <p class="report-date">Generated: ${currentDate}</p>
        </div>
    </div>

    <div class="patient-section">
        <h3 class="section-title">Patient Information</h3>
        <div class="patient-grid">
            <div class="patient-item">
                <span class="patient-label">Patient Name</span>
                <span class="patient-value">${data.caseData.patient_name}</span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Date of Birth</span>
                <span class="patient-value">${data.caseData.patient_dob ? new Date(data.caseData.patient_dob).toLocaleDateString() : 'Not provided'}</span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Internal ID</span>
                <span class="patient-value">${data.caseData.patient_internal_id || 'Not provided'}</span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Urgency</span>
                <span class="patient-value">
                    <span class="urgency-badge urgency-${data.caseData.urgency}">
                        ${data.caseData.urgency}
                    </span>
                </span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Field of View</span>
                <span class="patient-value">${data.caseData.field_of_view.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Scan Date</span>
                <span class="patient-value">${new Date(data.caseData.upload_date).toLocaleDateString()}</span>
            </div>
            <div class="patient-item clinical-question">
                <span class="patient-label">Clinical Question</span>
                <span class="patient-value">${data.caseData.clinical_question}</span>
            </div>
        </div>
    </div>

    <div class="patient-section">
        <h3 class="section-title">Referring Clinic</h3>
        <div class="patient-grid">
            <div class="patient-item">
                <span class="patient-label">Clinic Name</span>
                <span class="patient-value">${data.caseData.clinic_name}</span>
            </div>
            <div class="patient-item">
                <span class="patient-label">Contact Email</span>
                <span class="patient-value">${data.caseData.clinic_contact_email}</span>
            </div>
        </div>
    </div>

    <div class="report-content">
        <h3 class="section-title">Diagnostic Findings</h3>
        <div class="report-text">${data.reportText}</div>
    </div>

    <div class="footer">
        <p>This report was generated by RadiologyPro's automated diagnostic system.</p>
        <p>For questions regarding this report, please contact your assigned radiologist.</p>
        <p>Report ID: ${data.reportId} | Generated on ${currentDate}</p>
    </div>
</body>
</html>`;
};

const serve_handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reportId, caseData, reportText }: PDFRequest = await req.json();

    console.log('Generating PDF for report:', reportId);

    // Generate HTML content
    const htmlContent = generatePDFHTML({ reportId, caseData, reportText });

    // For now, we'll use a simple HTML-to-PDF conversion approach
    // In production, you might want to use puppeteer or similar
    const pdfResponse = await fetch('https://api.htmlcsstoimage.com/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-api-key-here' // You'll need to get this from htmlcsstoimage.com
      },
      body: JSON.stringify({
        html: htmlContent,
        format: 'pdf',
        device_scale_factor: 2,
        viewport_width: 800,
        viewport_height: 1200
      })
    });

    // For development, we'll create a mock PDF response
    // Replace this with actual PDF generation in production
    const mockPdfBuffer = new TextEncoder().encode(`Mock PDF content for report ${reportId}`);
    
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

    // Update the reports table with the PDF URL
    const { error: updateError } = await supabase
      .from('reports')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', reportId);

    if (updateError) {
      throw updateError;
    }

    console.log('PDF generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        fileName 
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