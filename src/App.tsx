import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/Login";
import { motion } from "framer-motion";
import { Toaster } from 'sonner';

// Layouts
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EvangelismLayout } from "@/components/layout/EvangelismLayout";

// Unit Dashboard Pages
import { MembersPage } from "@/pages/dashboard/Members";
import { AttendancePage } from "@/pages/dashboard/Attendance";
import { FinancePage } from "@/pages/dashboard/Finance";
import { InventoryPage } from "@/pages/dashboard/Inventory";
import { PerformancePage } from "@/pages/dashboard/Performance";
import { SoulsPage } from "@/pages/dashboard/Souls";
import { DashboardHome } from "@/pages/dashboard/Home";
import { SettingsPage } from "@/pages/dashboard/Settings";
import { AnnouncementsPage } from "@/pages/dashboard/Announcements";

// Admin Pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";

// Evangelism Pages
import { EvangelismOverview } from "@/pages/evangelism/EvangelismOverview";
import { EvangelismReports } from "@/pages/evangelism/EvangelismReports";

import { SMRLayout } from "@/components/layout/SMRLayout";
import { SMRDashboard } from "@/pages/smr/SMRDashboard";
import { SMRReports } from "@/pages/smr/SMRReports";

// Simple Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="space-y-6"
      >
        <div className="inline-block rounded-full bg-white/30 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md border border-white/20">
          Citizens of Light Church
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-7xl">
          Ministry <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Operations</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          A centralized platform for administration, accountability, and pastoral oversight.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="rounded-xl bg-slate-900 px-8 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Log In
          </button>
        </div>
      </motion.div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* UNIT DASHBOARD ROUTES (Unit Heads & Pastors) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="souls" element={<SoulsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
          </Route>

          {/* ADMIN PORTAL ROUTES (Pastor Queen) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="inventory" element={<InventoryPage />} />
          </Route>

          {/* EVANGELISM OVERSIGHT ROUTES */}
          <Route path="/evangelism" element={<EvangelismLayout />}>
            {/* 1. Overview Page (Stats only) */}
            <Route index element={<EvangelismOverview />} />

            {/* 2. Reports Page (Table only) */}
            <Route path="reports" element={<EvangelismReports />} />
          </Route>

          {/* SMR PORTAL ROUTES (Pastor IBK & Dami) */}
          <Route path="/smr" element={<SMRLayout />}>
            <Route index element={<SMRDashboard />} />
            <Route path="reports" element={<SMRReports />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="souls" element={<EvangelismOverview />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />

          </Route>

        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;