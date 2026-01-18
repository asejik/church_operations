import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/config/navigation';
import { useProfile } from '@/hooks/useProfile';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Sidebar = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!profile) return null;

  // Filter items based on role
  const filteredNav = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/20 bg-white/30 backdrop-blur-xl hidden md:flex flex-col z-50">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold text-slate-800">CLC Operations</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {filteredNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};