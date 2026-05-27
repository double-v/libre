import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'À proximité',
  description: 'Trouvez des célibataires proches de vous en temps réel sur Libre.',
  alternates: { canonical: 'https://libre.rencontres.app/nearby' },
};

export default function NearbyLayout({ children }: { children: React.ReactNode }) {
  return children;
}