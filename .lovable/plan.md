

## Plan: 3 Items — Test Refresh All, Test Trial, Full i18n

### 1. Test "Refresh All" Button (ProjectDetail)

**Status: Already Fixed.** The code at `ProjectDetail.tsx` lines 36-46 shows `handleRefreshAll` is properly wired with `onClick={handleRefreshAll}` at line 127, with disabled state and spinner. This should work correctly now. No code changes needed — just manual testing by clicking the button on a project with classes.

### 2. Test Trial Credits (Admin)

**Status: Already Implemented.** The `TrialGrantDialog`, edge function `grant-trial` action, `useTrial` hook, and enforcement in `AddProjectDialog`/`AddClassDialog` are all in place. No code changes needed — just manual testing by granting a trial via Admin > Users.

### 3. Full i18n — Default English, Complete Vietnamese Translation

**Problem:** Currently only Settings page uses `t()`. All other pages (Dashboard, Projects, ProjectDetail, ClassDetail, Billing, Notifications, Login, Register, ForgotPassword, ResetPassword, AppSidebar, HeaderActions) have hardcoded English strings.

**Changes needed:**

#### A. Change default locale to English
- `src/contexts/LanguageContext.tsx`: Change default from `"vi"` to `"en"`

#### B. Expand translation dictionaries
- `src/i18n/en.ts`: Add ~150+ keys covering all pages
- `src/i18n/vi.ts`: Add matching Vietnamese translations for all keys

Key sections to add translations for:
- **Dashboard**: greeting, welcome message, cards (Projects, Create Project, Track Rankings), How to Use steps
- **Projects page**: title, subtitle, pagination text, empty state
- **ProjectDetail**: button labels, section titles, empty states
- **ClassDetail**: Statistics/Ranking Chart tabs, Keywords section, button labels (Refresh Rankings, Settings, Export)
- **Billing**: all card titles, pricing section, credit usage info, transaction/order history
- **Notifications**: title, empty state
- **Login/Register**: all form labels, buttons, links
- **ForgotPassword/ResetPassword**: all text
- **AppSidebar**: menu items (Home, Projects), dropdown items (Account, Billing, Notifications, Settings, Log out)
- **HeaderActions**: notification popover title, dropdown items
- **Dialogs**: AddProjectDialog, AddClassDialog (step titles, labels, buttons)
- **Toast messages**: all success/error messages across components

#### C. Update all pages/components to use `t()`
Files to modify (import `useLanguage` and replace hardcoded strings):

1. `src/pages/Dashboard.tsx`
2. `src/pages/Projects.tsx`
3. `src/pages/ProjectDetail.tsx`
4. `src/pages/ClassDetail.tsx`
5. `src/pages/Billing.tsx`
6. `src/pages/Notifications.tsx`
7. `src/pages/Login.tsx`
8. `src/pages/Register.tsx`
9. `src/pages/ForgotPassword.tsx`
10. `src/pages/ResetPassword.tsx`
11. `src/components/AppSidebar.tsx`
12. `src/components/HeaderActions.tsx`
13. `src/components/projects/AddProjectDialog.tsx`
14. `src/components/projects/AddClassDialog.tsx`
15. `src/components/projects/KeywordsTable.tsx`
16. `src/components/projects/ProjectsTable.tsx`
17. `src/components/GlobalTaskWidget.tsx`
18. `src/components/ProcessingTasks.tsx`

Each file: `import { useLanguage } from "@/contexts/LanguageContext"`, destructure `const { t } = useLanguage()`, replace all hardcoded strings with `t('key')`.

**Note:** AppSidebar currently defines menu items as a static array outside the component. This needs to be moved inside the component (or use a function) so `t()` can be called.

This is a large but mechanical change. The total scope is ~18 files modified + 2 translation files expanded.

