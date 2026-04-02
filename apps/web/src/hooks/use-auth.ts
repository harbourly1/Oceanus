'use client';

import { useSession } from 'next-auth/react';

export function useToken(): string {
  const { data: session } = useSession();
  return (session?.user as any)?.accessToken || '';
}

export function useCurrentUser() {
  const { data: session } = useSession();
  const user = session?.user as any;
  return user
    ? {
        id: user.id as string,
        name: user.name as string,
        email: user.email as string,
        role: user.role as string,
        department: user.department as string,
      }
    : null;
}
