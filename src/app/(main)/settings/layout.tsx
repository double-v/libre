import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paramètres',
  description: 'Paramètres de votre compte Libre. Mode invisible, badge vérifié, suppression de compte.',
  alternates: { canonical: 'https://libre.rencontres.app/settings' },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}