import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Wallet,
  Box,
  Star,
  Heart,
  Settings,
  Megaphone // <--- Import Megaphone icon
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[]; // Who can see this?
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['smr', 'admin_pastor', 'unit_pastor', 'unit_head', 'evangelist'],
  },
  {
    label: 'Announcements',
    href: '/dashboard/announcements',
    icon: Megaphone,
    roles: ['unit_head', 'unit_pastor', 'admin_pastor', 'smr'], // Visible to all leadership
  },
  {
    label: 'Members',
    href: '/dashboard/members',
    icon: Users,
    roles: ['unit_head', 'unit_pastor', 'smr'],
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: ClipboardCheck,
    roles: ['unit_head', 'unit_pastor', 'smr'],
  },
  {
    label: 'Finances',
    href: '/dashboard/finance',
    icon: Wallet,
    roles: ['unit_head', 'unit_pastor', 'admin_pastor', 'smr'],
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: Box,
    roles: ['unit_head', 'unit_pastor', 'admin_pastor', 'smr'],
  },
  {
    label: 'Performance',
    href: '/dashboard/performance',
    icon: Star,
    roles: ['unit_head', 'unit_pastor', 'smr'],
  },
  {
    label: 'Souls Won',
    href: '/dashboard/souls',
    icon: Heart,
    roles: ['unit_head', 'unit_pastor', 'evangelist', 'smr'],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['smr', 'admin_pastor', 'unit_pastor', 'unit_head', 'evangelist'],
  },
];