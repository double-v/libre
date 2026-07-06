import Link from 'next/link';
import Logo from '@/components/Logo';

/**
 * Public marketing header for the home (and future marketing pages like
 * /about, /press, etc.). Server Component by default — no auth, no client
 * state. Pure navigation.
 */
export default function PublicHeader() {
  return (
    <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
      <Logo />
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
