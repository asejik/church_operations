import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Background } from './Background';
import { Outlet } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, ShieldCheck } from 'lucide-react';

export const DashboardLayout = () => {
  const { data: profile, isLoading, isError } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <p className="text-red-500">Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  // --- DISTINCT THEME FOR PASTOR-IN-CHARGE (UNIT PASTOR) ---
  const isUnitPastor = profile?.role === 'unit_pastor';

  // Apply a distinct background tint for Unit Pastors
  const themeClasses = isUnitPastor
    ? "bg-indigo-50/50" // Subtle Purple/Indigo tint
    : "bg-slate-50/50"; // Default Slate

  return (
    <div className={`relative min-h-screen ${themeClasses}`}>
      <Background />

      {/* Sidebar (Desktop) */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block fixed inset-y-0 left-0 z-40 md:relative`}>
         <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="md:pl-64 transition-all duration-300 flex flex-col min-h-screen">

        {/* --- GLOBAL HEADER --- */}
        <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        {/* --- UNIT PASTOR BANNER --- */}
        {isUnitPastor && (
          <div className="bg-indigo-600 text-white px-6 py-2 shadow-md flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider relative z-10">
            <ShieldCheck className="h-4 w-4" />
            <span>Pastor-in-Charge View (Approval Mode)</span>
          </div>
        )}

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};