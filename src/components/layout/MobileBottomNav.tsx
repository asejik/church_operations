import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, Users, LayoutGrid, Calendar } from 'lucide-react';

export const MobileBottomNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard', exact: true },
    { label: 'Finance', icon: Wallet, path: '/dashboard/finance', exact: false },
    { label: 'Members', icon: Users, path: '/dashboard/members', exact: false },
    { label: 'Attend', icon: Calendar, path: '/dashboard/attendance', exact: false }, // Added
  ];

  const isActive = (itemPath: string, exact: boolean) => {
    return exact ? path === itemPath : path.startsWith(itemPath);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 w-full py-1 rounded-lg transition-colors ${
              isActive(item.path, item.exact) ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive(item.path, item.exact) ? 'fill-current' : ''}`} strokeWidth={2} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        ))}

        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 w-full py-1 text-slate-400"
        >
          <LayoutGrid className="h-5 w-5" strokeWidth={2} />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </div>
  );
};