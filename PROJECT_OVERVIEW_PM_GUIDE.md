# DentaRad - Project Overview & PM Guidance

**Project Type:** CBCT Dental Radiology Reporting Platform  
**Tech Stack:** React + TypeScript + Supabase + Vite  
**Scale:** Solo Reporter, 30 scans/week, 5-10 clinics  
**Status:** Production-ready, actively being refined

---

## 📋 Executive Summary

DentaRad is a streamlined web application for CBCT (Cone Beam Computed Tomography) dental scan reporting. Clinics upload scans, a radiologist (reporter) reviews them and creates diagnostic reports, and the system handles billing tracking. The platform emphasizes **simplicity, security, and reliability** over complex automation.

### Core Value Proposition
- **For Clinics:** Simple scan upload → Professional report → Clear billing
- **For Reporter:** Efficient case management → Fast report creation → Easy billing export
- **For Business:** Minimal operational overhead, maximum reliability, low cost (<£100/year)

---

## 🎯 Project Philosophy & Constraints

### Guiding Principles
1. **Build for current scale, not imagined future scale**
2. **Manual processes are acceptable for low-volume operations (<100/month)**
3. **Client-side > Server-side when possible** (faster, cheaper, more reliable)
4. **Simple > Complex** (easier to maintain, debug, and understand)
5. **Security is non-negotiable** (patient health data requires NHS Digital standards)

### Key Constraints
- **Volume:** 30 CBCT scans per week (120/month)
- **Resources:** Single radiologist reporter
- **Budget:** Free tier prioritized, <£100/year acceptable
- **Compliance:** UK GDPR, NHS Digital security standards, HIPAA-ready
- **Users:** Non-technical clinicians and solo reporter

---

## 🏗️ Current System Architecture

### User Roles
1. **Clinic Users** (5-10 active clinics)
   - Upload CBCT scans (ZIP files with DICOM images)
   - View their submitted cases
   - Download completed reports (PDF)
   - Receive invoices via Stripe

2. **Reporter/Admin** (1 person)
   - Review all incoming cases (auto-assigned)
   - Write diagnostic reports with AI assistance
   - Generate and download PDF reports
   - Export billing data monthly
   - Manage system configuration

### Core Workflows

#### Clinic Workflow (Upload → Report)
```
1. Login → Dashboard
2. Upload Case:
   - Patient info (name, DOB, internal ID)
   - Clinical question
   - CBCT scan (ZIP with DICOM files)
   - Field of view selection
   - Urgency level
3. Case submitted → Status: "uploaded"
4. Await notification when report ready
5. Download report PDF
6. Receive Stripe invoice (monthly)
7. Pay invoice online
```

#### Reporter Workflow (Daily)
```
1. Login → Unified Dashboard
2. "My Cases" tab → New cases appear (auto-assigned)
3. Click case → Review details
4. Download DICOM files → Review in Horos/OsiriX
5. Click "Create Report"
6. Write report sections:
   - Findings (AI-assisted transcription available)
   - Impression
   - Recommendations
7. Annotate images if needed (pen tool, shapes)
8. Upload reference images
9. Click "Finalize Report"
10. Status updates to "report_ready"
11. PDF generated client-side (3 seconds)
12. Clinic notified automatically
```

#### Billing Workflow (Monthly - 15 minutes)
```
1. Dashboard → "Billing" tab
2. Select date range (usually previous month)
3. Review unbilled reports table
4. Click "Export to CSV"
5. Open Stripe Dashboard
6. Create invoices using CSV data
7. Send invoices (Stripe handles delivery & payment)
8. Mark as exported (optional tracking)
```

---

## 🗂️ Technical Architecture

### Frontend (React + TypeScript + Vite)

**Key Pages:**
- `/` - Marketing landing page (Hero, Pricing, Features, Contact)
- `/login` - Clinic login
- `/admin/login` - Admin/Reporter login
- `/dashboard` - Clinic dashboard (view cases, upload new)
- `/upload-case` - Case submission form
- `/reporter` - Unified dashboard (3 tabs: Cases, Statistics, Billing)
- `/viewer/:caseId` - DICOM viewer + report download
- `/admin/reporter/case/:caseId` - Report writing interface
- `/admin/audit-logs` - Security audit log (admin only)
- `/admin/security-dashboard` - Security monitoring (admin only)

**Key Components:**
- `AppLayout` - Sidebar navigation wrapper
- `AppSidebar` - Role-based navigation menu
- `ImageAnnotator` - Fabric.js canvas for DICOM markup
- `VoiceRecorder` - AI transcription for dictation
- `PDFReportGenerator` - Client-side PDF generation (@react-pdf/renderer)
- `ProtectedRoute` - Authentication + role-based access control

### Backend (Supabase)

**Database Tables:**
- `clinics` - Clinic information (name, email, address)
- `profiles` - User profiles (linked to auth.users, role, clinic_id)
- `user_roles` - Explicit role assignments (clinic, admin, reporter)
- `cases` - Uploaded cases (patient info, file paths, status, metadata)
- `reports` - Diagnostic reports (linked to cases, PDF URLs, sign-off data)
- `invoices` - Invoice tracking (Stripe integration, simplified)
- `case_annotations` - Image annotations (Fabric.js JSON data)
- `security_audit_log` - Immutable audit trail (7-year retention)
- `login_attempts` - Rate limiting data (brute force protection)
- `upload_rate_limits` - Upload throttling (20 uploads/24h per user)
- `pdf_templates` - Customizable report templates
- `template_indications` - Report templates by indication type
- `pricing_rules` - Field of view pricing configuration

**Storage Buckets:**
- `cbct-scans` (private) - DICOM ZIP files
- `reports` (public) - Generated PDF reports

**Edge Functions:**
- `extract-dicom-zip` - Process uploaded DICOM files, extract metadata
- `generate-diagnostic-report` - AI-assisted report drafting (OpenAI)
- `live-transcription` - Voice-to-text transcription
- `generate-pdf-report` - Server-side PDF fallback (backup, not primary)
- `pregenerate-case-zip` - Create downloadable ZIP bundles
- `batch-pregenerate-zips` - Bulk ZIP generation
- `security-alerts` - Automated security monitoring
- `send-notification` - Email notifications

**Security Features:**
- Row Level Security (RLS) on all tables
- Multi-factor authentication (TOTP, backup codes)
- Rate limiting (5 attempts → 15min lockout)
- CSRF protection (token-based)
- Input sanitization (DOMPurify)
- File validation (zip bomb, path traversal, malicious file detection)
- Audit logging (immutable, cannot be tampered)
- Session timeout (30 minutes inactivity)
- Password policy (12+ chars, complexity requirements)

---

## 💰 Cost Structure & Optimization

### Current Costs (~£72/year)
- **Supabase:** £0/month (free tier, 500MB database, unlimited storage at £0.021/GB)
- **Storage:** ~£6/month (estimated for DICOM files)
- **Edge Functions:** £0/month (free tier, 500K invocations)
- **PDF Generation:** £0/month (client-side, no service cost)
- **Stripe Fees:** 2.9% + £0.30 per invoice

### Previous Architecture Costs (~£624/year)
- Supabase Pro: £25/month
- PDF service (hcti.io): £20/month
- Edge functions: £1/month
- **Savings: £552/year (88% reduction)**

### Optimization Decisions
1. **Client-side PDF generation** - Moved from server-side (10-30s, £20/mo) to client (@react-pdf/renderer, 3s, £0)
2. **Manual billing** - Removed complex invoice automation (saves maintenance, 15min/month is acceptable)
3. **Free tier Supabase** - Current volume fits comfortably within limits
4. **Auto-assignment** - Single reporter means no complex routing logic needed

---

## 🔒 Security & Compliance

### Compliance Standards Met
- ✅ UK GDPR compliant
- ✅ NHS Digital security standards aligned
- ✅ HIPAA-ready architecture
- ✅ SOC 2 Type II infrastructure (Supabase)

### Security Implementations (see SECURITY_AUDIT_SUMMARY.md for full details)

**Authentication & Access Control:**
- Multi-factor authentication (TOTP-based)
- Role-based access control (clinic/reporter/admin)
- Rate limiting (5 failed attempts → 15min lockout)
- Session timeout (30min inactivity)
- Strong password policy (12+ chars, complexity)

**Data Protection:**
- Row Level Security (RLS) on all tables
- Encrypted at rest (Supabase)
- Encrypted in transit (HTTPS)
- CSRF protection on state-changing operations
- Input sanitization (XSS prevention)

**File Security:**
- DICOM file validation (magic bytes, format checks)
- Zip bomb detection (compression ratio limits)
- Path traversal prevention
- Malicious file type blocking
- Size limits (500MB per file, 2GB per case)

**Audit & Monitoring:**
- Immutable audit log (7-year retention)
- Security dashboard (admin-only)
- Automated security alerts (failed logins, unauthorized access)
- Cannot tamper with audit logs (RLS policies)

---

## 📊 Key Metrics & Performance

### Performance Targets (All Met)
- ✅ PDF generation: 3 seconds (target: <5s)
- ✅ Report save: <1 second (target: <2s)
- ✅ Case upload: ~30s for 100MB file
- ✅ Dashboard load: <2 seconds
- ✅ DICOM processing: <60s for typical scan

### Business Metrics
- **Cases per week:** 30 (current capacity: 100+)
- **Reports per month:** ~120
- **Active clinics:** 5-10
- **Billing time:** 15 minutes/month
- **Cost per case:** ~£0.60 (infrastructure only)

### User Experience
- **Clinic satisfaction:** Simple, fast, reliable
- **Reporter efficiency:** Auto-assignment, AI assistance, fast PDF
- **System uptime:** 99.9% (Supabase infrastructure)

---

## 🎨 UI/UX Design Principles

### Design System
- **Framework:** Tailwind CSS + shadcn/ui components
- **Theme:** Medical professional (clean, trustworthy, accessible)
- **Colors:** Semantic tokens (CSS variables in index.css)
- **Typography:** System fonts (fast loading)
- **Responsive:** Mobile-first, works on tablets/phones

### Key UI Patterns
- **Sidebar navigation** - Role-based menu (AppSidebar)
- **Tab-based dashboards** - Unified Dashboard (Cases/Stats/Billing tabs)
- **Status badges** - Color-coded case status (uploaded, in_progress, report_ready)
- **Toast notifications** - Success/error feedback (sonner)
- **Modal dialogs** - Confirmation prompts (delete, finalize)
- **Loading states** - Skeleton loaders, spinners
- **Empty states** - Helpful messages when no data

### Accessibility
- ✅ Semantic HTML (header, main, nav, section)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Color contrast meets WCAG AA
- ⚠️ Screen reader testing needed (future enhancement)

---

## 🐛 Known Issues & Tech Debt

### Current Known Issues
1. **Annotation image saving** - Images annotated with pen tool may not display correctly in PDF
   - Priority: HIGH
   - Impact: Reporter workflow affected
   - Root cause: Image URL passing from client to PDF generator
   - Status: Being investigated

2. **Clinic page loading** - Some clinic users experience slow dashboard load after login
   - Priority: MEDIUM
   - Impact: User experience
   - Root cause: User role not being set in user_roles table for new signups
   - Status: FIXED (migration applied)

### Future Enhancements (Low Priority)
- Report templates for common findings
- Bulk case upload
- Advanced search/filtering
- Enhanced email notifications (currently basic)
- Invoice history tracking in-app
- Mobile app (native iOS/Android)

---

## 🚀 Development Workflow & Best Practices

### Code Organization
```
src/
├── pages/           # Full page components (routes)
├── components/      # Reusable UI components
│   └── ui/         # shadcn base components (button, card, etc.)
├── hooks/          # Custom React hooks (useAuth, useSessionTimeout)
├── lib/            # Utility functions (audit logging, backup codes)
├── services/       # Business logic services (file validation, DICOM upload)
├── utils/          # General utilities (sanitization, CSRF, password strength)
└── integrations/   # External service clients (Supabase)

supabase/
├── functions/      # Edge functions (serverless)
│   └── _shared/   # Shared utilities (CORS, security headers)
└── migrations/     # Database schema changes (timestamped SQL)
```

### Development Best Practices
1. **Always use RLS policies** - Never expose data without proper access control
2. **Client-side validation + server-side enforcement** - Defense in depth
3. **Semantic design tokens** - Use CSS variables, not hardcoded colors
4. **Responsive design** - Test on mobile/tablet, not just desktop
5. **Error handling** - Always show user-friendly messages, log details
6. **Loading states** - Never leave users wondering if something is working
7. **Toast feedback** - Confirm actions (success/error)
8. **Audit logging** - Log all sensitive operations (access, changes, auth)

### Testing Checklist (Before Deployment)
- [ ] Test all user workflows end-to-end
- [ ] Verify RLS policies (try accessing other users' data)
- [ ] Test rate limiting (5 failed logins)
- [ ] Test file upload validation (malicious files, zip bombs)
- [ ] Verify CSRF protection (remove token, should fail)
- [ ] Test MFA setup and login
- [ ] Check audit logs are immutable (try to update/delete)
- [ ] Test on mobile devices
- [ ] Verify PDF generation works correctly
- [ ] Test billing export with real data

---

## 📈 Scaling Plan & Future Growth

### Phase 1: Current (30 scans/week, 1 reporter) ✅
**Infrastructure:**
- Supabase free tier
- Client-side PDF generation
- Manual billing export

**Status:** Production-ready, fully implemented

---

### Phase 2: Growth (100 scans/week, 2-3 reporters)
**When to trigger:** Consistently hitting 80+ scans/week for 2+ months

**Changes needed:**
1. **Upgrade Supabase to Pro** (£25/month)
   - More database storage
   - Priority support
   - Better performance

2. **Add assignment logic**
   - Round-robin case assignment
   - Workload balancing
   - Reporter performance tracking

3. **Report templates**
   - Common findings library
   - Template suggestions based on clinical question
   - Faster report writing

4. **Bulk operations**
   - Multi-case upload
   - Batch report finalization
   - Bulk PDF download

**Estimated cost:** £400/year (still <50% of old architecture)

---

### Phase 3: Scale (500+ scans/week, 5+ reporters)
**When to trigger:** Growing beyond 400 scans/week, multiple clinics per day

**Changes needed:**
1. **Re-implement automated billing** (restore from BACKUP_COMPLEX_INVOICE_SYSTEM.md)
   - Automatic invoice generation
   - Monthly aggregation
   - Stripe Webhooks for payment tracking

2. **Advanced analytics**
   - Reporter performance metrics
   - Turnaround time tracking
   - Revenue forecasting
   - Clinic usage patterns

3. **API integrations**
   - Webhook notifications
   - Third-party PACS integration
   - HL7/FHIR support for EMR systems

4. **Custom branding**
   - White-label options for larger clients
   - Custom PDF templates per clinic
   - Branded portals

**Estimated cost:** £1,200-2,000/year (still cost-effective at scale)

---

## 🎯 Project Management Guidance

### As PM, Your Core Responsibilities

#### 1. Protect Simplicity
**Anti-patterns to avoid:**
- ❌ "We might need this feature in the future, let's build it now"
- ❌ "Let's automate everything to save time" (when manual is 15min/month)
- ❌ "This would be cool to have" (without clear business value)
- ❌ "Let's over-engineer for scale" (when current scale is known)

**Questions to ask:**
- ✅ "Does this solve an actual problem the user reported?"
- ✅ "What is the minimum viable solution?"
- ✅ "Is the manual process really that painful?" (measure time)
- ✅ "Will this add significant complexity?" (maintenance burden)

#### 2. Prioritize Ruthlessly

**Priority Matrix:**

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0 - Critical** | Blocks workflow, security risk, data loss | Authentication broken, RLS bypass, file upload fails |
| **P1 - High** | Significant user pain, frequent issue | PDF generation broken, slow dashboard, annotation bugs |
| **P2 - Medium** | Minor inconvenience, workaround exists | UI polish, better error messages, email notifications |
| **P3 - Low** | Nice-to-have, requested by <2 users | Bulk upload, report templates, advanced search |
| **P4 - Future** | Belongs in next growth phase | Automated billing (Phase 2), API integrations (Phase 3) |

**Decision framework:**
1. **Security first** - Any security issue is automatic P0
2. **User pain** - If users complain daily, it's real pain (P1)
3. **Frequency** - If it happens once a month, it's low priority (P3)
4. **Workarounds** - If manual workaround takes <5 minutes, defer (P3)

#### 3. Manage Technical Debt Wisely

**Acceptable debt** (don't fix unless it hurts):
- ✅ No comprehensive test suite (current scale doesn't justify)
- ✅ Some code duplication (refactor when it's painful)
- ✅ Manual processes (billing export, invoice creation)
- ✅ Basic email templates (functionality over design)

**Unacceptable debt** (fix immediately):
- ❌ Security vulnerabilities (audit SECURITY_AUDIT_SUMMARY.md regularly)
- ❌ Data integrity issues (RLS policies, validation)
- ❌ User-facing bugs in core workflows (upload, reporting, billing)
- ❌ Performance regressions (PDF >10s, dashboard >5s)

#### 4. Communication & Expectations

**With Clinics (external users):**
- Set clear expectations: "Reports within 24-48 hours"
- Communicate downtime: "Maintenance window: Sunday 2-4am"
- Respond to issues: "Acknowledged, investigating, will update by EOD"
- Gather feedback: Monthly check-in with top 3 clinics

**With Reporter (internal user):**
- Weekly sync: Current workload, pain points, feature requests
- Monthly review: Efficiency metrics, process improvements
- Feedback loop: "What slowed you down this week?"
- Roadmap discussion: Prioritize together, not in isolation

**With Development Team:**
- Clear requirements: "User needs to do X because Y"
- Acceptance criteria: "Done when user can do X in <3 clicks"
- Context, not solutions: "Users struggle with Z" (not "build feature A")
- Celebrate simplicity: "Great job keeping this simple"

#### 5. Monitor & Measure

**Weekly Metrics to Track:**
- Cases uploaded (volume trending?)
- Reports completed (turnaround time?)
- User issues reported (types, frequency)
- System performance (dashboard load, PDF generation)
- Error rates (Supabase dashboard, audit logs)

**Monthly Review:**
- Revenue vs. costs (stay under £100/year?)
- User satisfaction (clinic feedback, reporter happiness)
- Feature requests (any patterns? common pain points?)
- Security audit (check logs, review recent changes)
- Tech debt assessment (what's painful now?)

**Quarterly Planning:**
- Growth trajectory (approaching Phase 2 triggers?)
- Major feature decisions (templates, bulk upload)
- Infrastructure review (still on free tier? need upgrade?)
- Competitive analysis (what are competitors doing?)
- Roadmap update (next 3-6 months priorities)

---

## 🎓 Lessons Learned (From Simplification)

### What We Got Right
1. **Client-side PDF** - Massive win (3s vs 30s, £0 vs £20/mo)
2. **Manual billing** - 15min/month is fine, automation was overkill
3. **Auto-assignment** - Single reporter makes this trivial
4. **Unified dashboard** - One place for everything (reporter UX improved)
5. **Free tier focus** - Current volume fits perfectly, no need to pay

### What We Corrected
1. **Over-engineered invoicing** - Monthly aggregation, line items, automated generation (removed, saved £300/year + complexity)
2. **Server-side PDF** - Slow, expensive, unreliable (moved to client)
3. **Separate dashboards** - Reporter and Admin were 80% duplicate (unified)
4. **Complex assignment** - Routing logic for one person (auto-assign instead)
5. **Premature optimization** - Built for 1000s of cases, have 120/month (right-sized)

### Key Insights for PMs
- **Volume matters** - What works at 120/month doesn't work at 10,000/month (and vice versa)
- **Manual isn't bad** - If it takes <1 hour/month, automation costs more than it saves
- **Simple = fast** - Simple code deploys faster, debugs faster, onboards faster
- **Users don't care** - Users care about "does it work?" not "is it automated?"
- **Cost discipline** - Free tier is powerful, don't pay for what you don't use

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Clinic page won't load after logging in"
**Symptoms:** Dashboard shows blank or loading spinner indefinitely  
**Root Cause:** User not in `user_roles` table, `ProtectedRoute` fails  
**Solution:**
```sql
-- Check if user has role
SELECT * FROM user_roles WHERE user_id = '<user-uuid>';

-- If missing, insert role
INSERT INTO user_roles (user_id, role) VALUES ('<user-uuid>', 'clinic');
```
**Prevention:** Ensure `handle_new_user()` trigger inserts into `user_roles`

---

#### Issue: "Pen draw tool not working in annotations"
**Symptoms:** Click draw button, pen doesn't draw on canvas  
**Root Cause:** Fabric.js brush not initialized or canvas not rendering  
**Solution:**
- Verify `fabricCanvas.freeDrawingBrush` exists
- Call `fabricCanvas.renderAll()` after setting brush properties
- Check if `isDrawingMode` is set to true
**Files:** `src/components/ImageAnnotator.tsx`

---

#### Issue: "Annotated images not showing in PDF"
**Symptoms:** PDF generates but images are placeholders  
**Root Cause:** Image URLs not passed correctly from client to PDF generator  
**Current Status:** UNDER INVESTIGATION  
**Workaround:** Download annotated images separately, attach manually

---

#### Issue: "Rate limit lockout - can't login"
**Symptoms:** "Account locked" message after failed login attempts  
**Root Cause:** 5+ failed logins triggered 15min lockout  
**Solution:**
```sql
-- Check lockout status
SELECT * FROM login_attempts WHERE email = '<user-email>' ORDER BY attempt_time DESC LIMIT 10;

-- Clear lockout (admin only)
DELETE FROM login_attempts WHERE email = '<user-email>' AND successful = false;
```
**Tell user:** "Wait 15 minutes or contact support to unlock"

---

#### Issue: "File upload fails - validation error"
**Symptoms:** Upload button shows error, file not uploaded  
**Common Causes:**
1. File too large (>500MB per file, >2GB total)
2. Not a valid DICOM file (no DICM magic bytes)
3. ZIP contains malicious files (.exe, .dll)
4. Path traversal in filename (`../`)

**Solution:** Check `fileValidationService.ts` logs in console  
**Tell user:** "Please ensure files are valid DICOM format and under 500MB each"

---

#### Issue: "PDF generation slow or fails"
**Symptoms:** PDF takes >10s or shows error  
**Root Cause:**
1. Large report text (>50KB)
2. Many images (>10)
3. Network issue fetching image URLs

**Solution:**
- Check browser console for errors
- Verify image URLs are accessible (public URLs)
- Fall back to server-side PDF generation (edge function)

---

#### Issue: "Audit logs show unauthorized access attempts"
**Symptoms:** Security dashboard shows spike in unauthorized access  
**Action:**
1. Review audit logs: `/admin/audit-logs`
2. Check IP addresses (pattern? same IP?)
3. If attack: Block IP (Supabase network rules)
4. Notify affected users if data accessed

---

## 📞 Support & Resources

### Internal Documentation
- **This file** - Project overview & PM guidance
- `PROJECT_SIMPLIFICATION_SUMMARY.md` - Architecture changes & rationale
- `SECURITY_AUDIT_SUMMARY.md` - Security implementations & testing
- `BACKUP_COMPLEX_INVOICE_SYSTEM.md` - Removed code for future reference
- `README.md` - Setup & deployment instructions

### External Resources
**Technical:**
- Supabase Docs: https://supabase.com/docs
- React-PDF Docs: https://react-pdf.org
- Lovable Docs: https://docs.lovable.dev
- shadcn/ui: https://ui.shadcn.com
- Fabric.js: http://fabricjs.com

**Business:**
- Stripe Invoicing: https://stripe.com/docs/invoicing
- NHS Digital Security: https://digital.nhs.uk/cyber-security
- UK GDPR Guidance: https://ico.org.uk/for-organisations/guide-to-data-protection/

### Getting Help
**Technical Issues:**
1. Check browser console for errors
2. Review Supabase dashboard logs
3. Search this documentation
4. Check Lovable community Discord
5. Review recent changes (version history)

**Business Decisions:**
1. Refer to Priority Matrix (above)
2. Measure user pain (time/frequency)
3. Consider simplicity principle
4. Discuss with reporter (main user)
5. Check if Phase 2/3 feature (defer)

---

## ✅ PM Success Checklist

### Daily
- [ ] Monitor for user-reported issues (email, support)
- [ ] Check Supabase dashboard for errors (red flags)
- [ ] Review recent changes (Lovable version history)

### Weekly
- [ ] Sync with reporter (pain points, feature requests)
- [ ] Review metrics (cases uploaded, reports completed)
- [ ] Triage new issues (prioritize P0-P4)
- [ ] Update development team on priorities

### Monthly
- [ ] Review costs (Supabase usage, Stripe fees)
- [ ] Gather clinic feedback (satisfaction, issues)
- [ ] Security audit (check logs, review changes)
- [ ] Tech debt assessment (what hurts now?)
- [ ] Feature backlog review (prune old requests)

### Quarterly
- [ ] Growth assessment (approaching Phase 2?)
- [ ] Major feature decisions (templates, bulk upload)
- [ ] Infrastructure review (free tier sufficient?)
- [ ] Roadmap update (next 3-6 months)
- [ ] Competitive analysis (what's new in market?)

---

## 🎯 Final PM Philosophy

### Remember:
1. **The user is the sole radiologist reporter** - Their workflow is THE workflow
2. **Volume is low** - 30 scans/week is the reality, not 3000/week
3. **Manual is OK** - 15 minutes/month for billing is fine, automation would cost more
4. **Simple is better** - Complex systems break in complex ways, simple systems work
5. **Security matters** - Patient data requires vigilance, no shortcuts

### Your job as PM is to:
- ✅ **Protect simplicity** (say no to complexity)
- ✅ **Prioritize ruthlessly** (P0/P1 only, defer P3/P4)
- ✅ **Maintain quality** (security, performance, reliability)
- ✅ **Enable growth** (plan Phase 2/3, but don't build yet)
- ✅ **Keep costs low** (free tier first, pay only when necessary)

### When in doubt, ask:
1. "Does this solve a real problem the user reported?"
2. "Is this the simplest solution?"
3. "Will this make the reporter's life easier?"
4. "Can we defer this to Phase 2/3?"
5. "What would break if we don't do this?"

**If the answer to #5 is "nothing", it's P3 or lower. Defer it.**

---

*This document is the single source of truth for project understanding and PM decision-making. Update as the project evolves, but maintain the core philosophy: Simple, Secure, Reliable.*
