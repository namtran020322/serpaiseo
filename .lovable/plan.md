

# Fix: Eliminate 3-Minute Stall Between Batches

## Vấn đề

Sau khi xử lý batch đầu tiên, `process-ranking-queue` set `status = 'processing'`. Nhưng `claim_next_queue_job()` chỉ pick:
- `status = 'pending'`, HOẶC
- `status = 'processing'` AND `updated_at < now() - 3 minutes`

→ Job phải chờ 3 phút stale reset trước khi batch tiếp theo được xử lý.

## Fix

**File:** `supabase/functions/process-ranking-queue/index.ts`

Dòng 160: thay `'processing'` bằng `'pending'` khi job chưa hoàn thành:

```typescript
// Before
status: isComplete ? 'completed' : 'processing',

// After  
status: isComplete ? 'completed' : 'pending',
```

Với fix này, 12 keywords sẽ hoàn thành trong ~3 phút (2 cron ticks) thay vì ~6.5 phút.

## Files thay đổi

| File | Change |
|------|--------|
| `supabase/functions/process-ranking-queue/index.ts` | Line 160: `'processing'` → `'pending'` |

