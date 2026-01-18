import { Sidebar } from './Sidebar';
import { Background } from './Background';
import { Outlet } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

export const DashboardLayout = () => {
  const { isLoading, isError } = useProfile();

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
      <Sidebar />

      {/* Main Content Area */}
      <main className="md:pl-64 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};