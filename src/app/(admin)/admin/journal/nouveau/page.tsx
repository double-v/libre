'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import JournalEditeur from '@/components/admin/JournalEditeur';

/** Nouvelle publication du journal (spec 007, US2). */
export default function NouvellePublicationPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/journal" className="mb-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-content">← Journal</Link>
      <h1 className="mb-4 text-2xl font-bold text-content">Nouvelle publication</h1>
      <JournalEditeur onCree={(id) => router.replace(`/admin/journal/${id}`)} />
    </div>
  );
}
