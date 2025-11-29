import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

export function TemplateLivePreview({ template }: any) {
  const [useSampleData, setUseSampleData] = useState(true);

  const headerConfig = template?.header_config || {};
  const footerConfig = template?.footer_config || {};
  const colorScheme = template?.color_scheme || {};
  const typography = template?.typography_config || {};

  const sampleData = {
    patient_name: 'John Doe',
    patient_dob: '1980-01-15',
    clinic_name: 'Sample Dental Clinic',
    report_date: new Date().toLocaleDateString(),
    findings: 'This is a sample findings section that demonstrates how the text will appear in the final PDF report. The findings section typically contains detailed observations about the scan.',
    impression: 'Sample impression text showing how the summary will be formatted in the PDF document.',
    recommendations: 'Sample recommendations for the patient based on the diagnostic findings.',
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </h3>
        <Badge variant="outline">A4</Badge>
      </div>

      <div 
        className="flex-1 border rounded-lg shadow-lg overflow-y-auto p-8 space-y-6"
        style={{ 
          backgroundColor: colorScheme.background || '#ffffff',
          color: colorScheme.text || '#0f172a',
        }}
      >
        {/* Header Preview */}
        <div 
          className="flex items-center px-4 py-3 rounded"
          style={{ 
            backgroundColor: headerConfig.background_color || '#ffffff',
            minHeight: `${headerConfig.height || 80}px`,
            borderBottom: `2px solid ${colorScheme.primary || '#2563eb'}`
          }}
        >
          {headerConfig.logo_url && (
            <img 
              src={headerConfig.logo_url} 
              alt="Logo" 
              style={{ height: `${headerConfig.logo_height || 60}px` }}
              className="object-contain"
            />
          )}
          <div className="ml-4">
            <div className="font-semibold" style={{ color: colorScheme.heading }}>
              {sampleData.clinic_name}
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="space-y-4">
          <h1 
            className="font-bold text-center"
            style={{ 
              fontSize: `${typography.h1_size || 24}px`,
              color: colorScheme.heading || '#1e293b'
            }}
          >
            CBCT Diagnostic Report
          </h1>

          <div className="space-y-3">
            <h2 
              className="font-bold"
              style={{ 
                fontSize: `${typography.h2_size || 18}px`,
                color: colorScheme.heading || '#1e293b'
              }}
            >
              Patient Information
            </h2>
            <div 
              className="space-y-1"
              style={{ 
                fontSize: `${typography.body_size || 11}px`,
                lineHeight: typography.line_height || 1.5
              }}
            >
              <p><strong>Name:</strong> {sampleData.patient_name}</p>
              <p><strong>Date of Birth:</strong> {sampleData.patient_dob}</p>
              <p><strong>Report Date:</strong> {sampleData.report_date}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 
              className="font-bold"
              style={{ 
                fontSize: `${typography.h2_size || 18}px`,
                color: colorScheme.heading || '#1e293b'
              }}
            >
              Findings
            </h2>
            <p 
              style={{ 
                fontSize: `${typography.body_size || 11}px`,
                lineHeight: typography.line_height || 1.5
              }}
            >
              {sampleData.findings}
            </p>
          </div>

          <div className="space-y-3">
            <h2 
              className="font-bold"
              style={{ 
                fontSize: `${typography.h2_size || 18}px`,
                color: colorScheme.heading || '#1e293b'
              }}
            >
              Impression
            </h2>
            <p 
              style={{ 
                fontSize: `${typography.body_size || 11}px`,
                lineHeight: typography.line_height || 1.5
              }}
            >
              {sampleData.impression}
            </p>
          </div>

          <div className="space-y-3">
            <h2 
              className="font-bold"
              style={{ 
                fontSize: `${typography.h2_size || 18}px`,
                color: colorScheme.heading || '#1e293b'
              }}
            >
              Recommendations
            </h2>
            <p 
              style={{ 
                fontSize: `${typography.body_size || 11}px`,
                lineHeight: typography.line_height || 1.5
              }}
            >
              {sampleData.recommendations}
            </p>
          </div>
        </div>

        {/* Footer Preview */}
        <div 
          className="mt-8 text-center py-3 rounded text-sm"
          style={{ 
            backgroundColor: footerConfig.background_color || '#f8f9fa',
            color: footerConfig.text_color || '#6c757d',
            borderTop: `1px solid ${colorScheme.secondary || '#e5e7eb'}`
          }}
        >
          <p>{footerConfig.text || 'This report was prepared by a specialist radiologist'}</p>
          {footerConfig.show_page_numbers && (
            <p className="text-xs mt-1">Page 1 of 1</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This is a live preview. Changes update in real-time.
      </p>
    </div>
  );
}
