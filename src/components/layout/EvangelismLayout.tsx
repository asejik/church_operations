import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from './NotificationBell';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Heart,
  LogOut,
  Menu,
  X,
  Target,
  Megaphone,
  Settings,
  Lock,
  User,
  ChevronDown
} from 'lucide-react';

// --- SUB-COMPONENT: EVANGELIST PROFILE MODAL ---
const EvangelistProfileModal = ({ isOpen, onClose, profile, onUpdate }: { isOpen: boolean; onClose: () => void; profile: any; onUpdate: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  const handleUpdateName = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id);
      if (error) throw error;
      toast.success("Name updated successfully");
      onUpdate();
    } catch (err: any) {
      toast.error("Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswords({ new: '', confirm: '' });
    } catch (err: any) {
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Settings">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase">Personal Details</h3>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
            <input className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-500" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Evangelist Chuks" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleUpdateName} isLoading={loading} className="bg-pink-600 hover:bg-pink-700">Save Name</Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Lock className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase">Security</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-500" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="••••••" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-500" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="••••••" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleUpdatePassword} isLoading={loading} className="bg-pink-600 hover:bg-pink-700">Update Password</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const EvangelismLayout = () => {
  const { data: profile, isLoading, refetch } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth Guard: redirect unauthenticated users to login
  // Note: full role check deferred until evangelism role name is confirmed in DB
  if (!isLoading && !profile) {
    return <Navigate to="/login" replace />;
  }

  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Overview', path: '/evangelism', icon: LayoutDashboard },
    { label: 'Announcements', path: '/evangelism/announcements', icon: Megaphone },
    { label: 'All Soul Reports', path: '/evangelism/reports', icon: Heart },
  ];

  const currentNav = navItems.find(item => location.pathname === item.path) || navItems[0];

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

        {/* User Profile Snippet (Bottom Sidebar) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.[0] || 'E'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-pink-400 truncate">Evangelism Pastor</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-30 px-4 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-pink-500 flex items-center gap-2">
           <Target className="h-5 w-5" /> Soul Center
        </span>
        <div className="flex items-center gap-3">
           <NotificationBell />
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
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
          <div className="border-t border-slate-800 pt-4 mt-4">
             <div className="flex items-center gap-3 px-4 mb-4" onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}>
                <div className="h-10 w-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
                  {profile?.full_name?.[0] || 'E'}
                </div>
                <div>
                  <p className="text-white font-bold">{profile?.full_name}</p>
                  <p className="text-xs text-pink-400">Tap to edit profile</p>
                </div>
             </div>
             <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-4 w-full text-red-400">
               <LogOut className="h-5 w-5" /> Sign Out
             </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all">

        {/* --- DESKTOP HEADER --- */}
        <header className="sticky top-0 z-10 hidden md:flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
           <div className="flex items-center gap-2 text-slate-500">
              <Link to="/evangelism" className="hover:text-pink-600 transition-colors">Portal</Link>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">{currentNav.label}</span>
           </div>

           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-100 uppercase tracking-wide">
                  Soul Center
                </span>
                <NotificationBell />
              </div>

              <div className="h-6 w-px bg-slate-200"></div>

              {/* USER PROFILE DROPDOWN */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {profile?.full_name?.[0] || 'E'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">{profile?.full_name}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 animation-fade-in">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">Evangelism Pastor</p>
                    </div>
                    <button
                      onClick={() => { setIsProfileModalOpen(true); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-400" /> Account Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8 pt-20 md:pt-8 w-full max-w-7xl mx-auto flex-1">
           <Outlet />
        </div>
      </main>

      <EvangelistProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onUpdate={refetch}
      />
    </div>
  );
};