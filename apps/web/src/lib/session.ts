import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getSession() {
  const session = await auth();
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export function getToken(session: any): string {
  return session?.user?.accessToken || '';
}

export function getUserRole(session: any): string {
  return session?.user?.role || '';
}

export function getDefaultPortal(role: string): string {
  switch (role) {
    case 'ACCOUNTS_MANAGER':
      return '/accounts';
    case 'UNDERWRITER':
      return '/underwriting';
    default:
      return '/sales';
  }
}
