

## Analysis

6 items to address. Here's what I found:

### 1. Email templates in Vietnamese → Switch to English
All 6 templates (`signup`, `recovery`, `magic-link`, `invite`, `email-change`, `reauthentication`) use `lang="vi"` and Vietnamese text. Need to rewrite all copy in English.

### 2. Logo too small in emails
Currently `height="40"`. Increase to `height="56"` across all 6 templates.

### 3. URLs in emails point to lovable
In `auth-email-hook/index.ts`:
- `SAMPLE_PROJECT_URL = "https://serpaiseo.lovable.app"` → change to `"https://serp.aiseocore.com"`
- `ROOT_DOMAIN = "serp.aiseocore.com"` is already correct, so `siteUrl` in actual sends is fine
- But the `siteUrl` in templates links (signup, invite) uses `siteUrl` prop which comes from `https://${ROOT_DOMAIN}` — this is correct
- The `confirmationUrl` comes from the auth system payload (`payload.data.url`) — this URL is controlled by the auth system redirect config, not the template. Need to verify the redirect URL config.

**Issue**: The `redirectTo` in `ForgotPassword.tsx` uses `window.location.origin` which would be `serpaiseo.lovable.app` if accessed from there. Same for `Register.tsx` signup `emailRedirectTo`. These should use `https://serp.aiseocore.com` as the base.

### 4. Login page: redirect if already authenticated
Currently `/login` route has no auth check. Need to add: if user is already logged in, redirect to `/dashboard`.

### 5. Google OAuth users shouldn't need email verification
Google already verifies email. The `ProtectedRoute` checks `email_confirmed_at` — Google OAuth users should already have this set by the auth system. Need to verify this is actually the case. If it is, no code change needed. Google OAuth sets `email_confirmed_at` automatically.

### 6. Test Forgot Password flow
The `ResetPassword.tsx` checks for `access_token` and `type=recovery` in the URL hash. The `redirectTo` is set to `${window.location.origin}/reset-password`. This should work, but the recovery email's confirmation URL must redirect to the correct domain. Since the auth hook sends the `confirmationUrl` from `payload.data.url`, the auth system generates this URL based on the site URL config.

**Potential issue**: The reset password flow relies on `supabase.auth.resetPasswordForEmail` which uses `window.location.origin` as the redirect. If the user is on the lovable preview domain, the reset link would point there instead of `serp.aiseocore.com`.

---

## Implementation Plan

### Step 1: Update all 6 email templates to English + bigger logo
- Change `lang="vi"` → `lang="en"` on all templates
- Translate all Vietnamese text to English
- Change logo `height="40"` → `height="56"`

**Files**: All 6 files in `supabase/functions/_shared/email-templates/`

### Step 2: Fix URLs in auth-email-hook
- Update `SAMPLE_PROJECT_URL` to `https://serp.aiseocore.com`

**File**: `supabase/functions/auth-email-hook/index.ts` (line 49)

### Step 3: Fix redirect URLs in auth pages to use custom domain
- In `ForgotPassword.tsx` line 51: change `window.location.origin` → `https://serp.aiseocore.com`
- In `Register.tsx` (useAuth hook): the `emailRedirectTo` in signUp uses `window.location.origin` — change to `https://serp.aiseocore.com`
- In `Login.tsx` and `Register.tsx`: Google OAuth `redirectTo` should use `https://serp.aiseocore.com/dashboard`

**Files**: `src/hooks/useAuth.ts` (line 37), `src/pages/ForgotPassword.tsx` (line 51), `src/pages/Login.tsx` (line 103), `src/pages/Register.tsx` (line 150)

### Step 4: Login page auto-redirect for authenticated users
- In `Login.tsx`, import `useAuthContext` (already imported), check `user` and `loading` state
- If `user` exists and not loading, redirect to `/dashboard` via `useEffect`

**File**: `src/pages/Login.tsx`

### Step 5: Google OAuth — no changes needed
Google OAuth users automatically have `email_confirmed_at` set by the auth system. The `ProtectedRoute` check will pass. No code changes required.

### Step 6: Deploy auth-email-hook
- Call `deploy_edge_functions` for `auth-email-hook` after template changes

### Files Summary
| File | Changes |
|------|---------|
| 6 email templates | English text, logo height 56 |
| `auth-email-hook/index.ts` | Fix SAMPLE_PROJECT_URL |
| `src/pages/Login.tsx` | Add auto-redirect if authenticated |
| `src/pages/ForgotPassword.tsx` | Fix redirectTo URL |
| `src/pages/Register.tsx` | Fix Google OAuth redirectTo |
| `src/hooks/useAuth.ts` | Fix emailRedirectTo |

