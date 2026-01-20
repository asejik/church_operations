# Project Status & Architecture Map
Last Updated: January 21, 2026 (Evangelism Portal Complete & Souls Refactor)

## 1. Core Architecture: Online-First
- **Database**: Supabase (PostgreSQL) is the Single Source of Truth.
- **Offline Mode**: Removed. The app now fetches directly from Supabase.
- **Client State**: React Query / Direct Fetching.
- **Security Strategy**: Tiered RLS (Row Level Security) with "Circuit Breaker" functions.

## 2. Role-Based Access Control (RBAC)
We use a **Tiered Permission System** enforced by Database Policies:

* **Tier 1: Admin Pastor (e.g., Pastor Queen)**
    * **Access**: Global view of Finances & Inventory across ALL units.
    * **Restriction**: Cannot view Attendance, Souls, or Performance of other units (Privacy).
    * **Mechanism**: Uses `is_admin()` function to bypass RLS recursion loops.
    * **UI**: Lands on `AdminLayout` (/admin).

* **Tier 2: Evangelism Oversight (e.g., Evangelist Chuks)**
    * **Access**: Global view of Soul Reports across ALL units.
    * **Restriction**: No access to Finance, Inventory, or unit-specific admin data.
    * **Mechanism**: Uses `is_evangelist()` function.
    * **UI**: Lands on `EvangelismLayout` (/evangelism).

* **Tier 3: Unit Head**
    * **Access**: Full CRUD (Create/Read/Update/Delete) for their OWN unit only.
    * **Mechanism**: RLS policy `unit_id = auth.unit_id()`.
    * **UI**: Lands on `DashboardLayout` (/dashboard).

* **Tier 4: Unit Pastor**
    * **Access**: Read-Only view of their OWN unit.

## 3. File Map & Features

### **A. Admin Portal**
- **Layout**: `src/components/layout/AdminLayout.tsx` (Sidebar without "My Unit" toggle).
- **Dashboard**: `src/pages/admin/AdminDashboard.tsx` (Global Stats).

### **B. Evangelism Portal (New)**
- **Layout**: `src/components/layout/EvangelismLayout.tsx` (Pink/Rose Theme).
- **Overview**: `src/pages/evangelism/EvangelismOverview.tsx`
    - *Features*: Hero Stats, Weekly Velocity, Top Individual Winner, Unit Leaderboard.
- **Reports**: `src/pages/evangelism/EvangelismReports.tsx`
    - *Features*: Master Table of all souls, Month/Unit Filters.

### **C. Unit Dashboard (Core Modules)**
All modules are now **Online-First** and Role-Aware.

1.  **Members**: `src/pages/dashboard/Members.tsx`
2.  **Attendance**:
    -   Page: `src/pages/dashboard/Attendance.tsx`
    -   Table: `attendance` (RLS: Unit Only)
3.  **Finances (Dual Mode)**: `src/pages/dashboard/Finance.tsx`
    -   *Logic*: Checks `if (isAdmin)` to toggle between "Global Requests" and "Unit Ledger".
    -   *Modals*: `CreateRequestModal.tsx` (Budget), `Finance.tsx` (Ledger - Unit Head Only).
    -   *Tables*: `finances`, `financial_requests`.
4.  **Inventory (Dual Mode)**: `src/pages/dashboard/Inventory.tsx`
    -   *Logic*: Admins see all items; Unit Heads see unit items.
    -   *Table*: `inventory` (Foreign Key to `units`).
5.  **Souls (Refactored Jan 21)**: `src/pages/dashboard/Souls.tsx`
    -   *Data Model*: **1 Row = 1 Soul**. (Removed bulk counting).
    -   *Modal*: `AddSoulReportModal.tsx` (Captures Name, Phone, Notes).
    -   *Table*: `soul_reports`.
6.  **Performance**: `src/pages/dashboard/Performance.tsx`
    -   *Table*: `performance_reviews` (Linked to `members`).
7.  **Settings**: `src/pages/dashboard/Settings.tsx`
    -   *Features*: Profile updates, Password reset.

## 4. Database Schema & Rules
-   **Circuit Breakers**: `is_admin()` and `is_evangelist()` functions (SECURITY DEFINER) used in RLS policies to prevent infinite loops.
-   **Soul Reports Table**:
    -   `convert_name`: Stores single name.
    -   `convert_phone`: Stores contact.
    -   `soul_winner_name`: Text backup if member ID is missing.
    -   `count`: Defaults to 1.
-   **Foreign Keys**: Explicit links established:
    -   `financial_requests.unit_id` -> `units.id`
    -   `financial_requests.requester_id` -> `profiles.id`
    -   `inventory.unit_id` -> `units.id`

## 5. Upcoming Tasks
-   **SMR Dashboard**: Build the Statistical Management Report dashboard (Next Session).