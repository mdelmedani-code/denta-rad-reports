// Case Status Constants
export const CASE_STATUS = {
  UPLOADED: 'uploaded',
  IN_PROGRESS: 'in_progress',
  REPORT_READY: 'report_ready',
  AWAITING_PAYMENT: 'awaiting_payment',
} as const;

export type CaseStatus = typeof CASE_STATUS[keyof typeof CASE_STATUS];

// Urgency Level Constants
export const URGENCY_LEVEL = {
  STANDARD: 'standard',
  URGENT: 'urgent',
} as const;

export type UrgencyLevel = typeof URGENCY_LEVEL[keyof typeof URGENCY_LEVEL];

// Field of View Constants
export const FIELD_OF_VIEW = {
  UP_TO_5X5: 'up_to_5x5',
  UP_TO_8X5: 'up_to_8x5',
  UP_TO_8X8: 'up_to_8x8',
  OVER_8X8: 'over_8x8',
} as const;

export type FieldOfView = typeof FIELD_OF_VIEW[keyof typeof FIELD_OF_VIEW];

// Invoice Status Constants
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

// User Role Constants
export const USER_ROLE = {
  ADMIN: 'admin',
  CLINIC: 'clinic',
  REPORTER: 'reporter',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// Status Labels
export const STATUS_LABELS: Record<CaseStatus, string> = {
  [CASE_STATUS.UPLOADED]: 'Uploaded',
  [CASE_STATUS.IN_PROGRESS]: 'In Progress',
  [CASE_STATUS.REPORT_READY]: 'Report Ready',
  [CASE_STATUS.AWAITING_PAYMENT]: 'Awaiting Payment',
};

// Field of View Labels
export const FOV_LABELS: Record<FieldOfView, string> = {
  [FIELD_OF_VIEW.UP_TO_5X5]: 'Up to 5x5',
  [FIELD_OF_VIEW.UP_TO_8X5]: 'Up to 8x5',
  [FIELD_OF_VIEW.UP_TO_8X8]: 'Up to 8x8',
  [FIELD_OF_VIEW.OVER_8X8]: 'Over 8x8',
};
