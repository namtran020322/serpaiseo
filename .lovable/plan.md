

## Phân tích vấn đề

Từ auth logs, login production thành công (status 200). Vấn đề nằm ở phía client - `loading` state trong `useAuth` bị kẹt `true` mãi, khiến `ProtectedRoute` hiển thị spinner vô tận.

### Nguyên nhân gốc

Trong `useAuth.ts`, `onAuthStateChange` callback gọi `await supabase.auth.getUser()` bên trong listener. Đây là anti-pattern gây deadlock khi:
- `onAuthStateChange` fire với `INITIAL_SESSION` 
- Đồng thời `getSession()` cũng fire và gọi `getUser()`
- Hai async calls chạy song song, trong một số trường hợp cả hai đều không resolve `setLoading(false)`

## Plan

### Step 1: Fix `useAuth.ts` - Tránh deadlock
- Bỏ `await getUser()` bên trong `onAuthStateChange` cho event `INITIAL_SESSION` và `SIGNED_IN` — chỉ dùng `session.user` trực tiếp (đã đủ thông tin)
- Chỉ gọi `getUser()` 1 lần duy nhất trong `getSession().then()` để verify user tồn tại
- Thêm safety timeout 10s: nếu `loading` vẫn `true` sau 10s thì force set `false`

### Step 2: Thêm timeout fallback trong `ProtectedRoute`
- Nếu loading > 10s, hiển thị nút "Reload" thay vì spinner vô tận
- Tránh user bị kẹt mà không biết làm gì

### Files
| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Remove getUser from onAuthStateChange, add 10s timeout |
| `src/components/ProtectedRoute.tsx` | Add reload fallback after 10s |

