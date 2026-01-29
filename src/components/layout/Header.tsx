import { NotificationBell } from './NotificationBell';
import { useProfile } from '@/hooks/useProfile';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { data: profile } = useProfile();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md transition-all sm:px-6 lg:px-8 print:hidden">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button (Wire this up to your Sidebar if needed) */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operations Portal</span>
          <h1 className="text-sm font-bold text-slate-900 sm:text-base">Citizens of Light Church</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
         {/* User Info (Desktop Only) */}
         <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{profile?.full_name}</p>
            <p className="text-[10px] font-medium text-slate-500 uppercase mt-1">{profile?.role?.replace(/_/g, ' ')}</p>
         </div>

         <div className="hidden h-8 w-px bg-slate-200 md:block"></div>

         {/* --- GLOBAL NOTIFICATION CENTER --- */}
         <NotificationBell />
      </div>
    </header>
  );
};