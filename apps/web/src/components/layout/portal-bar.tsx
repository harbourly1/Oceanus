'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useCurrentUser } from '@/hooks/use-auth';
import { Briefcase, Wallet, ClipboardCheck, Settings } from 'lucide-react';

const PORTALS = [
  { id: 'sales', label: 'Sales', href: '/sales', icon: <Briefcase size={14} />, roles: ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'] },
  { id: 'accounts', label: 'Accounts', href: '/accounts', icon: <Wallet size={14} />, roles: ['ACCOUNTANT', 'ADMIN'] },
  { id: 'underwriting', label: 'Underwriting', href: '/underwriting', icon: <ClipboardCheck size={14} />, roles: ['UNDERWRITER', 'UW_MANAGER', 'ADMIN'] },
  { id: 'admin', label: 'Admin', href: '/admin', icon: <Settings size={14} />, roles: ['ADMIN'] },
];

export function PortalBar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const userRole = user?.role || '';
  const visiblePortals = PORTALS.filter((p) => p.roles.includes(userRole));
  const activePortal = visiblePortals.find((p) => pathname.startsWith(p.href))?.id;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
      {visiblePortals.map((portal) => (
        <Link
          key={portal.id}
          href={portal.href}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          )}
          style={{
            background: activePortal === portal.id ? 'var(--color-bg-card)' : 'transparent',
            color: activePortal === portal.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {portal.icon}
          {portal.label}
        </Link>
      ))}
    </div>
  );
}
