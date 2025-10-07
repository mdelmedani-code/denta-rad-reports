# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/95a64e98-9773-4e9d-8ae3-2433dc3a3246

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/95a64e98-9773-4e9d-8ae3-2433dc3a3246) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/95a64e98-9773-4e9d-8ae3-2433dc3a3246) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🔒 Security

This application implements comprehensive security measures for handling patient health data:

### Security Features

- **Multi-Factor Authentication (MFA)**: TOTP-based MFA required for all users
- **Row Level Security (RLS)**: Database-level access control
- **Rate Limiting**: Protection against brute force attacks (5 attempts/15 minutes)
- **CSRF Protection**: Tokens required for all state-changing operations
- **Input Sanitization**: XSS prevention on all user inputs using DOMPurify
- **Audit Logging**: Immutable 7-year audit trail via secure RPC functions
- **File Validation**: Deep inspection of uploaded DICOM files (zip bomb & path traversal detection)
- **Session Management**: Auto-logout after 30 minutes inactivity
- **Password Policy**: Strong passwords enforced (12+ characters, complexity requirements)

### Compliance

- UK GDPR compliant
- NHS Digital security standards aligned
- HIPAA-ready architecture
- SOC 2 Type II infrastructure (Supabase)

### Security Testing

Before deploying to production:

1. Verify all tables have RLS enabled
2. Test authentication rate limiting
3. Test IDOR protection with multiple user accounts
4. Verify CSRF tokens are required
5. Test file upload validation (zip bombs, path traversal)
6. Verify audit logs are immutable
7. Test XSS prevention with malicious inputs

### Reporting Security Issues

If you discover a security vulnerability, please email security@yourdomain.com

**Do not** create public GitHub issues for security vulnerabilities.

### Security Monitoring

Access the security dashboard at `/security-dashboard` (admin only) to monitor:
- Failed login attempts
- Unauthorized access attempts
- Active user sessions
- Suspicious activity alerts
