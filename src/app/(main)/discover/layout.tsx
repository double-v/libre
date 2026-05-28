import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Découvrir',
  description: 'Découvrez des célibataires près de chez vous. Croisements et proximité sur Libre.',
  alternates: { canonical: '/discover' },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}