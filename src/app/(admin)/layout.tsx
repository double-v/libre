import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { debugLog } from '@/lib/logger';
import { estAdminEnBase } from '@/lib/admin-role';
import Link from 'next/link';
import ThemeMenu from '@/components/ui/ThemeMenu';
import HeartMark from '@/components/ui/HeartMark';
import AdminNav from '@/components/admin/AdminNav';
import ToastHost from '@/components/ui/Toast';
import { countAdminQueues } from '@/lib/admin-queues';
import { compterCas } from '@/lib/moderation/membres';

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

  let token: { sub?: string } | null = null;
  try {
    token = await decode({ token: tokenCookie.value, secret });
  } catch (err) {
    console.error('[admin/layout] JWT decode error:', err);
    token = null;
  }

  debugLog('[admin/layout] hasToken=%s hasSub=%s', !!token, !!token?.sub);

  if (!token?.sub) {
    debugLog('[admin/layout] ACCESS DENIED → 404 (JWT has no subject)');
    notFound();
  }

  // Rôle relu en base (le JWT peut être périmé, #155), garde fermée : base
  // injoignable, rétrogradé ou rôle absent → 404, comme `requireAdmin` côté
  // API. Jamais de repli sur le rôle du jeton (#547), et jamais de page
  // « Accès refusé » qui confirmerait l'existence de la zone admin.
  if (!(await estAdminEnBase(token.sub, 'admin/layout'))) {
    debugLog('[admin/layout] REFUS → 404 (pas admin en base, ou base injoignable)');
    notFound();
  }

  // Files de travail (R7) : comptées ici, en serveur, sans HTTP. Un échec de
  // comptage ne ferme pas l'administration (`countAdminQueues` le confine à sa file).
  const queues = await countAdminQueues(getDb(), compterCas);

  return (
    // La coque tient dans la fenêtre (#568) : l'en-tête et les onglets ne
    // défilent pas. Une page ordinaire défile dans `main` ; une page « plein
    // cadre » (le hub Membres) occupe toute la hauteur et fait défiler ses
    // propres zones. Un seul <main> : la page n'est montée qu'une fois.
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-hairline bg-surface pt-safe">
        <div className="flex min-h-[60px] items-center gap-3 px-4 min-[900px]:gap-4 min-[900px]:px-6">
          {/* Marque avec le logo cœur de référence (#294), sur une ligne. */}
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-control text-base font-bold text-coral focus-visible:outline-none focus-visible:shadow-focus dark:text-coral-light"
          >
            <HeartMark className="h-6 w-6" />
            Libre Admin
          </Link>
          <AdminNav variante="entete" atraiter={queues.atraiter} retours={queues.feedback} />
          <span className="flex-1" />
          {/* En fin d'en-tête : le panneau du ThemeMenu, ancré à droite, tient
              dans la fenêtre. Jamais dans une colonne collée au bord gauche. */}
          <ThemeMenu labelClassName="hidden min-[1280px]:inline" />
          <Link
            href="/discover"
            className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-control px-1.5 text-sm text-muted hover:text-content focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="hidden min-[1280px]:inline">← Retour à l&apos;app</span>
            <span className="min-[1280px]:hidden">Retour</span>
          </Link>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 has-[[data-plein-cadre]]:overflow-hidden has-[[data-plein-cadre]]:p-0 min-[900px]:p-6 min-[900px]:has-[[data-plein-cadre]]:p-0">
        {children}
      </main>
      <AdminNav variante="onglets" atraiter={queues.atraiter} retours={queues.feedback} />
      {/* Confirmations des gestes du hub Membres (spec 012). */}
      <ToastHost />
    </div>
  );
}
