import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Heart,
  LogOut,
  Menu,
  X,
  Target
} from 'lucide-react';

export const EvangelismLayout = () => {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/evangelism', icon: LayoutDashboard },
    { label: 'All Soul Reports', path: '/evangelism/reports', icon: Heart },
    // You can add "Cumulative Reports" page here later
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
            <Target className="h-6 w-6 text-pink-500" />
            Soul Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Evangelism Oversight</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/evangelism' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.[0] || 'E'}
            </div>
            <div className="flex-1 overflow-hidden">
              {/* Force the name to show if profile loads, otherwise fallback */}
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || 'Evangelist Chuks'}
              </p>
              {/* UPDATED TITLE */}
              <p className="text-xs text-pink-400 truncate">Evangelism Pastor</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-30 px-4 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-pink-500 flex items-center gap-2">
           <Target className="h-5 w-5" /> Soul Center
        </span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900 z-20 pt-16 px-4 space-y-4 md:hidden">
          {navItems.map((item) => (
             <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-800 text-white"
              >
                <item.icon className="h-5 w-5 text-pink-500" />
                {item.label}
              </Link>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-4 w-full text-red-400">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};