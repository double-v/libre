import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Inscription gratuite sur Libre. Rencontre libre, sans abonnement ni engagement.',
  alternates: { canonical: 'https://libre.rencontres.app/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}