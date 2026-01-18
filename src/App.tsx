import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/Login";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MembersPage } from "@/pages/dashboard/Members";
import { Toaster } from 'sonner';
import { AttendancePage } from "@/pages/dashboard/Attendance";
import { FinancePage } from "@/pages/dashboard/Finance";
import { InventoryPage } from "@/pages/dashboard/Inventory";
import { PerformancePage } from "@/pages/dashboard/Performance";
import { SoulsPage } from "@/pages/dashboard/Souls";
import { DashboardHome } from "@/pages/dashboard/Home";
import { SettingsPage } from "@/pages/dashboard/Settings";

// ... inside Routes
<Route path="souls" element={<SoulsPage />} />

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* PROTECTED DASHBOARD ROUTES */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route index element={<div className="text-2xl font-bold text-slate-800">Welcome to your Dashboard</div>} />

            {/* FIXED: Removed the placeholder "Attendance Page" div that was here */}

            <Route path="finance" element={<FinancePage />} />
            <Route path="members" element={<MembersPage />} />

            {/* This is the correct component */}
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="souls" element={<SoulsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;