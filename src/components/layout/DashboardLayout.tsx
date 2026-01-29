import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header'; // <--- Import the new Header
import { Background } from './Background';
import { Outlet } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

export const DashboardLayout = () => {
  const { isLoading, isError } = useProfile();
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

  // Error State (e.g., if user was deleted or network fail)
  if (isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <p className="text-red-500">Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50">
      <Background />

      {/* Sidebar (Desktop) */}
      {/* Note: If your Sidebar supports mobile props, pass isMobileMenuOpen here */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block fixed inset-y-0 left-0 z-40 md:relative`}>
         <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="md:pl-64 transition-all duration-300 flex flex-col min-h-screen">

        {/* --- GLOBAL HEADER --- */}
        <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay (Closes menu when clicking outside) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};