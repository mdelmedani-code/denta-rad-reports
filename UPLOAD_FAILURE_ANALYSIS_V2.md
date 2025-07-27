# DICOM Upload System - New Failure Analysis

## Updated Problem Summary
After removing the verification step, the system is now failing at the **upload stage itself** rather than verification. The Supabase Edge Function (`orthanc-proxy`) is returning a **non-2xx status code**, preventing DICOM files from reaching Orthanc PACS.

## Error Details

### Current Error Message:
```
"Upload failed for export207.dcm: Edge Function returned a non-2xx status code"
```

### Error Flow:
1. **Client** → `uploadToOrthancPACS()` → **SUCCESS** (file processing)
2. **Client** → Supabase Edge Function (`orthanc-proxy`) → **FAILS** (non-2xx response)
3. **Upload never reaches Orthanc** → Database record never created

## Technical Analysis

### What Changed:
- **Before**: Upload worked → Verification failed  
- **Now**: Upload itself fails → Never reaches verification

### Root Cause:
The `orthanc-proxy` edge function is rejecting requests with a non-successful HTTP status code (400, 500, etc.)

### Error Location:
```typescript
// In orthancDirectUpload.ts line 51-59
const { data, error: functionError } = await supabase.functions.invoke('orthanc-proxy', {
  body: {
    fileName: file.name,
    fileData: base64File,
    contentType: file.type
  }
});

if (functionError) {
  throw new Error(`Upload failed for ${file.name}: ${functionError.message}`);
}
```

## Previous Logs Comparison

### Previous Successful Pattern (from earlier logs):
```
"Processing file upload: export251.dcm Base64 size: 216880"
"Valid DICOM header detected"  
"Orthanc upload response status: 200"
"Upload successful! Instance ID: 92a1eb88-cc1a45df-dab87414-023780b3-919963b9"
```

### Current Failure:
- File processing succeeds locally
- Edge function call fails with non-2xx status
- No response from Orthanc (never reached)

## Debugging Requirements

### Information Needed:
1. **Edge Function Logs** - What specific error is the `orthanc-proxy` function returning?
2. **HTTP Status Code** - Is it 400 (bad request), 500 (server error), 413 (too large), etc.?
3. **File Size** - Is the current file larger than previous successful uploads?
4. **Function Resource Limits** - Has the edge function hit memory/timeout limits?

### File Analysis:
- **Previous successful files**: ~162KB (export251.dcm, export252.dcm, etc.)
- **Current failing file**: export207.dcm (size unknown)
- **Possible issue**: File size or format difference

## Investigation Steps

### 1. Check Edge Function Status
```sql
-- Query edge function logs for specific error details
SELECT * FROM edge_function_logs 
WHERE function_name = 'orthanc-proxy' 
ORDER BY timestamp DESC 
LIMIT 10
```

### 2. Compare File Characteristics
- File size comparison (current vs. successful uploads)
- DICOM header validation
- File format verification

### 3. Edge Function Resource Check
- Memory usage during processing
- Timeout limits (default: 30 seconds)
- Base64 conversion memory requirements

## Potential Causes

### Most Likely:
1. **File Size Limit** - Current file exceeds edge function memory limits
2. **Corrupted File** - DICOM file has invalid structure  
3. **Edge Function Timeout** - Processing takes too long
4. **Resource Exhaustion** - Function ran out of memory during base64 conversion

### Less Likely:
1. **Network Issues** - Temporary connectivity problems
2. **Orthanc Server Down** - PACS server unavailable
3. **Authentication Issues** - Orthanc credentials changed

## Recommended Solutions

### Immediate Actions:
1. **Check edge function logs** for specific error details
2. **Try smaller file** to test if size is the issue
3. **Verify file integrity** of export207.dcm
4. **Monitor function resources** during upload

### Code Changes Needed:
1. **Better error handling** in edge function with specific status codes
2. **File size validation** before upload attempt
3. **Chunked upload** for large files if needed
4. **Detailed logging** in edge function for debugging

## Files Involved
- `supabase/functions/orthanc-proxy/index.ts` (failing function)
- `src/services/orthancDirectUpload.ts` (client-side upload logic)
- `src/pages/UploadCase.tsx` (UI upload flow)

## Test Case
- **File**: export207.dcm  
- **Expected**: Successful upload to Orthanc
- **Actual**: Edge function returns non-2xx status code
- **Impact**: Complete upload failure, no database record created

## Key Questions for Investigation
1. What is the exact HTTP status code returned by the edge function?
2. What is the file size of export207.dcm vs. previous successful files?
3. Are there any error details in the edge function logs?
4. Is the Orthanc server responding to direct requests?
5. Has anything changed in the edge function configuration or Orthanc server?