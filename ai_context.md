# Project Status & Architecture Map
Last Updated: January 21, 2026 (SMR Portal Complete & Reports Engine Live)

## 1. Core Architecture: Online-First
- **Database**: Supabase (PostgreSQL) is the Single Source of Truth.
- **Client State**: React Query / Direct Fetching.
- **Security Strategy**: Tiered RLS with "Circuit Breaker" functions (`is_admin`, `is_evangelist`, `is_smr`).

## 2. Role-Based Access Control (RBAC)
We use a **Tiered Permission System** enforced by Database Policies:

* **Tier 0: Set Man Representative (SMR) - (e.g., Pastor IBK, Pastor Dami)**
    * **Access**: Universal Access (Finance, Souls, Inventory, Attendance, Members) across ALL units.
    * **UI**: `SMRLayout` (Gold Theme) -> `/smr`
    * **Mechanism**: `is_smr()` function bypasses all RLS restrictions.
    * **Logic**: Reuses Unit pages with `isGlobalViewer` logic to see dropdown selectors.

* **Tier 1: Admin Pastor (e.g., Pastor Queen)**
    * **Access**: Global view of Finances & Inventory. Also Global Attendance/Performance view.
    * **Restriction**: Cannot view Soul Reports of other units.
    * **UI**: `AdminLayout` (Dark Theme) -> `/admin`

* **Tier 2: Evangelism Oversight (e.g., Evangelist Chuks)**
    * **Access**: Global view of Soul Reports.
    * **UI**: `EvangelismLayout` (Pink Theme) -> `/evangelism`

* **Tier 3: Unit Head**
    * **Access**: Full CRUD for their OWN unit only.
    * **UI**: `DashboardLayout` (Light Theme) -> `/dashboard`

## 3. File Map & Features

### **A. SMR Portal (Completed Jan 21)**
- **Layout**: `src/components/layout/SMRLayout.tsx` (Gold/Amber Theme).
- **Dashboard**: `src/pages/smr/SMRDashboard.tsx` (Executive Summary).
- **Reports**: `src/pages/smr/SMRReports.tsx` (Statistical Reports Engine, Printable PDF).

### **B. Evangelism Portal**
- **Overview**: `src/pages/evangelism/EvangelismOverview.tsx` (Stats).
- **Reports**: `src/pages/evangelism/EvangelismReports.tsx` (Data Table).

### **C. Shared Modules (Role-Aware)**
These pages adapt based on `isGlobalViewer` check (`admin_pastor` OR `smr`):
1.  **Finances**: `src/pages/dashboard/Finance.tsx`
    -   *SMR/Admin*: Global Requests View.
    -   *Unit Head*: Unit Ledger View.
2.  **Inventory**: `src/pages/dashboard/Inventory.tsx`
    -   *SMR/Admin*: All Units.
    -   *Unit Head*: Own Unit.
3.  **Attendance**: `src/pages/dashboard/Attendance.tsx`
    -   *SMR/Admin*: Global View via Unit Selector.
    -   *Unit Head*: Own Unit (Mark Attendance).
4.  **Performance**: `src/pages/dashboard/Performance.tsx`
    -   *SMR/Admin*: Global View via Unit Selector.
    -   *Unit Head*: Own Unit (Add Reviews).
5.  **Souls**: `src/pages/dashboard/Souls.tsx` (Unit View).
    -   *Global View*: Handled by `EvangelismOverview` (Evangelist Chuks) or `SMRDashboard`.

## 4. Database Schema Updates
-   **Profiles**: `role` column now supports `'smr'`.
-   **Functions**: Added `is_smr()` for super-admin security policies.
-   **Policies**: Updated all core tables to allow `is_smr()` full access.

## 5. Deployment Notes
-   **Authentication**: `Login.tsx` redirects `smr` users to `/smr`.
-   **Routes**: `App.tsx` maps `/smr/*` paths.