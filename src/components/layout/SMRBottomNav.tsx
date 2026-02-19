import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Heart, Users, Menu } from 'lucide-react';

export const SMRBottomNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const location = useLocation();
  const path = location.pathname;

  // 5 Items to match the Unit Dashboard density
  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/smr', exact: true },
    { label: 'Finance', icon: Wallet, path: '/smr/finance', exact: false },
    { label: 'Members', icon: Users, path: '/smr/members', exact: false },
    { label: 'Souls', icon: Heart, path: '/smr/souls', exact: false },
  ];

  const isActive = (itemPath: string, exact: boolean) => {
    return exact ? path === itemPath : path.startsWith(itemPath);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-2 z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center max-w-sm mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 w-full py-1 rounded-lg transition-colors ${
              isActive(item.path, item.exact) ? 'text-amber-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive(item.path, item.exact) ? 'fill-amber-500/20' : ''}`} strokeWidth={isActive(item.path, item.exact) ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        ))}

        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 w-full py-1 text-slate-400 hover:text-slate-300"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </div>
  );
};