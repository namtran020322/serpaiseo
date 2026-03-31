

# Plan: Weighted Fair Queue + E2E Verification

## Part 1: Weighted Fair Queue (WFQ)

### Concept
Paid users get processed 3x more often than free/trial users. Instead of pure round-robin, a **weight counter** tracks how many turns each tier has used. The system picks the job whose tier has the most "remaining turns."

### Implementation

**Step 1: Add `priority` column to `ranking_check_queue`**

Migration adds:
```sql
ALTER TABLE ranking_check_queue ADD COLUMN priority integer NOT NULL DEFAULT 0;
```
- `0` = free/trial user
- `1` = paid user (has at least 1 paid billing_orders)

**Step 2: Update `add-ranking-job` to set priority**

When inserting a new job, check if user has any `billing_orders` with `status = 'paid'`:
- If yes → `priority = 1`
- If no → `priority = 0`

**Step 3: Update `claim_next_queue_job()` SQL function**

Use weighted selection logic:
```sql
-- Count pending/processing jobs by priority
-- If paid_count * 1 >= free_count * 3, pick free next (anti-starvation)
-- Otherwise pick paid first
ORDER BY
  CASE 
    WHEN priority = 1 THEN 0  -- paid first by default
    ELSE 1
  END,
  updated_at ASC
```

More precisely, implement a **weighted round-robin** counter:
- Paid jobs: weight 3 (get picked 3x as often)
- Free jobs: weight 1
- Track via a simple heuristic: among pending jobs, sort by `(times_processed / weight) ASC, updated_at ASC` where `times_processed` = `processed_keywords / BATCH_SIZE`

Simpler approach (recommended): Just sort by `priority DESC, updated_at ASC`. This gives paid users priority but still processes free users when no paid jobs are waiting. Combined with the existing `updated_at` round-robin, paid users get picked first but free users are never starved because their `updated_at` keeps advancing.

**Anti-starvation guarantee**: A free user's job will eventually be picked because:
1. Paid jobs' `updated_at` advances each batch → they rotate to the back
2. Free jobs with oldest `updated_at` float to top when no paid jobs are older

### Files

| File | Change |
|------|--------|
| Migration SQL | Add `priority` column to `ranking_check_queue` |
| `supabase/functions/add-ranking-job/index.ts` | Set priority based on billing history |
| Migration SQL | Update `claim_next_queue_job()` to sort `priority DESC, updated_at ASC` |

---

## Part 2: E2E Verification Plan

Test round-robin + rate limit + canonical with 2 different classes.

### Test Steps

1. **Query existing data**: Check current queue state and recent jobs
2. **Invoke `process-ranking-queue`** and monitor edge function logs
3. **Verify in DB**:
   - Keywords have `ranking_position`, `found_url`, `serp_results` populated
   - `last_checked_at` updated on classes
   - Credits deducted correctly
   - Queue jobs marked `completed`
4. **Verify rate limit**: Check edge function logs for timestamps between API calls (should be ≥1s apart)
5. **Verify round-robin**: If 2 jobs exist simultaneously, logs should show alternating job IDs between batches

### Execution
Will use `supabase--edge_function_logs` and `supabase--read_query` tools to inspect real data and logs after triggering a check.

