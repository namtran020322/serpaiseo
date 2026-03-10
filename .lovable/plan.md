

## Plan: Fix credit adjustment "non-2xx" error

### Root Cause

`CreditAdjustDialog.tsx` calls `supabase.functions.invoke("admin-user-management", { body: {...} })` which sends a POST to `/functions/v1/admin-user-management` **without** the `?action=adjust-credits` query parameter.

The edge function reads `url.searchParams.get('action')` and since `action` is `null`, it falls through to the "Invalid action" 400 response.

### Fix

In `CreditAdjustDialog.tsx`, replace `supabase.functions.invoke()` with a manual `fetch()` call that includes the `?action=adjust-credits` query parameter, matching how `AdminUsers.tsx` already handles the list-users call.

| File | Change |
|------|--------|
| `src/components/admin/CreditAdjustDialog.tsx` | Replace `supabase.functions.invoke` with `fetch()` using full URL + `?action=adjust-credits` |

