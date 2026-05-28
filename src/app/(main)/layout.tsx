'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const MatchDialog = dynamic(() => import('@/components/MatchDialog'), { ssr: false });

const navItems = [
  { href: '/discover', label: 'Découvrir' },
  { href: '/crossings', label: 'Croisements' },
  { href: '/nearby', label: 'À proximité' },
  { href: '/matches', label: 'Matches' },
  { href: '/profile', label: 'Profil' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu';

  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" role="main" className="flex-1 pb-16">{children}</main>

      <nav role="navigation" aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-coral dark:text-coral-light'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-coral bg-coral dark:border-coral-light dark:bg-coral-light'
                      : 'border-gray-400 dark:border-gray-600'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {session?.user?.id && pusherKey && (
        <MatchDialog
          userId={session.user.id}
          pusherKey={pusherKey}
          pusherCluster={pusherCluster}
        />
      )}
    </div>
  );
}