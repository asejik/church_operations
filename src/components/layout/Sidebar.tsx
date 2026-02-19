import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/config/navigation';
import { useProfile } from '@/hooks/useProfile';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// Added prop interface
export const Sidebar = ({ onMobileClick }: { onMobileClick?: () => void }) => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!profile) return null;

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  return (
    <aside className="flex flex-col h-full w-full border-r border-slate-200 bg-white md:bg-white/80 md:backdrop-blur-xl">

      <div className="flex h-16 items-center px-6 border-b border-slate-100 shrink-0 bg-slate-50 md:bg-transparent">
        <span className="text-lg font-bold text-slate-800 tracking-tight">CLC Operations</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto custom-scrollbar">
        {filteredNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onMobileClick} // <--- CLOSE MENU ON CLICK
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-900 text-white shadow-md transform scale-[1.02]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

      <div className="border-t border-slate-100 p-4 shrink-0 bg-slate-50 md:bg-transparent">
        <div className="flex items-center gap-3 px-3 mb-4">
           <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
              {profile.full_name?.[0] || 'U'}
           </div>
           <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile.full_name}</p>
              <p className="text-[10px] text-slate-500 uppercase truncate">{profile.role.replace('_', ' ')}</p>
           </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};