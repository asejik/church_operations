# Project Status & File Map
Last Updated: Jan 2026 (Unit Dashboard Complete)

## Core Features (Status: ONLINE-FIRST)
1. **Members**: `src/pages/dashboard/Members.tsx`
2. **Attendance**:
   - Page: `src/pages/dashboard/Attendance.tsx`
   - Table: `attendance` (RLS: Unit Only)
3. **Finances**:
   - Page: `src/pages/dashboard/Finance.tsx`
   - Modals: `CreateRequestModal.tsx` (Budget), `Finance.tsx` (Ledger)
   - Tables: `finances`, `financial_requests`
4. **Inventory**:
   - Page: `src/pages/dashboard/Inventory.tsx`
   - Table: `inventory`
5. **Souls (Evangelism)**:
   - Page: `src/pages/dashboard/Souls.tsx`
   - Modal: `AddSoulReportModal.tsx`
   - Table: `soul_reports`
6. **Performance**:
   - Page: `src/pages/dashboard/Performance.tsx`
   - Table: `performance_reviews`
7. **Settings**:
   - Page: `src/pages/dashboard/Settings.tsx` (Profile/Password updates)

## Roles & Permissions
- **Unit Head**: Full Access to their Unit's data.
- **Unit Pastor**: Read-Only access to their Unit's data.
- **Admin Pastor (Queen Okoye)**:
  - Global View: Financial Requests, Inventory.
  - Restricted View: Attendance, Souls, Performance (Own Unit Only).
  - Actions: Can Approve/Deny financial requests.

## Database Rules
- **Strategy**: Direct Supabase calls (No Dexie/Offline).
- **Security**: RLS enabled on all tables.