

## Plan: Apple Design cho Sidebar

Tham khảo hình Apple Music - giao diện sạch, tối giản, không border nặng, khoảng cách thoáng, typography rõ ràng.

### Changes to `AppSidebar.tsx`

1. **Sidebar background**: Thêm prop để sidebar nền trắng tinh (`bg-white`) thay vì `bg-sidebar` xám nhạt hiện tại — giống Apple Music sidebar
2. **Logo header**: Tăng padding, thêm khoảng cách dưới logo
3. **Search button**: Style lại thành dạng pill nhẹ nhàng hơn — `rounded-xl bg-muted/50` không border, giống search bar Apple
4. **Menu items**: 
   - Bỏ `SidebarGroupLabel` ("Main Menu") — Apple không dùng label cho menu chính
   - Menu item: `rounded-xl` thay vì `rounded-lg`, padding rộng hơn (`px-3 py-2.5`)
   - Active state: `bg-accent` nhẹ nhàng, font-medium
   - Icon size giữ `h-4 w-4`, text `text-[13px]` (Apple dùng font nhỏ hơn)
5. **Footer user section**: 
   - Bỏ `border-t` — Apple dùng khoảng cách thay vì đường kẻ
   - Avatar nhỏ hơn (`h-8 w-8`), text compact hơn
   - Dropdown trigger: icon nhẹ hơn, hover tinh tế

### Changes to `SidebarSearch.tsx`

- Button style: `border-0 bg-muted/40 rounded-xl` — flat, không viền, bo góc mềm
- Font size nhỏ hơn (`text-[13px]`)
- Kbd badge nhẹ hơn

### Changes to `index.css`

- Update `--sidebar-background` thành `0 0% 100%` (trắng tinh) hoặc `0 0% 99%` (gần trắng)
- Update `--sidebar-border` thành trong suốt hơn hoặc rất nhạt

### Files to modify

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Restructure: bỏ group label, tăng spacing, rounded-xl items, bỏ border-t footer |
| `src/components/SidebarSearch.tsx` | Flat search button, no border, rounded-xl |
| `src/index.css` | Sidebar CSS variables: trắng hơn, border nhạt hơn |

