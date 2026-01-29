import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from './NotificationBell'; // <--- IMPORT THIS
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
  User
} from 'lucide-react';

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
    if (passwords.new.length < 6) {
      toast.error("Password must be at least 6 characters");
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
            <input className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Pastor Ibk Faleye" />
            <p className="text-[10px] text-slate-400 mt-1">* This name will appear on the Executive Dashboard.</p>
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
  const { data: profile, refetch } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Executive Overview', path: '/smr', icon: LayoutDashboard },
    { label: 'Announcements', path: '/smr/announcements', icon: Megaphone },
    { label: 'Statistical Reports', path: '/smr/reports', icon: PieChart },
    { label: 'Members', path: '/smr/members', icon: Users },
    { label: 'Global Finances', path: '/smr/finance', icon: Wallet },
    { label: 'Soul Center', path: '/smr/souls', icon: Heart },
    { label: 'Attendance', path: '/smr/attendance', icon: Users },
    { label: 'Inventory', path: '/smr/inventory', icon: Package },
    { label: 'Performance', path: '/smr/performance', icon: BarChart3 },
  ];

  // Helper to get current page title
  const currentNav = navItems.find(item => location.pathname === item.path) || navItems[0];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white fixed h-full shadow-xl z-20 border-r border-amber-900/30">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" fill="currentColor" />
            SMR Portal
          </h1>
          <p className="text-[10px] text-amber-200/60 mt-1 uppercase tracking-widest">Executive Oversight</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 custom-scrollbar overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/smr' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-900/20 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold border-2 border-slate-800 shadow-md shrink-0">
              {profile?.full_name?.[0] || 'S'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate" title={profile?.full_name}>
                {profile?.full_name || 'SMR User'}
              </p>
              <p className="text-xs text-amber-400 truncate">Set Man Rep.</p>
            </div>
            <button onClick={() => setIsProfileModalOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors" title="Account Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full px-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-30 px-4 py-3 flex justify-between items-center shadow-md border-b border-amber-900/50">
        <span className="font-bold text-amber-400 flex items-center gap-2">
           <Crown className="h-5 w-5" fill="currentColor" /> SMR Portal
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
        <div className="fixed inset-0 bg-slate-900 z-20 pt-16 px-4 space-y-4 md:hidden overflow-y-auto">
          {navItems.map((item) => (
             <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-800 text-white border border-slate-700"
              >
                <item.icon className="h-5 w-5 text-amber-400" />
                {item.label}
              </Link>
          ))}
          <div className="border-t border-slate-800 pt-4 mt-4">
             <div className="flex items-center gap-3 px-4 mb-4" onClick={() => setIsProfileModalOpen(true)}>
                <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                  {profile?.full_name?.[0] || 'S'}
                </div>
                <div>
                  <p className="text-white font-bold">{profile?.full_name}</p>
                  <p className="text-xs text-amber-400">Tap to edit profile</p>
                </div>
             </div>
             <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-4 w-full text-red-400">
               <LogOut className="h-5 w-5" /> Sign Out
             </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all">

        {/* --- DESKTOP HEADER (New!) --- */}
        <header className="sticky top-0 z-10 hidden md:flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
           <div className="flex items-center gap-2 text-slate-500">
              <Link to="/smr" className="hover:text-amber-600 transition-colors">Portal</Link>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">{currentNav.label}</span>
           </div>

           <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-wide">
                Executive Access
              </span>
              <div className="h-6 w-px bg-slate-200"></div>
              {/* Notification Bell (Desktop) */}
              <NotificationBell />
           </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8 pt-20 md:pt-8 w-full max-w-7xl mx-auto flex-1">
           <Outlet />
        </div>
      </main>

      {/* MODALS */}
      <SMRProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onUpdate={refetch}
      />
    </div>
  );
};