

## Plan: 3 Features

### 1. Fix "Refresh All" button in ProjectDetail

**Problem**: The button at line 104 of `ProjectDetail.tsx` has no `onClick` handler — it's a dead button.

**Fix**: Add the same refresh logic used in `ProjectRow.tsx` (which uses `useCheckRankings` hook and `useTaskProgress` for anti-spam). Wire the button with `onClick={handleRefreshAll}`, disable it when a task is running, and show spinner state.

**File**: `src/pages/ProjectDetail.tsx`
- Import `useCheckRankings` from `@/hooks/useProjects` and `useTaskProgress` from `@/contexts/TaskProgressContext`
- Add `handleRefreshAll` function (same pattern as `ProjectRow`)
- Add `onClick`, `disabled`, and spinner state to the Refresh All button

---

### 2. Admin Trial Credits System

**Goal**: Admin can grant trial credits with limits (max 1 project, max 2 classes, expiration time in hours/days).

**Database changes** (migration):
- New table `trial_credits`:
  - `id`, `user_id` (unique), `credits_granted`, `max_projects` (default 1), `max_classes_per_project` (default 2), `expires_at`, `granted_by` (admin), `is_active`, `created_at`

**Edge Function changes** (`admin-user-management`):
- New action `grant-trial`: creates trial record, adds credits to user, logs in `admin_actions_log`
- New action `revoke-trial`: deactivates trial

**Frontend enforcement**:
- `AddProjectDialog.tsx`: Check if user is on trial, enforce max project limit
- `AddClassDialog.tsx`: Check if user is on trial, enforce max classes per project limit
- Show remaining trial time in UI (e.g., badge in sidebar or billing page)

**Admin UI** (`AdminUsers.tsx`):
- New "Grant Trial" button/dialog per user with fields: credits amount, duration (number + unit hours/days), max projects, max classes per project
- Show trial status in user list

**Files to modify/create**:
- Migration: new `trial_credits` table + RLS
- `supabase/functions/admin-user-management/index.ts`: add `grant-trial` action
- New component: `src/components/admin/TrialGrantDialog.tsx`
- `src/pages/admin/AdminUsers.tsx`: add trial button
- `src/components/projects/AddProjectDialog.tsx`: enforce project limit
- `src/components/projects/AddClassDialog.tsx`: enforce class limit
- New hook: `src/hooks/useTrial.ts` to check trial status

---

### 3. Language Switcher (Vietnamese / English)

**Approach**: Use React Context for i18n with a simple translation map. Store preference in `localStorage`.

**Files to create/modify**:
- `src/contexts/LanguageContext.tsx`: context + provider with `locale` state (`vi` | `en`)
- `src/i18n/vi.ts` and `src/i18n/en.ts`: translation key-value maps for all UI strings
- `src/pages/Settings.tsx`: add language selector card with radio/select between Vietnamese and English
- `src/App.tsx` or `src/main.tsx`: wrap with `LanguageProvider`
- Gradually replace hardcoded strings across components with `t('key')` helper from context

The language toggle will appear as a new card in Settings page with a Select dropdown.

