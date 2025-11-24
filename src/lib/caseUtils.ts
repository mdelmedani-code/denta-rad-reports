import { CaseStatus, STATUS_LABELS, FOV_LABELS, FieldOfView } from './constants';

/**
 * Formats a case status to a human-readable string
 */
export function formatStatus(status: CaseStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Formats a field of view value to a human-readable string
 */
export function formatFieldOfView(fov: FieldOfView): string {
  return FOV_LABELS[fov] || fov.replace(/_/g, ' ');
}

/**
 * Formats a case title with simple ID and patient name
 */
export function formatCaseTitle(simpleId?: number, patientName?: string): string {
  if (simpleId && patientName) {
    const id = String(simpleId).padStart(5, '0');
    const nameParts = patientName.split(' ');
    const lastName = nameParts[nameParts.length - 1].toUpperCase();
    const firstName = nameParts[0].toUpperCase();
    return `${id} - ${lastName}, ${firstName}`;
  }
  return patientName || 'Unknown';
}

/**
 * Gets status color classes for Badge component using semantic tokens
 */
export function getStatusColorClasses(status: CaseStatus): string {
  switch (status) {
    case 'uploaded':
      return 'bg-status-uploaded text-status-uploaded-foreground';
    case 'in_progress':
      return 'bg-status-in-progress text-status-in-progress-foreground';
    case 'report_ready':
      return 'bg-status-ready text-status-ready-foreground';
    case 'awaiting_payment':
      return 'bg-status-awaiting text-status-awaiting-foreground';
    default:
      return 'bg-status-uploaded text-status-uploaded-foreground';
  }
}

/**
 * Gets urgency variant for Badge component
 */
export function getUrgencyVariant(urgency: 'standard' | 'urgent'): 'default' | 'destructive' {
  return urgency === 'urgent' ? 'destructive' : 'default';
}
