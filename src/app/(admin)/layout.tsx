import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Link from 'next/link';

const adminNavItems = [
  { href: '/admin', label: 'Tableau de bord', icon: 'dashboard' },
  { href: '/admin/users', label: 'Utilisateurs', icon: 'users' },
  { href: '/admin/reports', label: 'Signalements', icon: 'reports' },
  { href: '/admin/verifications', label: 'Vérifications', icon: 'verifications' },
  { href: '/admin/logs', label: 'Logs', icon: 'logs' },
];

function SidebarIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'dashboard':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'users':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case 'reports':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'verifications':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case 'logs':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    default:
      return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  console.log('[admin/layout] session=%s userId=%s jwtRole=%s',
    !!session, session?.user?.id ?? 'none', session?.user?.role ?? 'none');

  if (!session?.user?.id) {
    console.log('[admin/layout] ACCESS DENIED → 404 (no session)');
    notFound();
  }

  // Check DB directly — JWT may be stale, role changes must propagate instantly
  let dbRole: string | undefined;
  try {
    const dbUser = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    dbRole = dbUser?.role?.toUpperCase();
  } catch (err) {
    console.error('[admin/layout] DB error, falling back to JWT role:', err);
    dbRole = session.user.role?.toUpperCase();
  }

  console.log('[admin/layout] userId=%s dbRole=%s jwtRole=%s',
    session.user.id, dbRole ?? 'none', session.user.role);

  if (dbRole !== 'ADMIN') {
    console.log('[admin/layout] ACCESS DENIED → 404 (dbRole=%s)', dbRole);
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 md:block">
        <div className="p-4">
          <Link href="/admin" className="text-lg font-bold text-coral dark:text-coral-light">
            Libre Admin
          </Link>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-2">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <SidebarIcon icon={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-gray-200 p-4 dark:border-gray-800">
          <Link href="/discover" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-lg font-bold text-coral dark:text-coral-light">
              Libre Admin
            </Link>
            <Link href="/discover" className="text-sm text-gray-500">
              Retour
            </Link>
          </div>
          <nav className="mt-2 flex gap-2 overflow-x-auto">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>

      {/* Desktop content */}
      <main className="hidden flex-1 overflow-y-auto p-6 md:block">{children}</main>
    </div>
  );
}