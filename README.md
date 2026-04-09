# CLC Ops Platform

A centralized ministry operations management system for **Citizens of Light Church (CLC)**. Built to streamline administration, accountability, and pastoral oversight across all church units.

---

## Overview

The CLC Ops Platform is a role-based web application that gives church leadership at every level — from unit heads to senior pastors — the tools they need to manage their ministries effectively. It features real-time notifications, financial request workflows, attendance tracking, evangelism reporting, and executive analytics dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite (rolldown) |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| State Management | TanStack React Query |
| Routing | React Router DOM v7 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Toast Notifications | Sonner |
| CSV Export | PapaParse |
| Deployment | Vercel |
| PWA | vite-plugin-pwa |

---

## Role-Based Access Control

The platform uses a **5-tier permission system** enforced at both the UI and database (RLS) levels:

| Tier | Role | Portal | Theme |
|---|---|---|---|
| 0 | Set Man Representative (SMR) | `/smr` | Gold |
| 1 | Admin Pastor | `/admin` | Dark |
| 2 | Evangelism Oversight | `/evangelism` | Pink |
| 3 | Unit Head / Assistant Unit Head | `/dashboard` | Light |
| 4 | Pastor-in-Charge (PIC) | `/dashboard` | Indigo (Approval Mode) |

> Database-level access is enforced via Supabase RLS policies. Senior leadership bypasses restrictions via `is_smr()` and `is_executive()` circuit-breaker functions.

---

## Key Modules

- **Members** — Workforce registry with NYSC status, employment info, and assistant roles
- **Attendance** — Session-based attendance logging per church unit
- **Finance** — Request submission and approval workflow with urgent tagging, soft deletes, and SMR acknowledgement
- **Inventory** — Unit-level inventory management (add/edit restricted to Unit Heads)
- **Performance** — Staff performance reviews with a modal-based scoring system
- **Souls** — Evangelism and soul-winning report tracking
- **Announcements** — Church-wide announcements (create/delete: SMR only)
- **Notifications** — Real-time alerts via Supabase Realtime for announcements, requests, and approvals
- **SMR Dashboard** — Executive analytics with bar charts, red flag watchlist, and absence reports
- **SMR Reports** — Printable and exportable leadership reports

---

## Architecture

- **Database**: Supabase (PostgreSQL) is the single source of truth — no local/offline database
- **Security**: Tiered RLS policies check `public.profiles` (not user_metadata) for role verification
- **Realtime**: Live updates enabled for `announcements`, `notifications`, and `financial_requests` tables
- **Custom Hooks**:
  - `useSMRStats.ts` — Central engine for executive-level analytics using decoupled fetching
  - `useDashboardStats.ts` — Aggregates unit-level attendance and performance metrics
  - `useProfile.ts` — Auth session and user profile management
- **Changelog**: `ChangelogModal.tsx` uses localStorage to surface "What's New" release notes to users

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required schema and RLS policies configured

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Deployment

The app is deployed to **Vercel**. The `vercel.json` config handles SPA routing redirects. Push to the `main` branch to trigger an automatic deployment.

---

## Roadmap

- [x] Phase 1: Core module development (Members, Finance, Attendance, Inventory)
- [x] Phase 2: Mobile UI overhaul & UX polish
- [x] Phase 3: Vercel deployment & production security hardening
- [x] Phase 3.5: Urgent tags, assistant head roles, finance acknowledgements, soft deletes, scrollable changelogs
- [ ] Phase 4: Super Admin User Management (requires Supabase Edge Functions)
