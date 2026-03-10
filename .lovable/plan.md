

## Plan: Fix AdminUsers spurious edge function call

### Root Cause

In `src/pages/admin/AdminUsers.tsx` (lines 34-37), the `queryFn` makes a **redundant** `supabase.functions.invoke("admin-user-management", { body: {} })` call **before** the actual `fetch()` call. This invoke has no `action` query param, so the edge function returns 400 "Invalid action", which triggers the "Edge Function returned a non-2xx status code" error toast.

The result of this invoke is never used — it's leftover dead code from a previous implementation.

### Fix

**File: `src/pages/admin/AdminUsers.tsx`**
- Remove lines 34-37 (the `supabase.functions.invoke(...)` call)
- Keep only the manual `fetch()` call which correctly includes `?action=list-users`

One-line fix: delete the dead `supabase.functions.invoke` call.

