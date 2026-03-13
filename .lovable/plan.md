

# Security Review Results

The automated security scan found **11 findings** including **3 critical errors** that should be addressed. Since the app is currently restricted to a brochure-ware site (no auth routes exposed), the immediate risk is reduced, but these issues affect the underlying database and should be fixed before any authenticated routes go live.

---

## Critical (Error-Level) Findings

### 1. Signature audit table exposes data to anonymous users
The `signature_audit` table has a policy `Anyone can verify signatures` with `USING: true` on the `public` role. This means unauthenticated users can read signer IP addresses, browser user agents, credentials, case IDs, report IDs, and verification tokens.

**Fix:** Change the SELECT policy to require `authenticated` role, or scope it to only return non-sensitive columns (e.g., exclude `ip_address`, `user_agent`).

### 2. Privilege escalation via profiles table RLS policy
The `Users can update own profile except role` policy has `WITH CHECK: (role = role)` which compares the new value to itself -- always true. Any authenticated user can set their own `profiles.role` to `admin`.

**Fix:** Replace the WITH CHECK to compare the new role against the *existing* stored role using a subselect, or simply disallow role column updates for non-admins entirely:
```sql
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
)
```

### 3. billable_reports table has no RLS policies
Contains patient names, clinic emails, amounts, and invoice IDs with zero access control.

**Fix:** Add RLS policies mirroring the `invoices` table pattern (admin full access + clinic can view own).

---

## Warning-Level Findings

### 4. Function search_path mutable
Some database functions don't have `search_path` set, which could allow schema injection.

### 5. Extensions in public schema
Extensions installed in `public` schema instead of a dedicated schema.

### 6. Overly permissive RLS policy (always true)
The `security_audit_log` INSERT policy uses `WITH CHECK (true)`, allowing any user to insert audit logs.

### 7. Auth OTP long expiry
OTP tokens have a longer-than-recommended expiry window.

### 8. Leaked password protection disabled
Supabase's leaked password detection is not enabled.

### 9. Postgres version has security patches available
The database should be upgraded to apply patches.

### 10. Email-based clinic lookup in get_current_user_clinic()
The fallback that matches users to clinics by email could grant unintended access if a reporter's email matches a clinic's contact email.

---

## Recommended Implementation Order

1. **Fix privilege escalation** (finding 2) -- highest impact, easiest fix (single RLS policy update)
2. **Restrict signature_audit access** (finding 1) -- change policy role from `public` to `authenticated`
3. **Add billable_reports RLS policies** (finding 3) -- add admin + clinic-scoped policies
4. **Enable leaked password protection** -- toggle in Supabase dashboard
5. **Reduce OTP expiry** -- configure in Supabase auth settings
6. **Remove email fallback from get_current_user_clinic()** -- requires ensuring all users have explicit `clinic_id`
7. **Upgrade Postgres version** -- done via Supabase dashboard

All database changes would be implemented via SQL migrations. Dashboard-level changes (items 4, 5, 7) require manual action in the Supabase console.

