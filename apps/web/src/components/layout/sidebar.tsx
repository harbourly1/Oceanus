'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useCurrentUser } from '@/hooks/use-auth';
import {
  LayoutDashboard, Inbox, Users, Receipt, Shuffle,
  Clock, CheckCircle, TrendingUp,
  ClipboardList, RefreshCw, ScrollText, UserCog, Settings,
  Package, Building2, Database,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const userRole = user?.role || '';
  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(userRole));

  return (
    <nav className="w-56 flex-shrink-0 p-3 space-y-1 overflow-y-auto"
      style={{ borderRight: '1px solid var(--color-border-default)', background: 'var(--color-bg-secondary)' }}>
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            )}
            style={{
              background: active ? 'var(--color-bg-card)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const SALES_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/sales', icon: <LayoutDashboard size={16} /> },
  { label: 'Leads & Tasks', href: '/sales/leads', icon: <Inbox size={16} /> },
  { label: 'Customers', href: '/sales/customers', icon: <Users size={16} /> },
  { label: 'Invoices', href: '/sales/invoices', icon: <Receipt size={16} /> },
  { label: 'Allocation', href: '/sales/allocation', icon: <Shuffle size={16} />, roles: ['SALES_ADMIN', 'ADMIN'] },
  { label: 'Reports', href: '/sales/reports', icon: <TrendingUp size={16} />, roles: ['SALES_ADMIN', 'ADMIN'] },
];

export const ACCOUNTS_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/accounts', icon: <LayoutDashboard size={16} /> },
  { label: 'Approval Queue', href: '/accounts/approval', icon: <Clock size={16} /> },
  { label: 'Cancellation Queue', href: '/accounts/completion', icon: <CheckCircle size={16} /> },
  { label: 'All Invoices', href: '/accounts/invoices', icon: <Receipt size={16} /> },
  { label: 'Reports', href: '/accounts/reports', icon: <TrendingUp size={16} /> },
];

export const UW_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/underwriting', icon: <LayoutDashboard size={16} /> },
  { label: 'Queue', href: '/underwriting/queue', icon: <ClipboardList size={16} /> },
  { label: 'In Progress', href: '/underwriting/in-progress', icon: <RefreshCw size={16} /> },
  { label: 'Policies', href: '/underwriting/policies', icon: <ScrollText size={16} /> },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={16} /> },
  { label: 'Users', href: '/admin/users', icon: <UserCog size={16} /> },
  { label: 'Products', href: '/admin/products', icon: <Package size={16} /> },
  { label: 'Insurers', href: '/admin/insurers', icon: <Building2 size={16} /> },
  { label: 'Reference Data', href: '/admin/reference-data', icon: <Database size={16} /> },
  { label: 'Activity Logs', href: '/admin/activity', icon: <ScrollText size={16} /> },
  { label: 'Team Mapping', href: '/admin/team-mapping', icon: <Users size={16} /> },
  { label: 'Allocation', href: '/admin/allocation', icon: <Shuffle size={16} /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
];
