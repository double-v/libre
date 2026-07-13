import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { debugLog } from '@/lib/logger';
import Link from 'next/link';
import ThemeMenu from '@/components/ui/ThemeMenu';
import HeartMark from '@/components/ui/HeartMark';

const adminNavItems = [
  { href: '/admin', label: 'Tableau de bord', icon: 'dashboard' },
  { href: '/admin/users', label: 'Utilisateurs', icon: 'users' },
  { href: '/admin/reports', label: 'Signalements', icon: 'reports' },
  { href: '/admin/circle/alerts', label: 'Alertes Cercle', icon: 'alert' },
  { href: '/admin/verifications', label: 'Vérifications', icon: 'verifications' },
  { href: '/admin/appearance', label: 'Apparence', icon: 'palette' },
  { href: '/admin/logs', label: 'Logs', icon: 'logs' },
  { href: '/admin/square', label: 'La Place', icon: 'square' },
  { href: '/admin/rate-limits', label: 'Rate-limits', icon: 'gauge' },
];

function SidebarIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'dashboard':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'users':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case 'reports':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'alert':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case 'palette':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
    case 'verifications':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case 'logs':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'square':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case 'gauge':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1117.32 0"/></svg>;
    default:
      return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ---------------------------------------------------------------------------
  // FIX: getServerSession(authOptions) is unreliable in App Router layouts.
  // We decode the JWT cookie directly via next-auth/jwt/decode — no req object
  // needed, just the raw token string + secret. This works in ANY server context.
  // ---------------------------------------------------------------------------
  const cookieStore = await cookies();

  // Try secure cookie name first (HTTPS), fallback to plain name (HTTP)
  const cookieName = '__Secure-next-auth.session-token';
  const fallbackName = 'next-auth.session-token';
  const tokenCookie = cookieStore.get(cookieName) ?? cookieStore.get(fallbackName);

  if (!tokenCookie) {
    debugLog('[admin/layout] ACCESS DENIED → 404 (no JWT cookie)');
    notFound();
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    console.error('[admin/layout] NEXTAUTH_SECRET is not set');
    notFound();
  }

  let token: { sub?: string; role?: string } | null = null;
  try {
    token = await decode({ token: tokenCookie.value, secret });
  } catch (err) {
    console.error('[admin/layout] JWT decode error:', err);
    token = null;
  }

  debugLog('[admin/layout] hasToken=%s hasSub=%s jwtRole=%s',
    !!token, !!token?.sub, token?.role ?? 'none');

  if (!token?.sub) {
    debugLog('[admin/layout] ACCESS DENIED → 404 (JWT has no subject)');
    notFound();
  }

  const userId = token.sub;
  const jwtRole = token.role?.toUpperCase();

  // Check DB directly — JWT may be stale, role changes must propagate instantly
  let dbRole: string | undefined;
  try {
    const dbUser = await getDb().user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    dbRole = dbUser?.role?.toUpperCase();
  } catch (err) {
    console.error('[admin/layout] DB error, falling back to JWT role:', err);
    dbRole = jwtRole;
  }

  debugLog('[admin/layout] hasDbRole=%s dbMatchesJwt=%s', !!dbRole, dbRole === jwtRole);

  if (dbRole !== 'ADMIN') {
    debugLog('[admin/layout] ACCESS DENIED → showing forbidden page');
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Accès refusé</h1>
          <p className="mt-4 text-lg text-content">
            Rôle requis : <strong>ADMIN</strong>
          </p>
          <p className="mt-2 text-muted">
            Votre rôle actuel : <code className="rounded bg-fill-subtle px-2 py-1">{dbRole || 'non défini'}</code>
          </p>
          <Link
            href="/discover"
            className="mt-6 inline-block rounded-lg bg-coral px-6 py-3 text-white hover:bg-coral-dark"
          >
            Retour à l&apos;application
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-hairline bg-fill-subtle md:block">
        <div className="flex items-center justify-between gap-2 p-4">
          {/* Marque avec le logo cœur de référence (#294) ; l'admin garde son
              ThemeMenu (pas de nav app / Paramètres dans cette zone power). */}
          <Link href="/admin" className="inline-flex items-center gap-2 text-lg font-bold text-coral dark:text-coral-light">
            <HeartMark className="h-6 w-6" />
            Libre Admin
          </Link>
          <ThemeMenu />
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-2">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-fill-subtle hover:text-content"
            >
              <SidebarIcon icon={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-hairline p-4">
          <Link href="/discover" className="text-sm text-muted hover:text-content">
            ← Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="border-b border-hairline bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin" className="inline-flex items-center gap-2 text-lg font-bold text-coral dark:text-coral-light">
              <HeartMark className="h-6 w-6" />
              Libre Admin
            </Link>
            <div className="flex items-center gap-2">
              <ThemeMenu />
              <Link href="/discover" className="text-sm text-muted">
                Retour
              </Link>
            </div>
          </div>
          <nav className="mt-2 flex gap-2 overflow-x-auto">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle"
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