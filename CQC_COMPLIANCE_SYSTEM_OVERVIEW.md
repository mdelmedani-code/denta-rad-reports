# DentaRad CBCT Diagnostic Reporting Platform
## System Overview for CQC Compliance Review

**Document Version:** 1.0  
**Date:** December 2024  
**Purpose:** Technical and operational overview for Care Quality Commission (CQC) compliance assessment as a teleradiology service provider

---

## 1. Executive Summary

DentaRad is a cloud-based teleradiology platform specializing in Cone Beam Computed Tomography (CBCT) diagnostic reporting for dental practices. The platform enables referring clinicians to upload CBCT scans and receive specialist radiological reports.

### Service Model
- **Service Type:** Teleradiology diagnostic reporting service
- **Modality:** CBCT (Cone Beam CT) dental imaging
- **Users:** Referring dental clinics (uploaders), Specialist reporters (radiologists/dental specialists), Administrators

---

## 2. System Architecture

### 2.1 Technology Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 + TypeScript | User interface |
| UI Framework | Tailwind CSS + Radix UI | Accessible component library |
| Backend | Supabase (PostgreSQL) | Database, authentication, real-time |
| Edge Functions | Deno (TypeScript) | Serverless business logic |
| File Storage | Supabase Storage + Dropbox | DICOM and report storage |
| PDF Generation | @react-pdf/renderer | Report PDF creation |
| Hosting | Lovable Cloud | Application hosting |

### 2.2 Data Flow Diagram
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Dental Clinic  │────▶│   DentaRad App   │────▶│  Reporter View  │
│  (Case Upload)  │     │  (Web Platform)  │     │  (Diagnosis)    │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌────────────────┐       ┌────────────────┐
                        │   Supabase     │       │  Report PDF    │
                        │   Database     │       │  Generation    │
                        └────────┬───────┘       └────────┬───────┘
                                 │                        │
                                 ▼                        ▼
                        ┌────────────────┐       ┌────────────────┐
                        │ Supabase/      │       │  Clinic Gets   │
                        │ Dropbox Storage│       │  Signed Report │
                        └────────────────┘       └────────────────┘
```

---

## 3. User Roles & Access Control

### 3.1 Role Definitions
| Role | Description | Permissions |
|------|-------------|-------------|
| **clinic** | Referring dental practice staff | Upload cases, view own cases/reports, download reports |
| **reporter** | Specialist radiologist/reporter | View all cases, create/edit reports, sign reports |
| **admin** | System administrator | Full access, user management, invoicing, audit logs |

### 3.2 Role-Based Access Implementation
- **Row Level Security (RLS):** PostgreSQL RLS policies enforce data isolation
- **Clinics only see their own cases** - enforced at database level
- **Reporters see all cases** - for assignment and reporting
- **Admins have full access** - for system management

### 3.3 Access Control Code Location
- `src/hooks/useAuth.tsx` - Authentication context
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/components/RequireAuth.tsx` - Component-level auth checks
- Database: `user_roles` table with `app_role` enum

---

## 4. Authentication & Security

### 4.1 Authentication System
| Feature | Implementation |
|---------|----------------|
| Authentication Provider | Supabase Auth (email/password) |
| Session Management | JWT tokens with automatic refresh |
| Session Timeout | 30-minute inactivity timeout |
| Password Policy | Minimum 8 chars, complexity requirements |
| Rate Limiting | 5 failed attempts = 15-minute lockout |
| Brute Force Protection | Database-level login attempt tracking |

### 4.2 Security Features Implemented
| Feature | Status | Implementation |
|---------|--------|----------------|
| HTTPS/TLS | ✅ | Enforced via hosting |
| Password Hashing | ✅ | bcrypt via Supabase Auth |
| Session Tokens | ✅ | Secure, HttpOnly cookies |
| CSRF Protection | ✅ | Token-based validation |
| XSS Prevention | ✅ | DOMPurify sanitization |
| SQL Injection Prevention | ✅ | Parameterized queries + RLS |
| Rate Limiting | ✅ | Login attempt tracking |
| Account Lockout | ✅ | 5 failed attempts = 15min lock |

### 4.3 Security Code Locations
- `src/services/authRateLimiter.ts` - Rate limiting logic
- `src/utils/sanitization.ts` - XSS prevention
- `src/utils/csrf.ts` - CSRF token handling
- `src/hooks/useSessionTimeout.tsx` - Session management
- `src/utils/passwordStrength.ts` - Password validation

---

## 5. Audit Logging & Traceability

### 5.1 Audit Events Captured
| Event Category | Events Logged |
|----------------|---------------|
| **Authentication** | login, logout, failed_login, password_change |
| **Case Access** | view_case, create_case, delete_case |
| **Report Access** | view_report, create_report, update_report |
| **Downloads** | download_dicom, download_pdf |
| **User Management** | user_created, user_deleted, role_changed |
| **Invoicing** | invoice_created, invoice_sent, invoice_paid |

### 5.2 Audit Log Data Captured
- **User ID** (authenticated via JWT)
- **Timestamp** (server-side, cannot be spoofed)
- **Action performed**
- **Resource type and ID**
- **IP address** (where available)
- **User agent**
- **Session ID**

### 5.3 Audit Log Security
- **Immutable logs** - No UPDATE or DELETE policies on audit tables
- **Server-side user verification** - `auth.uid()` from JWT, not client-supplied
- **Secure RPC function** - `log_audit_event_secure()` validates authentication

### 5.4 Audit Code Locations
- `src/lib/auditLog.ts` - Client-side audit logging functions
- Database table: `security_audit_log`
- Database function: `log_audit_event_secure()`

---

## 6. Data Storage & Retention

### 6.1 Storage Locations
| Data Type | Storage Location | Access Control |
|-----------|------------------|----------------|
| DICOM Scans | Supabase Storage (`cbct-scans` bucket) | Private, RLS enforced |
| Report PDFs | Supabase Storage (`reports` bucket) | Authenticated access |
| Report Images | Supabase Storage (`report-images` bucket) | Private, RLS enforced |
| Patient Data | PostgreSQL (Supabase) | RLS policies per clinic |
| Audit Logs | PostgreSQL (`security_audit_log`) | Admin read-only |

### 6.2 Data Retention
| Data Type | Retention Period | Automation |
|-----------|-----------------|------------|
| Patient Cases | 8 years | Auto-pseudonymization function |
| Audit Logs | Indefinite | No auto-deletion |
| DICOM Files | 8 years | Manual review required |
| Report PDFs | 8 years | Linked to case retention |

### 6.3 Data Retention Code
- Database function: `auto_pseudonymize_old_cases()` - Archives cases >8 years old
- Admin page: `src/pages/admin/DataRetentionPage.tsx`

### 6.4 Backup System
- **Primary:** Supabase automatic daily backups
- **Secondary:** Google Cloud Storage backup via edge function
- **Tertiary:** Dropbox sync for DICOM files and reports
- Edge function: `supabase/functions/backup-to-gcs/index.ts`

---

## 7. DICOM & Medical Image Handling

### 7.1 Upload Process
1. Clinic uploads DICOM files via chunked upload (TUS protocol)
2. Files validated for DICOM format compliance
3. Stored in encrypted Supabase Storage
4. Metadata extracted and stored in database
5. Case assigned status "uploaded"

### 7.2 DICOM Validation
- File type verification
- DICOM header validation
- Size limits enforced (server-side)
- Malicious file detection

### 7.3 Viewing
- Current: CornerstoneJS-based DICOM viewer
- Files downloaded from Supabase Storage
- Viewing occurs in-browser (no local installation required)

### 7.4 DICOM Code Locations
- `src/services/dicomUploadService.ts` - Upload handling
- `src/services/fileValidationService.ts` - File validation
- `src/pages/ViewerPage.tsx` - DICOM viewer page

---

## 8. Reporting Workflow

### 8.1 Report Lifecycle
```
Case Uploaded → In Progress → Report Draft → Signed → Report Ready
                     ↑                           │
                     └─── Re-opened for Edit ────┘
```

### 8.2 Report Versioning
- All report edits create new versions
- Previous versions marked as superseded
- Full version chain maintained
- Database function: `create_report_version()`

### 8.3 Electronic Signature
| Feature | Implementation |
|---------|----------------|
| Authentication | Password re-verification required |
| Hash Generation | SHA-256 of report content |
| Audit Trail | `signature_audit` table |
| Signatory Details | Name, credentials, title, timestamp |
| Re-opening | Requires password + creates new version |
| Local File Deletion | Confirmation required before signing |

### 8.4 Signature Verification
- Public verification page: `src/pages/SignatureVerification.tsx`
- Verification token generated for each signature
- QR code on PDF links to verification page

### 8.5 Report Code Locations
- `src/pages/ReportBuilder.tsx` - Main report editing
- `src/components/ReportBuilder/ElectronicSignature.tsx` - Signing workflow
- `src/services/reportService.ts` - Report CRUD operations
- `src/lib/reportPdfGenerator.tsx` - PDF generation

---

## 9. Patient Data Handling

### 9.1 Data Captured
| Field | Purpose | Storage |
|-------|---------|---------|
| Patient Name | Identification | `cases.patient_name` |
| Date of Birth | Age calculation | `cases.patient_dob` |
| Patient ID | Clinic reference | `cases.patient_id` |
| Internal ID | Clinic reference | `cases.patient_internal_id` |
| Clinical Question | Referral reason | `cases.clinical_question` |
| Special Instructions | Reporter guidance | `cases.special_instructions` |

### 9.2 Data Protection Measures
- **Encryption at rest:** Supabase storage encryption
- **Encryption in transit:** TLS 1.3
- **Access isolation:** RLS policies per clinic
- **Pseudonymization:** Available for archived cases
- **Download acknowledgment:** Users confirm data handling responsibility

### 9.3 Data Handling Confirmation
- `src/components/shared/DataHandlingDialog.tsx` - Download confirmation
- Users must acknowledge responsibility before downloading patient data
- Signing requires confirmation of local file deletion

---

## 10. Incident Management

### 10.1 Data Incident Register
- Admin page: `src/pages/admin/IncidentRegister.tsx`
- Database table: `data_incidents`
- ICO notification tracking
- Severity levels: Low, Medium, High, Critical

### 10.2 Incident Data Captured
- Incident type (breach, near-miss, security event)
- Discovery and occurrence dates
- Risk level and assessment
- Individuals affected
- Containment and remediation actions
- ICO notification status and reference
- Resolution notes

---

## 11. Invoicing & Billing

### 11.1 Pricing Structure
| Field of View | Base Price |
|---------------|------------|
| Up to 5x5 | £125 |
| Up to 8x5 | £145 |
| Up to 8x8 | £165 |
| Over 8x8 | £185 |
| Urgent (+50%) | +50% surcharge |

### 11.2 Invoice Workflow
- Monthly invoice generation per clinic
- PDF invoice creation
- Email delivery via Resend API
- Payment tracking
- Export for accounting

### 11.3 Invoice Code Locations
- `src/pages/admin/UnifiedInvoicing.tsx` - Invoice management
- `src/services/invoiceService.ts` - Invoice operations
- Edge function: `supabase/functions/send-invoice-email/index.ts`

---

## 12. Notification System

### 12.1 Notification Types
- Case status changes
- Report completion
- Invoice reminders
- System alerts

### 12.2 Notification Channels
- In-app notifications
- Email notifications (via Resend API)
- Configurable per user

### 12.3 Notification Code
- `src/components/NotificationPreferences.tsx` - User preferences
- Edge function: `supabase/functions/send-notification/index.ts`

---

## 13. Database Schema Summary

### 13.1 Core Tables
| Table | Purpose |
|-------|---------|
| `cases` | Patient case records |
| `reports` | Diagnostic reports |
| `clinics` | Referring clinic details |
| `profiles` | User profiles and preferences |
| `user_roles` | Role assignments |
| `invoices` | Billing records |

### 13.2 Audit Tables
| Table | Purpose |
|-------|---------|
| `security_audit_log` | All security events |
| `signature_audit` | Report signature records |
| `login_attempts` | Authentication tracking |
| `data_incidents` | Incident register |

### 13.3 Supporting Tables
| Table | Purpose |
|-------|---------|
| `report_templates` | Report template library |
| `report_snippets` | Reusable text snippets |
| `report_versions` | Report version history |
| `report_images` | Images attached to reports |
| `pricing_rules` | Pricing configuration |

---

## 14. Third-Party Integrations

### 14.1 Current Integrations
| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Supabase | Database, Auth, Storage | All application data |
| Dropbox | File backup/sync | DICOM files, Reports |
| Resend | Email delivery | Notification content |
| Google Cloud Storage | Backup | Encrypted backups |

### 14.2 API Security
- All API keys stored as environment secrets
- No keys exposed in client-side code
- Edge functions handle external API calls

---

## 15. Compliance Features Summary

### 15.1 CQC-Relevant Features
| Requirement | Implementation |
|-------------|----------------|
| User identification | Email-based accounts with role assignment |
| Access control | RLS policies + role-based permissions |
| Audit trails | Comprehensive logging of all actions |
| Data protection | Encryption, access isolation, retention policies |
| Incident management | Data incident register with ICO tracking |
| Report integrity | Versioning, signatures, hash verification |
| Secure communication | TLS encryption, secure storage |
| Backup & recovery | Multi-location backup strategy |

### 15.2 Outstanding Considerations
| Area | Current Status | Notes |
|------|----------------|-------|
| MFA | Not implemented | Consider adding for enhanced security |
| Email verification | Supabase default | User emails verified on signup |
| Password expiry | Not enforced | Consider policy implementation |
| IP whitelisting | Not implemented | Available if needed |
| Penetration testing | Not conducted | Recommend before go-live |

---

## 16. Key File Locations Reference

### Authentication & Security
```
src/hooks/useAuth.tsx
src/hooks/useSessionTimeout.tsx
src/services/authRateLimiter.ts
src/utils/sanitization.ts
src/utils/csrf.ts
src/utils/passwordStrength.ts
```

### Audit & Compliance
```
src/lib/auditLog.ts
src/pages/AuditLogs.tsx
src/pages/SecurityDashboard.tsx
src/pages/admin/IncidentRegister.tsx
src/pages/admin/DataRetentionPage.tsx
```

### Case & Report Management
```
src/pages/UploadCase.tsx
src/pages/ReportBuilder.tsx
src/pages/CaseReportPage.tsx
src/components/ReportBuilder/ElectronicSignature.tsx
src/services/reportService.ts
src/services/caseService.ts
```

### Configuration
```
supabase/config.toml
src/integrations/supabase/client.ts
tailwind.config.ts
```

---

## 17. Contact Information

**Platform:** DentaRad CBCT Diagnostic Reporting  
**Type:** Teleradiology Service Provider  
**Regulatory Context:** CQC (Care Quality Commission) - England

---

*This document provides a technical overview for compliance review purposes. For specific implementation details, refer to the source code files listed throughout this document.*
