import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from './NotificationBell';
import { SMRBottomNav } from './SMRBottomNav';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Crown,
  Wallet,
  Users,
  Heart,
  BarChart3,
  Package,
  PieChart,
  Settings,
  Megaphone,
  Lock,
  User,
  ChevronDown
} from 'lucide-react';
import { ChangelogModal } from '@/components/ui/ChangelogModal';

// --- SUB-COMPONENT: EDIT PROFILE & SECURITY ---
const SMRProfileModal = ({ isOpen, onClose, profile, onUpdate }: { isOpen: boolean; onClose: () => void; profile: any; onUpdate: () => void }) => {
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
    if (passwords.new.length < 12) {
      toast.error("Password must be at least 12 characters");
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
    <Modal isOpen={isOpen} onClose={onClose} title="Executive Account Settings">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase">Personal Details</h3>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
            <input className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Pastor IBK" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleUpdateName} isLoading={loading} className="bg-slate-900 hover:bg-slate-800">Save Name</Button>
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
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="••••••" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="••••••" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleUpdatePassword} isLoading={loading} className="bg-slate-900 hover:bg-slate-800">Update Password</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const SMRLayout = () => {
  const { data: profile, isLoading, refetch } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth + Role Guard
  if (!isLoading && (!profile || profile.role !== 'smr')) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    { label: 'Executive Dashboard', path: '/smr', icon: LayoutDashboard },
    { label: 'Reports', path: '/smr/reports', icon: PieChart },
    { label: 'Global Finances', path: '/smr/finance', icon: Wallet },
    { label: 'Soul Winning', path: '/smr/souls', icon: Heart },
    { label: 'Global Inventory', path: '/smr/inventory', icon: Package },
    { label: 'Global Attendance', path: '/smr/attendance', icon: Users },
    { label: 'Performance', path: '/smr/performance', icon: BarChart3 },
    { label: 'Global Workforce', path: '/smr/members', icon: Crown },
    { label: 'Announcements', path: '/smr/announcements', icon: Megaphone },
  ];

  const currentNav = navItems.find(item => location.pathname === item.path) || navItems[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white fixed h-full shadow-xl z-50">
        <div className="p-6 border-b border-slate-800 shrink-0">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            SMR Portal
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
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
        </nav>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.[0] || 'S'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate" title={profile?.full_name}>{profile?.full_name}</p>
              <p className="text-xs text-amber-500 truncate">Executive Access</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full px-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex w-72 flex-1 flex-col bg-slate-900 text-white shadow-2xl animate-in slide-in-from-left duration-200">
             <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
                <h1 className="text-lg font-bold text-amber-500">Menu</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
             </div>

             <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
               {navItems.map((item) => {
                 const isActive = location.pathname === item.path;
                 return (
                    <Link
                       key={item.path}
                       to={item.path}
                       onClick={() => setIsMobileMenuOpen(false)}
                       className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                         isActive ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                       }`}
                     >
                       <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-amber-500/70'}`} />
                       {item.label}
                     </Link>
                 )
               })}
             </nav>

             <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-3 mb-4" onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}>
                   <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold shrink-0">
                     {profile?.full_name?.[0] || 'S'}
                   </div>
                   <div className="overflow-hidden">
                     <p className="text-sm font-bold text-white truncate">{profile?.full_name}</p>
                     <p className="text-xs text-amber-400">Tap to edit profile</p>
                   </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full px-2">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col md:ml-64 relative h-full overflow-y-auto overflow-x-hidden">

        {/* --- BRANDED MOBILE HEADER (Sticky) --- */}
        <div className="md:hidden sticky top-0 z-30 w-full bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-slate-900 transition-colors">
               <Menu className="h-6 w-6" />
             </button>
             <div className="flex flex-col">
               <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-tight">SMR Portal</span>
               <span className="font-bold text-slate-900 text-sm leading-tight">Citizens of Light Church</span>
             </div>
          </div>
          <NotificationBell />
        </div>

        {/* --- DESKTOP HEADER (Sticky) --- */}
        <header className="hidden md:flex sticky top-0 z-10 h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
           <div className="flex items-center gap-2 text-slate-500">
              <span className="text-slate-400">Portal</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">{currentNav.label}</span>
           </div>

           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wide">
                  Executive Access
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
                  <div className="h-8 w-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {profile?.full_name?.[0] || 'S'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">{profile?.full_name}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 animation-fade-in">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">Set Man Representative</p>
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
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-7xl mx-auto">
           <Outlet />
        </div>

        {/* --- MOBILE BOTTOM NAV --- */}
        <SMRBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />

      </main>

      <SMRProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onUpdate={refetch}
      />
      <ChangelogModal />
    </div>
  );
};