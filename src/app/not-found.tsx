import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable',
  description: 'La page que vous cherchez n\'existe pas.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-4xl font-bold text-content">404</h1>
      <p className="mb-6 text-muted">Page introuvable</p>
      <Link href="/" className="text-coral underline hover:text-terracotta dark:text-coral-light dark:hover:text-coral">Retour à l’accueil</Link>
    </main>
  );
}