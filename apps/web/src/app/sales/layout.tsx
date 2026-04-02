'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-auth';
import { TopBar } from '@/components/layout/top-bar';
import { Sidebar, SALES_NAV } from '@/components/layout/sidebar';
import { LoadingState } from '@/components/ui/states';

const ALLOWED_ROLES = ['SALES_EXEC', 'SALES_ADMIN', 'ADMIN'];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();

  if (!user) return <LoadingState message="Loading..." />;

  if (!ALLOWED_ROLES.includes(user.role)) {
    router.replace('/login');
    return <LoadingState message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={SALES_NAV} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
