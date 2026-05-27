'use client';

import Link from 'next/link';

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Decouvrir</h1>

      <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
        Croisez quelqu&apos;un ? Likez. Si c&apos;est mutuel, le chat s&apos;ouvre.
      </p>

      <div className="space-y-4">
        <Link
          href="/crossings"
          className="block rounded-xl border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Croisements</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personnes croisees recemment a proximite
          </p>
        </Link>

        <Link
          href="/nearby"
          className="block rounded-xl border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">A proximite</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personnes actuellement proches de vous
          </p>
        </Link>
      </div>
    </div>
  );
}