import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Se connecter',
  description: 'Connexion à Libre, l\'application de rencontre gratuite.',
  alternates: { canonical: 'https://libre.rencontres.app/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}