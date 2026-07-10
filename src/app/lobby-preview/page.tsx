import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeLobby from '@/components/home-lobby/HomeLobby';

/**
 * Route de preview de la refonte home « lobby » (épic #243). Permet de revoir
 * chaque sous-ticket (#244 → #249) avant le cutover (#250) qui branchera le
 * lobby sur `/`. **Non indexée**, et **404 en production** — visible seulement en
 * dev local et sur les déploiements de preview Vercel. Supprimée au cutover.
 */
export const metadata: Metadata = {
  title: 'Preview — Home lobby',
  robots: { index: false, follow: false },
};

export default function LobbyPreviewPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <HomeLobby />;
}
