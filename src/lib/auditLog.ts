import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'view_case'
  | 'view_report'
  | 'download_dicom'
  | 'download_pdf'
  | 'create_case'
  | 'create_report'
  | 'update_report'
  | 'delete_case'
  | 'login'
  | 'logout'
  | 'mfa_setup'
  | 'password_change'
  | 'failed_login'
  | 'unauthorized_access_attempt';

export type ResourceType = 
  | 'case'
  | 'report'
  | 'dicom'
  | 'pdf'
  | 'user_account';

interface AuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  action,
  resourceType,
  resourceId,
  details
}: AuditLogParams): Promise<void> {
  try {
    // Call secure RPC function (user identity verified server-side)
    const { error } = await supabase.rpc('log_audit_event_secure', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_details: details || {}
    });
    
    if (error) {
      console.error('Audit log failed:', error);
      // Don't throw - audit failure should not block user actions
    }
  } catch (error) {
    console.error('Audit log error:', error);
    // Fail gracefully - log locally for monitoring
    console.warn('Audit event not logged:', { action, resourceType, resourceId });
  }
}

// Convenience functions
export async function logCaseView(caseId: string) {
  return logAudit({
    action: 'view_case',
    resourceType: 'case',
    resourceId: caseId
  });
}

export async function logReportView(reportId: string) {
  return logAudit({
    action: 'view_report',
    resourceType: 'report',
    resourceId: reportId
  });
}

export async function logDicomDownload(caseId: string, filename: string) {
  return logAudit({
    action: 'download_dicom',
    resourceType: 'dicom',
    resourceId: caseId,
    details: { filename }
  });
}

export async function logPdfDownload(reportId: string) {
  return logAudit({
    action: 'download_pdf',
    resourceType: 'pdf',
    resourceId: reportId
  });
}

export async function logCaseCreation(caseId: string, patientAge?: number) {
  return logAudit({
    action: 'create_case',
    resourceType: 'case',
    resourceId: caseId,
    details: patientAge ? { patientAge } : undefined
  });
}

export async function logReportCreation(reportId: string, caseId: string) {
  return logAudit({
    action: 'create_report',
    resourceType: 'report',
    resourceId: reportId,
    details: { caseId }
  });
}

export async function logLogin() {
  return logAudit({
    action: 'login',
    resourceType: 'user_account'
  });
}

export async function logLogout() {
  return logAudit({
    action: 'logout',
    resourceType: 'user_account'
  });
}

export async function logFailedLogin(email: string) {
  return logAudit({
    action: 'failed_login',
    resourceType: 'user_account',
    details: { attempted_email: email }
  });
}

export async function logUnauthorizedAccess(resourceType: ResourceType, resourceId: string) {
  return logAudit({
    action: 'unauthorized_access_attempt',
    resourceType,
    resourceId,
    details: { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
  });
}
