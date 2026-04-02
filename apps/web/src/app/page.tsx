import { getSession, getDefaultPortal, getUserRole } from '@/lib/session';
import { redirect } from 'next/navigation';
import { MarineInsuranceLanding } from '@/components/landing';

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) {
    const role = getUserRole(session);
    redirect(getDefaultPortal(role));
  }
  return <MarineInsuranceLanding />;
}
