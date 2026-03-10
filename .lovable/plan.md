

## Plan: 3 Improvements — Credit Pre-check, Error Boundary, Bulk Import Validation

### 1. Pre-check Credits Before Queuing Job

**Problem:** Currently `add-ranking-job` creates a queue entry without checking credits. The job then fails silently in `process-ranking-queue` when credits are insufficient. User sees a "pending" task that eventually becomes "failed" with no clear feedback.

**Fix:** Add a credit pre-check in `add-ranking-job/index.ts` before inserting the job:
- Calculate `creditsNeeded` based on `top_results` and keyword count
- Query `user_credits.balance`
- If insufficient, return 402 with a clear message including `credits_needed` and `credits_available`

On the frontend in `useRankingQueue.ts`:
- Catch the 402 error specifically in `onError`
- Show a descriptive toast with the credit shortage details and a link to the Billing page

Also i18n the error messages in `useRankingQueue.ts` and `useProjects.ts` (`useCheckRankings`).

### 2. Add Global Error Boundary

**Problem:** No `ErrorBoundary` exists. Any uncaught React error causes a blank white screen.

**Fix:** Create `src/components/ErrorBoundary.tsx`:
- Class component implementing `componentDidCatch`
- Renders a friendly fallback UI with "Something went wrong" message and a "Reload" button
- Use i18n for the text
- Wrap the app content in `App.tsx` with this boundary (inside providers, outside routes)

### 3. Validate Bulk Keyword Import

**Problem:** Large file imports (.csv/.txt) have no size/count limits. A user could import 100k keywords causing performance issues.

**Fix in `AddKeywordsDialog.tsx`:**
- Add a max keyword limit (e.g., 500 per batch) with a warning toast if exceeded
- Add file size validation (max 1MB) before reading
- Show a confirmation if importing more than 100 keywords

### Files to modify:
1. `supabase/functions/add-ranking-job/index.ts` — add credit pre-check
2. `src/hooks/useRankingQueue.ts` — handle 402 error with i18n
3. `src/hooks/useProjects.ts` — i18n for `useCheckRankings` toast messages
4. `src/components/ErrorBoundary.tsx` — new file
5. `src/App.tsx` — wrap with ErrorBoundary
6. `src/components/projects/AddKeywordsDialog.tsx` — add limits
7. `src/i18n/en.ts` + `src/i18n/vi.ts` — add new translation keys

