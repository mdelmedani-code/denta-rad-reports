

# Security Review -- Public Launch Configuration

Given that the app is currently restricted to a brochure-ware site (4 public routes only), the attack surface is small. Here are the findings, ordered by severity.

---

## CRITICAL

### 1. XSS in `register-interest` Edge Function
The `register-interest` function directly interpolates user input into HTML email content (lines 23-33) without escaping. An attacker can submit malicious HTML/JS in form fields (e.g., `firstName`, `message`), which will render in the admin's email client. This is a **stored XSS** vector targeting the admin.

**Fix:** HTML-escape all user inputs before interpolating into the email template. Add server-side input validation (length limits, character restrictions).

### 2. No Rate Limiting on `register-interest`
The edge function has `verify_jwt = false` and no rate limiting. Anyone can flood it with requests, causing spam emails to `admin@dentarad.co.uk` and burning through Resend API quota.

**Fix:** Add rate limiting by IP or fingerprint in the edge function (e.g., track submissions in a table and reject if too many in a time window).

---

## HIGH

### 3. `reports` Storage Bucket is Public
The `reports` bucket is set to `Is Public: Yes`. Even though there is no UI route to access reports, anyone who guesses or discovers a file path can download patient reports directly via the public Supabase storage URL. This is a **patient data exposure risk**.

**Fix:** Change the `reports` bucket to private. Use signed URLs for authorized access.

### 4. `template-assets` and `template-logos` Buckets are Public
Verify no sensitive content is stored here. If these contain only branding assets, this is acceptable but should be documented.

### 5. CORS Wildcard on All Edge Functions
All edge functions and the shared `cors.ts` use `Access-Control-Allow-Origin: '*'`. For the public launch this is low risk (only `register-interest` is callable), but should be tightened before enabling authenticated routes.

---

## MEDIUM

### 6. No Client-Side Input Validation on Contact Form
The contact form lacks length limits on text fields. Users can submit extremely long strings. Add `maxLength` attributes to inputs and validate in the edge function.

### 7. `index.html` SEO Metadata Still Shows Defaults
The page title is "denta-rad-reports", description is "Lovable Generated Project", and OG images point to `lovable.dev`. This isn't a security issue but affects professionalism and could be considered an information leak about your tech stack.

### 8. `AuthProvider` Still Active
The `AuthProvider` wraps all routes and initializes a Supabase auth session on every page load. While not exploitable (no login routes exist), it's unnecessary overhead and exposes the auth state listener. Consider removing it for the public launch.

---

## LOW

### 9. Supabase Anon Key Exposed in Client Code
This is expected and by design (it's a publishable key), but ensure your RLS policies are solid. Currently, the only table accessible to anonymous users is `pricing_rules` (SELECT). All other tables properly restrict anonymous access.

### 10. No Content-Security-Policy Headers
No CSP headers are set in production. This is a defense-in-depth measure that should be added before the full launch, ideally via Cloudflare.

---

## Recommended Actions (Priority Order)

1. **Fix XSS in `register-interest`** -- escape all user inputs in the HTML email template and add input validation/length limits
2. **Add rate limiting to `register-interest`** -- prevent spam/abuse of the unauthenticated endpoint
3. **Make the `reports` bucket private** -- this is a patient data exposure risk regardless of whether the UI exposes it
4. **Update `index.html` meta tags** -- replace defaults with DentaRad branding
5. **Add `maxLength` to contact form inputs** -- basic client-side hardening
6. **Consider removing `AuthProvider`** from the public launch build (optional, low risk)

