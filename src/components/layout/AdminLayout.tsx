import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Wallet,
  Package,
  LogOut,
  Menu,
  X,
  CircleUser,
  ArrowRight
} from 'lucide-react';

export const AdminLayout = () => {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Global Finances', path: '/admin/finance', icon: Wallet },
    { label: 'Global Inventory', path: '/admin/inventory', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Admin Portal
          </h1>
          {/* REMOVED: SMR Command Center text */}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {/* LINK TO UNIT DASHBOARD */}
          {/* Note: Kept commented out or removed based on previous step, but ensuring code cleanliness */}
        </nav>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-amber-500 truncate">Admin Pastor</p>
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
        <span className="font-bold text-amber-500">Admin Portal</span>
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
                <item.icon className="h-5 w-5 text-amber-500" />
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