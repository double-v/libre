import Link from 'next/link';

/**
 * Public marketing header for the home (and future marketing pages like
 * /about, /press, etc.). Server Component by default — no auth, no client
 * state. Pure navigation.
 */
export default function PublicHeader() {
  return (
    <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
      <Link href="/" aria-label="Accueil Libre" className="flex items-center gap-2">
        <svg viewBox="76 36 360 360" className="h-8 w-8" fill="currentColor" aria-hidden="true">
          <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-60 256 188)" />
          <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(-30 256 188)" />
          <rect x="236" y="42" width="40" height="120" rx="20" />
          <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(30 256 188)" />
          <rect x="236" y="42" width="40" height="120" rx="20" transform="rotate(60 256 188)" />
          <path d="M256,195 C256,170 218,130 180,130 C130,130 105,175 105,215 C105,300 256,375 256,390 C256,375 407,300 407,215 C407,175 382,130 332,130 C294,130 256,170 256,195 Z" />
        </svg>
        <span className="text-2xl font-bold tracking-tight text-coral">Libre</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/manifesto" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          Manifesto
        </Link>
        <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          Se connecter
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracotta"
        >
          Créer un compte
        </Link>
      </div>
    </nav>
  );
}
