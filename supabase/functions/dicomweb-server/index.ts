import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DICOMMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientName: string;
  studyDescription: string;
  windowCenter: number;
  windowWidth: number;
  rows: number;
  columns: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
}

// DICOM Tag constants
const DICOM_TAGS = {
  StudyInstanceUID: 0x0020000D,
  SeriesInstanceUID: 0x0020000E,
  SOPInstanceUID: 0x00080018,
  PatientName: 0x00100010,
  StudyDescription: 0x00081030,
  WindowCenter: 0x00281050,
  WindowWidth: 0x00281051,
  Rows: 0x00280010,
  Columns: 0x00280011,
  PixelSpacing: 0x00280030,
  SliceThickness: 0x00180050,
  PixelData: 0x7FE00010,
  TransferSyntaxUID: 0x00020010,
  PhotometricInterpretation: 0x00280004,
  BitsAllocated: 0x00280100,
  BitsStored: 0x00280101,
  HighBit: 0x00280102,
  PixelRepresentation: 0x00280103,
};

function parseDataElement(buffer: Uint8Array, offset: number, isLittleEndian: boolean): {
  tag: number;
  vr: string;
  length: number;
  value: any;
  nextOffset: number;
} {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
  
  // Read tag (group, element)
  const group = view.getUint16(0, isLittleEndian);
  const element = view.getUint16(2, isLittleEndian);
  const tag = (group << 16) | element;
  
  let valueOffset = 4;
  let vr = '';
  let length = 0;
  
  // Check if this is explicit VR
  if (offset + 6 < buffer.length) {
    const possibleVR = String.fromCharCode(buffer[offset + 4], buffer[offset + 5]);
    const validVRs = ['AE', 'AS', 'AT', 'CS', 'DA', 'DS', 'DT', 'FL', 'FD', 'IS', 'LO', 'LT', 'OB', 'OD', 'OF', 'OW', 'PN', 'SH', 'SL', 'SQ', 'SS', 'ST', 'TM', 'UI', 'UL', 'UN', 'US', 'UT'];
    
    if (validVRs.includes(possibleVR)) {
      vr = possibleVR;
      valueOffset = 6;
      
      // For VRs with 2-byte length
      if (['OB', 'OD', 'OF', 'OW', 'SQ', 'UN', 'UT'].includes(vr)) {
        valueOffset = 8;
        length = view.getUint32(6, isLittleEndian);
      } else {
        length = view.getUint16(6, isLittleEndian);
      }
    } else {
      // Implicit VR
      length = view.getUint32(4, isLittleEndian);
      valueOffset = 8;
    }
  }
  
  // Read value based on VR and tag
  let value: any = null;
  if (length > 0 && offset + valueOffset + length <= buffer.length) {
    const valueBuffer = buffer.slice(offset + valueOffset, offset + valueOffset + length);
    
    switch (vr) {
      case 'US': // Unsigned Short
        if (length >= 2) {
          value = new DataView(valueBuffer.buffer, valueBuffer.byteOffset).getUint16(0, isLittleEndian);
        }
        break;
      case 'UL': // Unsigned Long
        if (length >= 4) {
          value = new DataView(valueBuffer.buffer, valueBuffer.byteOffset).getUint32(0, isLittleEndian);
        }
        break;
      case 'DS': // Decimal String
      case 'IS': // Integer String
        value = new TextDecoder().decode(valueBuffer).trim();
        if (vr === 'DS') value = parseFloat(value);
        if (vr === 'IS') value = parseInt(value);
        break;
      case 'PN': // Person Name
      case 'LO': // Long String
      case 'SH': // Short String
      case 'CS': // Code String
      case 'UI': // Unique Identifier
        value = new TextDecoder().decode(valueBuffer).trim().replace(/\0/g, '');
        break;
      case 'OW': // Other Word String (for pixel data)
        value = valueBuffer;
        break;
      default:
        if (tag === DICOM_TAGS.PixelData) {
          value = valueBuffer;
        } else {
          value = new TextDecoder().decode(valueBuffer).trim().replace(/\0/g, '');
        }
    }
  }
  
  return {
    tag,
    vr,
    length,
    value,
    nextOffset: offset + valueOffset + length
  };
}

function parseDICOM(buffer: Uint8Array): DICOMMetadata | null {
  try {
    // Check for DICOM preamble
    if (buffer.length < 132) return null;
    
    const dicm = String.fromCharCode(...buffer.slice(128, 132));
    if (dicm !== 'DICM') {
      console.log('No DICM header found, assuming headerless DICOM');
    }
    
    let offset = dicm === 'DICM' ? 132 : 0;
    const isLittleEndian = true; // Most DICOMs are little endian
    
    const metadata: Partial<DICOMMetadata> = {};
    
    // Parse data elements
    while (offset < buffer.length - 8) {
      try {
        const element = parseDataElement(buffer, offset, isLittleEndian);
        
        switch (element.tag) {
          case DICOM_TAGS.StudyInstanceUID:
            metadata.studyInstanceUID = element.value;
            break;
          case DICOM_TAGS.SeriesInstanceUID:
            metadata.seriesInstanceUID = element.value;
            break;
          case DICOM_TAGS.SOPInstanceUID:
            metadata.sopInstanceUID = element.value;
            break;
          case DICOM_TAGS.PatientName:
            metadata.patientName = element.value;
            break;
          case DICOM_TAGS.StudyDescription:
            metadata.studyDescription = element.value;
            break;
          case DICOM_TAGS.WindowCenter:
            metadata.windowCenter = parseFloat(element.value) || 0;
            break;
          case DICOM_TAGS.WindowWidth:
            metadata.windowWidth = parseFloat(element.value) || 2000;
            break;
          case DICOM_TAGS.Rows:
            metadata.rows = element.value;
            break;
          case DICOM_TAGS.Columns:
            metadata.columns = element.value;
            break;
          case DICOM_TAGS.PixelSpacing:
            if (element.value && typeof element.value === 'string') {
              const spacing = element.value.split('\\').map(parseFloat);
              if (spacing.length >= 2) {
                metadata.pixelSpacing = [spacing[0], spacing[1]];
              }
            }
            break;
          case DICOM_TAGS.SliceThickness:
            metadata.sliceThickness = parseFloat(element.value) || 1.0;
            break;
        }
        
        offset = element.nextOffset;
        
        // Break if we hit pixel data to avoid processing large binary data unnecessarily
        if (element.tag === DICOM_TAGS.PixelData) {
          break;
        }
        
      } catch (error) {
        console.error('Error parsing DICOM element at offset', offset, error);
        offset += 8; // Skip this element
      }
    }
    
    // Generate UIDs if missing
    if (!metadata.studyInstanceUID) {
      metadata.studyInstanceUID = `1.2.840.10008.${Date.now()}.1`;
    }
    if (!metadata.seriesInstanceUID) {
      metadata.seriesInstanceUID = `1.2.840.10008.${Date.now()}.2`;
    }
    if (!metadata.sopInstanceUID) {
      metadata.sopInstanceUID = `1.2.840.10008.${Date.now()}.3`;
    }
    
    // Set defaults
    metadata.patientName = metadata.patientName || 'Unknown Patient';
    metadata.studyDescription = metadata.studyDescription || 'CBCT Study';
    metadata.windowCenter = metadata.windowCenter || 0;
    metadata.windowWidth = metadata.windowWidth || 2000;
    metadata.rows = metadata.rows || 512;
    metadata.columns = metadata.columns || 512;
    metadata.pixelSpacing = metadata.pixelSpacing || [1.0, 1.0];
    metadata.sliceThickness = metadata.sliceThickness || 1.0;
    
    return metadata as DICOMMetadata;
  } catch (error) {
    console.error('Error parsing DICOM:', error);
    return null;
  }
}

async function generateImageFromDICOM(buffer: Uint8Array): Promise<Uint8Array> {
  try {
    // For now, we'll create a simple PNG representation
    // In a full implementation, you'd extract and process the actual pixel data
    
    // Create a simple 512x512 placeholder image
    const width = 512;
    const height = 512;
    const channels = 3; // RGB
    
    // Create PNG header and data
    const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // For simplicity, create a basic grayscale pattern
    // In production, this would extract and process actual DICOM pixel data
    const imageData = new Uint8Array(width * height * channels);
    for (let i = 0; i < imageData.length; i += channels) {
      const gray = Math.floor(Math.random() * 256); // Placeholder pattern
      imageData[i] = gray;     // R
      imageData[i + 1] = gray; // G
      imageData[i + 2] = gray; // B
    }
    
    // Return the original DICOM as-is for now
    // The frontend will handle the display
    return buffer;
    
  } catch (error) {
    console.error('Error generating image from DICOM:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    console.log('DICOMweb request:', req.method, url.pathname);
    
    // Handle different WADO-RS endpoints
    if (req.method === 'GET') {
      
      // Handle study-level queries first
      if (pathParts.includes('studies') && !pathParts.includes('instances')) {
        const studyUID = pathParts[pathParts.indexOf('studies') + 1];
        const caseId = studyUID.replace('study.', '');
        
        // Get case info from database
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('file_path, patient_name')
          .eq('id', caseId)
          .single();
          
        if (caseError || !caseData) {
          return new Response(JSON.stringify({ error: 'Case not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Return study-level metadata
        const studyMetadata = [{
          "0020000D": { "vr": "UI", "Value": [studyUID] }, // Study Instance UID
          "00100010": { "vr": "PN", "Value": [{ "Alphabetic": caseData.patient_name || "Unknown Patient" }] },
          "00081030": { "vr": "LO", "Value": ["CBCT Study"] },
          "00200010": { "vr": "SH", "Value": ["001"] }, // Study ID
          "00080020": { "vr": "DA", "Value": [new Date().toISOString().split('T')[0].replace(/-/g, '')] },
          "00080030": { "vr": "TM", "Value": [new Date().toTimeString().split(' ')[0].replace(/:/g, '')] }
        }];

        return new Response(JSON.stringify(studyMetadata), {
          headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
        });
      }

      // Metadata endpoint: /wado/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/metadata
      if (pathParts.includes('metadata')) {
        const studyUID = pathParts[pathParts.indexOf('studies') + 1];
        const caseId = studyUID.replace('study.', '') || url.searchParams.get('caseId');
        
        if (!caseId) {
          return new Response(JSON.stringify({ error: 'Case ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get case info from database
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('file_path, patient_name')
          .eq('id', caseId)
          .single();
          
        if (caseError || !caseData) {
          return new Response(JSON.stringify({ error: 'Case not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get DICOM file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('cbct-scans')
          .download(caseData.file_path);
          
        if (fileError || !fileData) {
          return new Response(JSON.stringify({ error: 'DICOM file not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Parse DICOM metadata
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        const metadata = parseDICOM(buffer);
        
        if (!metadata) {
          return new Response(JSON.stringify({ error: 'Invalid DICOM file' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Return DICOM metadata in DICOMweb format
        const dicomwebMetadata = {
          "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.481.1"] }, // SOP Class UID
          "00080018": { "vr": "UI", "Value": [metadata.sopInstanceUID] },
          "0020000D": { "vr": "UI", "Value": [metadata.studyInstanceUID] },
          "0020000E": { "vr": "UI", "Value": [metadata.seriesInstanceUID] },
          "00100010": { "vr": "PN", "Value": [{ "Alphabetic": metadata.patientName }] },
          "00081030": { "vr": "LO", "Value": [metadata.studyDescription] },
          "00281050": { "vr": "DS", "Value": [metadata.windowCenter.toString()] },
          "00281051": { "vr": "DS", "Value": [metadata.windowWidth.toString()] },
          "00280010": { "vr": "US", "Value": [metadata.rows] },
          "00280011": { "vr": "US", "Value": [metadata.columns] },
          "00280030": { "vr": "DS", "Value": [metadata.pixelSpacing.join('\\')] },
          "00180050": { "vr": "DS", "Value": [metadata.sliceThickness.toString()] }
        };
        
        return new Response(JSON.stringify([dicomwebMetadata]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/dicom+json' }
        });
      }
      
      // Image endpoint: /wado/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}
      if (pathParts.includes('instances')) {
        const studyUID = pathParts[pathParts.indexOf('studies') + 1];
        const caseId = studyUID.replace('study.', '') || url.searchParams.get('caseId') || req.headers.get('X-Case-ID');
        const accept = req.headers.get('accept') || '';
        
        if (!caseId) {
          return new Response(JSON.stringify({ error: 'Case ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get case info from database
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('file_path')
          .eq('id', caseId)
          .single();
          
        if (caseError || !caseData) {
          return new Response(JSON.stringify({ error: 'Case not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get DICOM file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('cbct-scans')
          .download(caseData.file_path);
          
        if (fileError || !fileData) {
          return new Response(JSON.stringify({ error: 'DICOM file not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        
        // Return raw DICOM data
        if (accept.includes('application/dicom')) {
          return new Response(buffer, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/dicom',
              'Content-Length': buffer.length.toString()
            }
          });
        }
        
        // Return processed image data for web viewing
        try {
          const imageData = await generateImageFromDICOM(buffer);
          return new Response(imageData, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/dicom',
              'Content-Length': imageData.length.toString()
            }
          });
        } catch (error) {
          console.error('Error processing DICOM image:', error);
          return new Response(buffer, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/dicom',
              'Content-Length': buffer.length.toString()
            }
          });
        }
      }
    }
    
    // Default response
    return new Response(JSON.stringify({ 
      message: 'DICOMweb Server',
      endpoints: [
        'GET /wado/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/metadata?caseId={caseId}',
        'GET /wado/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}?caseId={caseId}'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in DICOMweb server:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});