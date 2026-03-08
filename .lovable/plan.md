

## Review: Queue System Upgrade - Critical Issues Found

### Issue 1: Migration Did Not Apply (CRITICAL)

The migration `20260307100000_queue_system_upgrade.sql` was **not applied** to the database. Evidence:

- `ranking_check_queue` table is **missing the `updated_at` column**
- Database functions `claim_next_queue_job()`, `reset_stale_queue_jobs()`, `cleanup_old_queue_jobs()` **do not exist**
- Cron jobs for cleanup/stale recovery were **not created**

**Impact:** The rewritten `process-ranking-queue/index.ts` calls `supabase.rpc('claim_next_queue_job')` and `supabase.rpc('reset_stale_queue_jobs')` — both will return errors since these functions don't exist. Any new ranking jobs will **fail to process**.

**Fix:** Run the migration SQL via the database migration tool to create the column, functions, and cron jobs.

---

### Issue 2: Stale Job Timeout (10 min) May Be Too Short

`check-project-keywords` processes keywords in batches of 10 with XMLRiver. Each keyword can require up to 10 API pages (top 100), each with 90s timeout + 300ms delay. Worst case per keyword: ~15s. A batch of 10 keywords: ~150s (2.5 min).

However, the queue processor only processes **one batch of 10 keywords per invocation** then self-invokes. So the 10-minute timeout per job is actually fine — each invocation takes 2-3 minutes max. Between invocations, `updated_at` is refreshed, resetting the stale timer.

**Verdict:** 10 minutes is sufficient. No change needed.

---

### Issue 3: Error Recovery After Max Continuations

If errors persist (e.g., XMLRiver down), self-invoke loops max 100 times × 5s = ~8 minutes then stops. Recovery paths:

- **pg_cron `process-ranking-queue-job`** runs every minute — it will trigger a fresh invocation with `continuation: 0`, restarting the loop
- **`reset_stale_queue_jobs`** (once the migration is applied) runs every 5 minutes and resets stuck processing jobs back to pending

**Verdict:** Adequate. The cron job provides the safety net.

---

### Issue 4: `selfInvoke` Uses `setTimeout` in Deno Edge Functions

`setTimeout` inside `Deno.serve` may not execute after the response is returned — Deno edge functions can terminate the isolate once the response is sent. The `fetch` inside `setTimeout` may never fire.

**Fix:** Replace `setTimeout` with `await`-based delay before returning the response, or use fire-and-forget `fetch` without `setTimeout` wrapping.

---

### Plan

1. **Apply the missing migration** — create `updated_at` column, the 3 database functions, and 2 new cron jobs
2. **Fix `selfInvoke`** — remove `setTimeout` wrapper, use direct fire-and-forget `fetch` (no await needed, but must happen before response)
3. **Verify cron job for stale recovery** — ensure the 5-minute cleanup cron is created

| File | Change |
|------|--------|
| Migration SQL | Run via migration tool |
| `supabase/functions/process-ranking-queue/index.ts` | Fix `selfInvoke` to not use `setTimeout` |

