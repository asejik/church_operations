import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { Background } from './Background';
import { Outlet, Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, ShieldCheck } from 'lucide-react';
import { ChangelogModal } from '@/components/ui/ChangelogModal';

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

  // Auth Guard: redirect to login if unauthenticated or profile fetch failed
  if (isError || (!isLoading && !profile)) {
    return <Navigate to="/login" replace />;
  }

  const isUnitPastor = profile?.role === 'unit_pastor';
  const themeClasses = isUnitPastor ? "bg-indigo-50/30" : "bg-slate-50/50";

  return (
    <div className={`relative min-h-screen ${themeClasses}`}>
      <Background />

      {/* --- DESKTOP SIDEBAR --- */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col">
         <Sidebar />
      </div>

      {/* --- MOBILE DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar with Close Prop */}
          <div className="relative flex w-72 flex-1 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
             <Sidebar onMobileClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex flex-col min-h-screen md:pl-64 transition-all duration-300 pb-20 md:pb-0">

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 w-full bg-slate-50/80 backdrop-blur-md">
           <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

           {/* Unit Pastor Banner */}
           {isUnitPastor && (
            <div className="bg-indigo-600 text-white px-4 py-2 shadow-md flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Pastor-in-Charge (Approval Mode)</span>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="flex-1 px-4 py-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <MobileBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />
      <ChangelogModal />
    </div>
  );
};