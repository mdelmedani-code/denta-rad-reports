# AI Agent Code Review Prompt - DentaRad PACS Integration

## Project Overview
Please review this GitHub repository for a **dental radiology PACS (Picture Archiving and Communication System) integration platform** built with React, TypeScript, Tailwind CSS, and Supabase. The application allows dental clinics to upload DICOM files for analysis and reporting.

## Current Critical Issues

### 1. DICOM Upload Failures
**Primary Problem**: Edge function (`orthanc-proxy`) returning non-2xx status codes during file uploads
- **Error**: "Upload failed for [filename]: Edge Function returned a non-2xx status code"
- **Impact**: Files never reach Orthanc PACS server, no database records created
- **Location**: `supabase/functions/orthanc-proxy/index.ts` and `src/services/orthancDirectUpload.ts`

### 2. Previous Verification Issues (Recently Addressed)
- Previously had verification step failures after successful uploads
- Verification step was removed as temporary fix
- Need to assess if this impacts system integrity

### 3. File Processing Pipeline
Current flow: **Client** → **Base64 Conversion** → **Supabase Edge Function** → **Orthanc PACS** → **Database Record**
**Failing at**: Edge Function stage

## Project Goals (Priority Order)

### 🎯 **Primary Goal**: Reliable DICOM Upload System
1. **Users must be able to upload DICOM files successfully**
   - Files should reach Orthanc PACS server
   - Database records should be created linking cases to Orthanc studies
   - Progress feedback should work correctly

2. **Uploaded cases must be viewable in OHIF viewer**
   - Studies should open from Reporter Dashboard
   - Images should display properly in OHIF viewer
   - No "No images available" errors

### 🎯 **Secondary Goals**: System Robustness
3. **Handle various file sizes and formats**
   - Support typical dental CBCT file sizes (100KB-50MB+)
   - Graceful handling of edge cases

4. **Proper error handling and user feedback**
   - Clear error messages for different failure types
   - Progress indicators during uploads
   - Retry mechanisms where appropriate

### 🎯 **Future Goals**: Enhanced Features
5. **Real-time progress tracking**
6. **Batch upload capabilities**
7. **Advanced DICOM metadata extraction**

## Technical Architecture

### Key Components:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database + Edge Functions + Storage)
- **PACS Integration**: Orthanc server (external)
- **DICOM Viewer**: OHIF integration
- **File Processing**: Base64 conversion + Edge Function proxy

### Critical Files to Review:
1. `supabase/functions/orthanc-proxy/index.ts` - **Main upload handler**
2. `src/services/orthancDirectUpload.ts` - **Client-side upload logic**
3. `src/pages/UploadCase.tsx` - **Upload UI and flow**
4. `src/services/orthancVerification.ts` - **Verification logic**
5. `src/components/OHIFViewer.tsx` - **DICOM viewer integration**

## Specific Analysis Requests

### 1. **Root Cause Analysis**
Please identify why the edge function is returning non-2xx status codes:
- Memory limitations during base64 processing?
- Timeout issues with large files?
- Orthanc server connectivity problems?
- Request format/validation issues?

### 2. **Architecture Assessment**
Evaluate if the current approach is optimal:
- Is base64 conversion the right approach for large DICOM files?
- Should we use direct file uploads instead of edge function proxy?
- Are there better patterns for PACS integration?

### 3. **Performance Optimization**
Identify bottlenecks and improvements:
- File size limits and handling
- Chunked uploads for large files
- Progress tracking accuracy
- Error recovery mechanisms

### 4. **Code Quality Review**
Assess current implementation:
- Error handling patterns
- Type safety
- Code organization
- Testing coverage gaps

## Solution Requirements

### Must-Have Features:
✅ **Reliable uploads** - Files consistently reach Orthanc  
✅ **Database consistency** - Every successful upload creates a database record  
✅ **Viewer integration** - Cases open properly in OHIF  
✅ **Progress feedback** - Users see upload status clearly  

### Nice-to-Have Features:
🔧 **Retry logic** - Automatic retry on transient failures  
🔧 **Validation** - Pre-upload DICOM validation  
🔧 **Optimization** - Faster upload processing  

## Deliverables Requested

### 1. **Problem Diagnosis**
- Root cause of current edge function failures
- File size/format analysis of failing uploads
- Performance bottleneck identification

### 2. **Solution Recommendations (Prioritized)**
- **Quick fixes** (can be implemented in <1 hour)
- **Medium-term improvements** (can be implemented in 1-4 hours)
- **Long-term architectural changes** (would require significant refactoring)

### 3. **Implementation Guidance**
- Step-by-step fix instructions for highest priority issues
- Code examples or pseudocode for recommended changes
- Risk assessment for each proposed solution

### 4. **Alternative Approaches**
- Evaluate different technical approaches (direct upload, chunking, etc.)
- Pros/cons of each approach
- Migration path recommendations

## Context Notes

- **User Base**: Dental clinics uploading CBCT scans for analysis
- **File Types**: Primarily DICOM files from dental imaging equipment
- **Volume**: Multiple files per case, varying sizes
- **Current State**: System was working previously, recent failures suggest environmental or configuration changes
- **Urgency**: High - this is core functionality blocking user workflows

## Expected Response Format

Please structure your analysis as:

1. **Executive Summary** - Key findings and recommended priority actions
2. **Technical Analysis** - Detailed problem diagnosis
3. **Solution Options** - Multiple approaches with trade-offs
4. **Implementation Plan** - Step-by-step guidance for top recommendation
5. **Risk Assessment** - Potential issues with proposed solutions

---

**Additional Request**: Please prioritize solutions that:
- Have the **highest probability of success**
- Require the **minimal code changes**
- Can be **implemented quickly** (within hours, not days)
- **Maintain data integrity** and don't break existing functionality