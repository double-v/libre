import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon profil',
  description: 'Gérez votre profil Libre. Préférences libres, rencontre alternative.',
  alternates: { canonical: '/profile' },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}