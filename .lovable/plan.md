

## Fix Webapp Issues (Excluding Admin Vietnamese)

### Changes

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | Payment callback URL defaults to `lovable.app` | `supabase/functions/create-sepay-order/index.ts` | Change default `baseOrigin` to `https://serp.aiseocore.com` |
| 2 | Register page no auth redirect | `src/pages/Register.tsx` | Add `useEffect` redirect to `/dashboard` if authenticated |
| 3 | ForgotPassword page no auth redirect | `src/pages/ForgotPassword.tsx` | Add `useEffect` redirect to `/dashboard` if authenticated |
| 4 | Duplicate "Account" + "Settings" menu items | `src/components/AppSidebar.tsx`, `src/components/HeaderActions.tsx` | Remove duplicate entry (keep "Settings") |
| 5 | ProtectedRoute email verification not i18n | `src/components/ProtectedRoute.tsx` | Use `t()` for all hardcoded strings |
| 6 | NotFound page not i18n | `src/pages/NotFound.tsx` | Use `t()` for all hardcoded strings |
| 7 | ErrorBoundary not i18n | `src/components/ErrorBoundary.tsx` | Use `t()` (wrap with LanguageProvider if needed) |
| 8 | Dead placeholder Index.tsx | `src/pages/Index.tsx` | Clean up or make it redirect properly |
| 9 | useAuth excessive getUser calls | `src/hooks/useAuth.ts` | Only call `getUser()` on `INITIAL_SESSION` and `SIGNED_IN`, skip for `TOKEN_REFRESHED` |

Also add missing i18n keys to `src/i18n/en.ts` and `src/i18n/vi.ts`.

### Deploy
- Redeploy `create-sepay-order` edge function after URL fix.

